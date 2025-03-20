import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import * as cornerstone from '@cornerstonejs/core';
import dicomService, { DicomImageId, DicomMetadata } from '../../services/dicomService';
import { DicomStudy, DicomSeries, DicomPatientSummary } from '../../types/medical';
import {
  ViewerContainer,
  ViewerGrid,
  ViewerPanel,
  Canvas,
  ViewerLabel,
  MainContainer,
  SidePanel,
  ListContainer,
  ListItem,
  ListTitle,
  SeriesItem,
  ToolbarContainer,
  ToolButton as ImportedToolButton,
  ControlsContainer,
  ImageControls,
  InfoPanel
} from './styles';
import { 
  RenderingEngine,
  Types,
  Enums,
  StackViewport
} from '@cornerstonejs/core';

// Importera nödvändiga verktyg direkt från csTools
import * as csTools from '@cornerstonejs/tools';
const { 
  ToolGroupManager,
  Enums: csToolsEnums,
  WindowLevelTool,
  ZoomTool,
  PanTool,
  LengthTool,
  StackScrollMouseWheelTool
} = csTools as any;

// Toolbar-knappdefinitioner
interface ToolButtonDefinition {
  name: string;
  label: string;
  icon: string;  // Du kan använda FontAwesome eller liknande
  toolName: string;
  mouseButton: number;
}

const toolButtons: ToolButtonDefinition[] = [
  { 
    name: 'windowLevel', 
    label: 'Fönster/Nivå', 
    icon: '🌓', 
    toolName: 'WindowLevelTool',
    mouseButton: 1 
  },
  { 
    name: 'zoom', 
    label: 'Zooma', 
    icon: '🔍', 
    toolName: 'ZoomTool',
    mouseButton: 1 
  },
  { 
    name: 'pan', 
    label: 'Panorera', 
    icon: '↔️', 
    toolName: 'PanTool',
    mouseButton: 1 
  },
  { 
    name: 'length', 
    label: 'Mät', 
    icon: '📏', 
    toolName: 'LengthTool',
    mouseButton: 1 
  }
];

interface DicomViewerProps {
  seriesId: string | undefined;
  segmentationMask?: number[] | null;
  showSegmentation?: boolean;
  onSeriesSelect?: (seriesId: string) => void;
}

// Styled components för UI
const MetadataContainer = styled.div`
  margin-top: 10px;
`;

const MetadataItem = styled.div`
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
`;

const MetadataLabel = styled.span`
  font-weight: bold;
  color: #aaa;
`;

const MetadataValue = styled.span`
  color: white;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 10;
`;

const ErrorOverlay = styled(LoadingOverlay)`
  background-color: rgba(100, 0, 0, 0.7);
`;

// Lägg till denna typ i början av filen
type AnyRenderingEngine = any;

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  outline: none;
`;

// Åtgärda React-varning för isActive-proppen på DOM-element
const ToolButton = styled.button<{ $isActive?: boolean }>`
  padding: 8px;
  background-color: ${props => props.$isActive ? '#3498db' : '#2c3e50'};
  color: white;
  border: none;
  border-radius: 4px;
  margin-right: 4px;
  cursor: pointer;
  font-size: 18px;
  
  &:hover {
    background-color: #4a6990;
  }
`;

const DicomViewer: React.FC<DicomViewerProps> = ({
  seriesId: initialSeriesId
}) => {
  // Hämta studyId från URL-parametrar om det finns
  const { studyId } = useParams<{ studyId?: string }>();
  
  // State för Canvas-referenser
  const axialRef = useRef<HTMLDivElement>(null);
  const [renderingEngine, setRenderingEngine] = useState<AnyRenderingEngine>(null);
  
  // State för patientdata
  const [patients, setPatients] = useState<DicomPatientSummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(studyId || null);
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(initialSeriesId || null);
  
  // State för kontroller
  const [useMprView, setUseMprView] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lägg till state för aktiv verktyg
  const [activeTool, setActiveTool] = useState<string>('WindowLevelTool');
  const [toolGroup, setToolGroup] = useState<any>(null);

  // State för bildmetadata
  const [imageIds, setImageIds] = useState<DicomImageId[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [metadata, setMetadata] = useState<DicomMetadata | null>(null);

  // Lägg till error state
  const [error, setError] = useState<string | null>(null);

  // Funktion för att hantera val av patient
  const handlePatientSelect = async (patient: DicomPatientSummary) => {
    try {
      setLoading(true);
      setSelectedPatientId(patient.patient_id);
      
      console.log('[DicomViewer] Selected patient:', patient.patient_id);
      
      // Hämta studier för den valda patienten
      const studiesData = await dicomService.getStudiesForPatient(patient.patient_id);
      console.log('[DicomViewer] Studies for patient:', studiesData);
      setStudies(studiesData);
      
      // Rensa tidigare valda studier och serier
      setSelectedStudyId(null);
      setSelectedSeriesId(null);
      setSeries([]);
      setImageIds([]);
      
      // Om det finns studier, välj den första automatiskt
      if (studiesData.length > 0) {
        setSelectedStudyId(studiesData[0].study_instance_uid);
        await loadSeries(studiesData[0].study_instance_uid);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading studies for patient:', error);
      setError(`Failed to load studies for patient: ${error}`);
      setLoading(false);
    }
  };

  // Funktion för att ladda serier för en studie
  const loadSeries = async (studyId: string) => {
    try {
      console.log('[DicomViewer] Loading series for study:', studyId);
      
      if (!studyId || studyId === 'undefined') {
        console.error('[DicomViewer] Ogiltigt studyId, kan inte hämta serier');
        setError('Kan inte ladda serier: Saknar studieidentifierare');
        return;
      }
      
      // Lägg till felhantering kring API-anrop
      try {
        const seriesData = await dicomService.getSeriesForStudy(studyId);
        console.log('[DicomViewer] Series data:', seriesData);
        setSeries(seriesData);
        
        // Om det finns serier, välj den första automatiskt
        if (seriesData.length > 0) {
          setSelectedSeriesId(seriesData[0].series_uid);
          await renderSeries(seriesData[0].series_uid);
        } else {
          console.warn('[DicomViewer] Inga serier hittades för studie:', studyId);
        }
      } catch (apiError) {
        console.error(`[DicomViewer] API-fel vid hämtning av serier för ${studyId}:`, apiError);
        // Åtgärda typfel genom att kontrollera om apiError är ett Error-objekt
        const errorMessage = apiError instanceof Error ? apiError.message : 'Okänt fel';
        setError(`Kunde inte hämta serier: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error loading series for study:', error);
      setError(`Failed to load series: ${error}`);
    }
  };

  // Funktion för att hantera val av serie
  const handleSeriesSelect = async (seriesId: string) => {
    try {
      console.log('[DicomViewer] Selected series:', seriesId);
      setSelectedSeriesId(seriesId);
      
      // Kontrollera att seriesId är definierat innan vi anropar renderSeries
      if (!seriesId) {
        console.error('[DicomViewer] seriesId is undefined in handleSeriesSelect');
        return;
      }
      
      // Anropa renderSeries med seriesId
      await renderSeries(seriesId);
    } catch (error) {
      console.error('Error selecting series:', error);
      setError(`Failed to select series: ${error}`);
    }
  };

  // Funktion för att rendera en serie
  const renderSeries = async (seriesId: string) => {
    try {
      console.log('[DicomViewer] Rendering series:', seriesId);
      
      // Kontrollera att seriesId är definierat
      if (!seriesId) {
        console.error('[DicomViewer] seriesId is undefined in renderSeries');
        setError('Cannot render series: Series ID is missing');
        return;
      }
      
      setLoading(true);
      
      // Hämta bilderna för den valda serien
      console.log('[DicomViewer] Fetching imageIds for series:', seriesId);
      
      // Skapa ett objekt med seriesId
      const params = { seriesId: seriesId };
      console.log('[DicomViewer] Params object:', JSON.stringify(params));
      
      // Anropa dicomService.getImageIds med params
      const imageIdsData = await dicomService.getImageIds(params);
      
      console.log('[DicomViewer] Received imageIds:', imageIdsData);
      setImageIds(imageIdsData);
      
      // Sätt första bilden som aktiv
      if (imageIdsData.length > 0) {
        setCurrentImageIndex(0);
        
        // Hämta metadata för första bilden
        const imageMetadata = await dicomService.getMetadata(imageIdsData[0].sopInstanceUid);
        setMetadata(imageMetadata);
      }
      
      // Logga metadata för felsökning av saknade värden
      if (imageIds.length > 0) {
        console.log('[DicomViewer] Loggar metadata för första bilden');
        
        // Kontrollera imageId-formatet
        const firstImageId = imageIds[0].imageId;
        console.log('[DicomViewer] ImageId format:', firstImageId);
        
        // Anropa metadataloggaren
        dicomService.logCornerstoneMetadata(firstImageId);
        
        // Kontrollera om vi kan lägga till en fallback-metadataprovider
        cornerstone.metaData.addProvider((type, imageId) => {
          if (type === 'imagePixelModule' && !cornerstone.metaData.get('imagePixelModule', imageId)) {
            console.log('[DicomViewer] Lägger till fallback imagePixelModule för', imageId);
            return {
              samplesPerPixel: 1,
              photometricInterpretation: 'MONOCHROME2',
              rows: 512,
              columns: 512,
              bitsAllocated: 16,
              bitsStored: 12,
              highBit: 11,
              pixelRepresentation: 0
            };
          }
        }, 999); // Lägre prioritet så andra providers har företräde
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error rendering series:', error);
      setError(`Failed to render series: ${error}`);
      setLoading(false);
    }
  };

  const toggleMprView = async () => {
    if (!selectedSeriesId || !renderingEngine || !axialRef.current) {
      console.warn('Kan inte växla MPR-vy: Saknar serieId, renderingEngine eller ref');
      return;
    }
    
    setLoading(true);
    
    try {
      // Rensa nuvarande viewport först
      renderingEngine.destroy();
      
      // Skapa ny renderingEngine - detta är korrekt enligt dokumentationen
      // där renderingEngine hanteras i UI-komponenten
      const engine = new RenderingEngine('myRenderingEngine');
      setRenderingEngine(engine);
      
      const newMprState = !useMprView;
      setUseMprView(newMprState);
      
      if (newMprState) {
        // Växla till MPR-vy (VolumeViewport enligt Cornerstone-dokumentation)
        // Ladda volymen först från servicen
        // TODO: Implementera loadVolumeForSeries i dicomService
        
        // Skapa VolumeViewport enligt dokumentation
        const viewportId = 'CT_MPR';
        const viewportInput = {
          viewportId,
          element: axialRef.current!,
          type: Enums.ViewportType.ORTHOGRAPHIC,
          defaultOptions: {
            orientation: Enums.OrientationAxis.AXIAL,
            background: [0, 0, 0] as [number, number, number],
          },
        };
        
        // Aktivera element
        engine.enableElement(viewportInput);
        
        // Hämta viewport
        const viewport = engine.getViewport(viewportId) as Types.IVolumeViewport;
        
        // Lägg till volymen till viewporten
        // TODO: Implementera setVolumes i dicomService
        
        // Ställ in window/level
        viewport.setProperties({
          voiRange: {
            lower: 0,
            upper: 80
          }
        });
        
        // Rendera viewport
        viewport.render();
      } else {
        // Växla tillbaka till stack-vy
        await renderSeries(selectedSeriesId);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Fel vid växling av MPR-vy:', error);
      setLoading(false);
      setUseMprView(false); // Återställ state vid fel
    }
  };

  // Funktion för att byta aktivt verktyg
  const handleToolChange = (toolName: string, mouseButton: number) => {
    if (!renderingEngine || !toolGroup) return;
    
    setActiveTool(toolName);
    
    try {
      // Inaktivera alla verktyg först
      toolButtons.forEach(tool => {
        if (tool.toolName !== 'StackScrollMouseWheelTool') {
          toolGroup.setToolPassive(tool.toolName);
        }
      });
      
      // Aktivera det valda verktyget
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton }]
      });
      
      console.log(`[DicomViewer] Aktiverade verktyg: ${toolName}`);
    } catch (error) {
      console.error(`[DicomViewer] Fel vid byte av verktyg till ${toolName}:`, error);
    }
  };
  
  // Ta bort setupViewport-beroende från denna useEffect eller deklarera funktionen tidigare
  const setupViewport = useCallback(async () => {
    if (!axialRef.current || !selectedSeriesId || imageIds.length === 0) {
      console.log('[DicomViewer] Viewport kan inte konfigureras, saknas nödvändiga data');
      return;
    }

    try {
      console.log('[DicomViewer] Konfigurerar viewport...');
      
      // Kontrollera om vi redan har en fungerande renderingEngine
      let engine = renderingEngine;
      
      // Rensa eventuell tidigare renderingEngine endast om nödvändigt
      if (engine) {
        try {
          console.log('[DicomViewer] Använder befintlig renderingEngine');
          // Vi behöver inte förstöra engine om den redan finns - det skapar loopen
          // engine.destroy();
        } catch (e) {
          console.warn('[DicomViewer] Fel vid kontroll av renderingEngine:', e);
          engine = null; // Sätt till null så vi skapar en ny
        }
      }
      
      // Skapa endast en ny renderingEngine om den inte finns eller är trasig
      if (!engine) {
        // Vänta en kort stund för att element ska vara klart
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Skapa ny renderingEngine med unikt ID för att undvika kollisioner
        const uniqueEngineId = `dicomEngine_${Date.now()}`;
        console.log('[DicomViewer] Skapar ny renderingEngine med ID:', uniqueEngineId);
        engine = new RenderingEngine(uniqueEngineId);
        setRenderingEngine(engine);
      }
      
      // Använd ett enkelt viewport-ID
      const viewportId = 'DICOM_VIEWPORT';
      
      // Logga första image ID för felsökning
      console.log('[DicomViewer] Första bildId:', imageIds[0]?.imageId);
      
      // Skapa viewportinput
      const viewportInput = {
        viewportId,
        element: axialRef.current,
        type: Enums.ViewportType.STACK,
        defaultOptions: {
          background: [0.2, 0.2, 0.2] // Grå bakgrund för att se om viewport renderas
        }
      };
      
      // Aktivera viewport
      await engine.enableElement(viewportInput);
      console.log('[DicomViewer] Viewport aktiverad');
      
      // Hämta viewport
      const viewport = engine.getViewport(viewportId) as StackViewport;
      if (!viewport) {
        console.error('[DicomViewer] Kunde inte hämta viewport');
        return;
      }
      
      // Extrahera imageId-strängar från objekten
      const imageIdStrings = imageIds.map(img => img.imageId);
      console.log('[DicomViewer] Laddar stack med', imageIdStrings.length, 'bilder');
      console.log('[DicomViewer] Första bildId-sträng:', imageIdStrings[0]);
      
      // Sätt stack på viewport
      await viewport.setStack(imageIdStrings);
      console.log('[DicomViewer] Stack konfigurerad');
      
      // Gå till första bilden
      await viewport.setImageIdIndex(0);
      console.log('[DicomViewer] Bildindex satt till 0');
      
      // Rendera scenen
      viewport.render();
      
      // Registrera verktyg för viewport
      setupTools(viewport);
      
      console.log('[DicomViewer] Viewport konfigurerad framgångsrikt');
    } catch (err) {
      console.error('[DicomViewer] Fel vid setupViewport:', err);
      setError(`Kunde inte konfigurera visningen: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [selectedSeriesId, imageIds, renderingEngine]);
  
  // Modifiera useEffect för att undvika oändlig loop - efter funktionsdeklarationen
  useEffect(() => {
    // Kör setupViewport enbart om vi har bilder men ingen renderingEngine
    if (imageIds.length > 0 && selectedSeriesId && !renderingEngine) {
      console.log('[DicomViewer] ImageIds finns men ingen renderingEngine, konfigurerar...');
      setupViewport();
    }
  }, [imageIds, selectedSeriesId, renderingEngine, setupViewport]);

  // Kontrollera bildernas format innan användning
  useEffect(() => {
    if (imageIds.length > 0) {
      // Logga första bilden för felsökning
      console.log('[DicomViewer] Första bilden:', imageIds[0]);
      console.log('[DicomViewer] Bildformat kontrollerat');
      
      // Kontrollera om bilderna använder rätt schema (wadouri:)
      const hasCorrectFormat = imageIds.every(img => 
        typeof img.imageId === 'string' && img.imageId.startsWith('wadouri:')
      );
      
      if (!hasCorrectFormat) {
        console.error('[DicomViewer] Bilderna har inte korrekt format för Cornerstone');
        setError('Bilderna har fel format. Kontakta administratören.');
      }
    }
  }, [imageIds]);

  // Åtgärda problem med bildnavigering
  const handleImageChange = useCallback(async (newIndex: number) => {
    try {
      if (imageIds.length === 0) {
        console.warn('[DicomViewer] Inga bilder tillgängliga för navigering');
        return;
      }
      
      // Kontrollera att index är inom giltigt intervall
      if (newIndex < 0) {
        newIndex = 0;
        console.warn('[DicomViewer] Justerar bildindex till 0');
      } else if (newIndex >= imageIds.length) {
        newIndex = imageIds.length - 1;
        console.warn(`[DicomViewer] Justerar bildindex till ${newIndex}`);
      }
      
      console.log(`[DicomViewer] Byter till bild med index: ${newIndex} (max: ${imageIds.length-1})`);
      
      if (!renderingEngine) {
        console.error('[DicomViewer] renderingEngine saknas vid bildnavigering');
        await setupViewport(); // Försök konfigurera viewport om renderingEngine saknas
        if (!renderingEngine) {
          console.error('[DicomViewer] Kunde inte skapa renderingEngine, avbryter bildnavigering');
          return;
        }
      }
      
      // Hämta viewport
      const viewport = renderingEngine.getViewport('DICOM_VIEWPORT') as any;
      if (!viewport) {
        console.error('[DicomViewer] Viewport saknas vid bildnavigering');
        return;
      }
      
      try {
        // Sätt nytt bildindex
        await viewport.setImageIdIndex(newIndex);
        viewport.render();
        
        // Uppdatera state
        setCurrentImageIndex(newIndex);
        
        // Uppdatera metadata för den nya bilden
        if (imageIds[newIndex]) {
          const newMetadata = await dicomService.getMetadata(imageIds[newIndex].sopInstanceUid);
          setMetadata(newMetadata);
        }
      } catch (error) {
        console.error(`[DicomViewer] Fel vid byte till bild ${newIndex}:`, error);
      }
    } catch (error) {
      console.error('[DicomViewer] Fel vid bildnavigering:', error);
    }
  }, [imageIds, renderingEngine, setupViewport]);

  // useEffect för att hantera initialSeriesId
  useEffect(() => {
    if (initialSeriesId && initialSeriesId !== selectedSeriesId) {
      setSelectedSeriesId(initialSeriesId);
      // Vänta med att anropa handleSeriesSelect tills renderingEngine är tillgänglig
      if (renderingEngine) {
        handleSeriesSelect(initialSeriesId);
      }
    }
  }, [initialSeriesId, renderingEngine, selectedSeriesId]); // Lägg till selectedSeriesId som dependency

  // Hantera studyId från URL om det finns
  useEffect(() => {
    if (studyId && studyId !== selectedStudyId) {
      setSelectedStudyId(studyId);
      loadSeries(studyId);
    }
  }, [studyId, selectedStudyId]); // Lägg till selectedStudyId som dependency

  // Åtgärda problem med laddning av WebWorker
  // I initializeViewer-funktionen, lägg till kontrollkod:
  const initializeViewer = async () => {
    try {
      console.log('[DicomViewer] Initializing viewer...');
      
      // Kontrollera om WebWorker-filen finns tillgänglig
      try {
        const response = await fetch('/cornerstoneWADOImageLoaderWebWorker.min.js');
        if (!response.ok) {
          console.error('[DicomViewer] WebWorker-fil saknas, kontrollera tillgänglighet');
        }
      } catch (e) {
        console.error('[DicomViewer] Kunde inte kontrollera WebWorker-fil:', e);
      }
      
      await dicomService.initialize();
      console.log('[DicomViewer] dicomService.initialize() färdigställd');
    } catch (error) {
      console.error('[DicomViewer] Misslyckades att initiera viewer:', error);
    }
  };

  // Ladda patienter
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Hämta alla patienter med dicomService
        console.log('[DicomViewer] Fetching patients...');
        const patientsData = await dicomService.getAllPatients();
        console.log('[DicomViewer] Patients data:', patientsData);
        setPatients(patientsData);
        
        if (patientsData.length > 0) {
          // Välj första patienten automatiskt
          setSelectedPatientId(patientsData[0].patient_id);
          
          // Hämta studier för den första patienten
          console.log('[DicomViewer] Fetching studies for patient:', patientsData[0].patient_id);
          const studiesData = await dicomService.getStudiesForPatient(patientsData[0].patient_id);
          console.log('[DicomViewer] Studies data:', studiesData);
          setStudies(studiesData);
          
          if (studiesData.length > 0) {
            // Välj första studien automatiskt
            setSelectedStudyId(studiesData[0].study_instance_uid);
            
            // Hämta serier för den första studien
            await loadSeries(studiesData[0].study_instance_uid);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('[DicomViewer] Error loading initial data:', error);
        setError('Failed to load initial data');
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Ladda imageIds när seriesId ändras
  useEffect(() => {
    if (!selectedSeriesId) {
      setError('No series selected');
      setLoading(false);
      return;
    }

    const loadImageIds = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Hämta imageIds för den valda serien
        const fetchedImageIds = await dicomService.getImageIds({ seriesId: selectedSeriesId });
        
        if (fetchedImageIds.length === 0) {
          setError('No images found in this series');
          setLoading(false);
          return;
        }
        
        setImageIds(fetchedImageIds);
        
        // Hämta metadata för första bilden
        if (fetchedImageIds.length > 0) {
          const firstImageMetadata = await dicomService.getMetadata(fetchedImageIds[0].sopInstanceUid);
          setMetadata(firstImageMetadata);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading image IDs:', error);
        setError('Failed to load images');
        setLoading(false);
      }
    };

    loadImageIds();
  }, [selectedSeriesId]);

  // Hantera tangentbordshändelser för att bläddra genom bilder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        handleImageChange(currentImageIndex - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        handleImageChange(currentImageIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentImageIndex, handleImageChange]);

  // Kontrollera bildladdningsproblem
  // Lägg till detta i useEffect som hanterar bildformat
  useEffect(() => {
    if (imageIds.length > 0) {
      // Logga första bilden för felsökning
      console.log('[DicomViewer] Första bilden:', imageIds[0]);
      console.log('[DicomViewer] Bildformat kontrollerat');
      
      // Om API-svaret innehåller felaktigt eller saknat värde för samplesPerPixel
      // så kan vi behöva konfigurera en fallback
      cornerstone.metaData.addProvider((type, imageId) => {
        if (type === 'samplesPerPixel' && imageId.startsWith('wadouri:')) {
          return 1; // Standardvärde för de flesta DICOM-bilder
        }
      }, 10000); // Låg prioritet så våra övriga providers används först
    }
  }, [imageIds]);

  // Lägg till dessa loggar i början av komponenten
  console.log('[DicomViewer] Component mounting...');

  // Lägg till saknad setupTools-funktion
  const setupTools = useCallback((viewport: any) => {
    try {
      console.log('[DicomViewer] Konfigurerar verktyg för viewport');
      
      // Hämta verktygsklasser från csTools
      const { 
        ToolGroupManager, 
        WindowLevelTool,
        ZoomTool,
        PanTool,
        LengthTool,
        StackScrollMouseWheelTool 
      } = csTools as any;
      
      // Skapa en ny verktygsgrupp med unikt ID
      const toolGroupId = 'DicomViewerToolGroup';
      
      // Ta bort tidigare verktygsgrupp om den finns
      try {
        const existingToolGroup = ToolGroupManager.getToolGroup(toolGroupId);
        if (existingToolGroup) {
          ToolGroupManager.destroyToolGroup(toolGroupId);
        }
      } catch (e) {
        console.warn('[DicomViewer] Ingen tidigare verktygsgrupp att ta bort');
      }
      
      const newToolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      
      if (!newToolGroup) {
        console.error('[DicomViewer] Kunde inte skapa verktygsgrupp');
        return;
      }
      
      // Spara verktygsgruppen i state
      setToolGroup(newToolGroup);
      
      // Lägg till verktyg
      newToolGroup.addTool(WindowLevelTool.toolName);
      newToolGroup.addTool(ZoomTool.toolName);
      newToolGroup.addTool(PanTool.toolName);
      newToolGroup.addTool(LengthTool.toolName);
      newToolGroup.addTool(StackScrollMouseWheelTool.toolName);
      
      // Aktivera verktyg
      newToolGroup.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] });
      newToolGroup.setToolActive(StackScrollMouseWheelTool.toolName, { bindings: [] });
      
      // Lägg till viewport till verktygsgruppen
      newToolGroup.addViewport(viewport.id, viewport.renderingEngineId);
      
      console.log('[DicomViewer] Verktyg konfigurerade');
    } catch (e) {
      console.error('[DicomViewer] Fel vid konfiguration av verktyg:', e);
    }
  }, []);

  // Lägg till initializeViewer-anrop i useEffect
  useEffect(() => {
    initializeViewer();
  }, []);

  // Rendera komponenten
  return (
    <ViewerContainer>
      <ToolbarContainer>
        {toolButtons.map(button => (
          <ToolButton
            key={button.name}
            $isActive={activeTool === button.toolName}
            onClick={() => handleToolChange(button.toolName, button.mouseButton)}
            title={button.label}
          >
            {button.icon}
          </ToolButton>
        ))}
      </ToolbarContainer>
      
      <MainContainer>
        <SidePanel>
          <h3>Patientlista</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {patients.map(patient => (
              <div 
                key={patient.patient_id}
                onClick={() => handlePatientSelect(patient)}
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer',
                  backgroundColor: selectedPatientId === patient.patient_id ? '#2c5282' : 'transparent',
                  color: selectedPatientId === patient.patient_id ? 'white' : 'inherit',
                  borderBottom: '1px solid #444'
                }}
              >
                {patient.patient_name}
              </div>
            ))}
          </div>
          
          <h3>Studier</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {studies.map(study => (
              <div 
                key={study.study_instance_uid}
                onClick={() => {
                  setSelectedStudyId(study.study_instance_uid);
                  loadSeries(study.study_instance_uid);
                }}
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer',
                  backgroundColor: selectedStudyId === study.study_instance_uid ? '#2c5282' : 'transparent',
                  color: selectedStudyId === study.study_instance_uid ? 'white' : 'inherit',
                  borderBottom: '1px solid #444'
                }}
              >
                {study.study_date} - {study.study_description || 'Ingen beskrivning'}
              </div>
            ))}
          </div>
          
          <h3>Serier</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {series.map(serie => (
              <div 
                key={serie.series_uid}
                onClick={() => handleSeriesSelect(serie.series_uid)}
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer',
                  backgroundColor: selectedSeriesId === serie.series_uid ? '#2c5282' : 'transparent',
                  color: selectedSeriesId === serie.series_uid ? 'white' : 'inherit',
                  borderBottom: '1px solid #444'
                }}
              >
                {serie.series_number} - {serie.description || 'Ingen beskrivning'}
              </div>
            ))}
          </div>
        </SidePanel>

          <ViewerPanel>
            <div
              ref={axialRef}
            tabIndex={0} 
            style={{ 
              width: '100%', 
              height: '100%', 
              outline: 'none',
              background: 'black' 
            }} 
          />
          
          {loading && (
            <LoadingOverlay>
              <div>Laddar DICOM-bilder...</div>
            </LoadingOverlay>
          )}
          
          {error && (
            <ErrorOverlay>
              <div>{error}</div>
            </ErrorOverlay>
          )}
          
          <ControlsContainer>
            <ImageControls>
              <button 
                onClick={() => handleImageChange(currentImageIndex - 1)}
                disabled={currentImageIndex <= 0}
              >
                Föregående bild
              </button>
              <div>Bild {currentImageIndex + 1} / {imageIds.length}</div>
              <button 
                onClick={() => handleImageChange(currentImageIndex + 1)}
                disabled={currentImageIndex >= imageIds.length - 1}
              >
                Nästa bild
              </button>
            </ImageControls>
          </ControlsContainer>
          </ViewerPanel>
        
        <InfoPanel>
          <h3 key="info-title">Serieinformation</h3>
          {selectedSeriesId && <div key="series-id">Serie-ID: {selectedSeriesId}</div>}
          <div key="images-count">Bilder: {imageIds.length}</div>
          
          {metadata && (
            <MetadataContainer key="metadata">
              <h4>Bildmetadata</h4>
              <MetadataItem key="size">
                <MetadataLabel>Storlek:</MetadataLabel>
                <MetadataValue>{metadata.rows} x {metadata.columns}</MetadataValue>
              </MetadataItem>
              {metadata.sliceThickness && (
                <MetadataItem key="thickness">
                  <MetadataLabel>Skivtjocklek:</MetadataLabel>
                  <MetadataValue>{metadata.sliceThickness.toFixed(2)} mm</MetadataValue>
                </MetadataItem>
              )}
              {metadata.pixelSpacing && (
                <MetadataItem key="spacing">
                  <MetadataLabel>Pixelavstånd:</MetadataLabel>
                  <MetadataValue>
                    {metadata.pixelSpacing[0].toFixed(2)} x {metadata.pixelSpacing[1].toFixed(2)} mm
                  </MetadataValue>
                </MetadataItem>
              )}
            </MetadataContainer>
          )}
        </InfoPanel>
      </MainContainer>
    </ViewerContainer>
  );
};

export default DicomViewer; 