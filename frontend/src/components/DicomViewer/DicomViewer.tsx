import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
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
  ToolButton,
  ControlsContainer,
  ImageControls,
  InfoPanel
} from './styles';
import { 
  RenderingEngine,
  Types,
  Enums,
  cache as cornerstoneCache,
  StackViewport
} from '@cornerstonejs/core';

// Importera nödvändiga verktyg direkt från csTools
import * as csTools from '@cornerstonejs/tools';
const { 
  Enums: csToolsEnums 
} = csTools as any;

// Lägg till i början av filen
interface ToolGroupManagerType {
  createToolGroup: (name: string) => any;
  getToolGroup: (name: string) => any;
}

// Och sedan i din import-sektion
const ToolGroupManager = (csTools as any).ToolGroupManager as ToolGroupManagerType;

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
    name: 'pan', 
    label: 'Panorera', 
    icon: '↔️', 
    toolName: 'PanTool',
    mouseButton: 1 // Primär musknapp (vänster klick) 
  },
  { 
    name: 'zoom', 
    label: 'Zooma', 
    icon: '🔍', 
    toolName: 'ZoomTool',
    mouseButton: 2 // Sekundär musknapp (höger klick)
  },
  { 
    name: 'window', 
    label: 'Fönster/Nivå', 
    icon: '🌓', 
    toolName: 'WindowLevelTool',
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

// Verktyg som ska visas i toolbaren
const tools = [
  { name: 'WindowLevel', label: 'Window/Level', icon: 'W' },
  { name: 'Zoom', label: 'Zoom', icon: 'Z' },
  { name: 'Pan', label: 'Pan', icon: 'P' },
  { name: 'Length', label: 'Measure', icon: 'M' },
];

// Lägg till denna typ i början av filen
type AnyRenderingEngine = any;

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  outline: none;
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
      const seriesData = await dicomService.getSeriesForStudy(studyId);
      console.log('[DicomViewer] Series data:', seriesData);
      setSeries(seriesData);
      
      // Om det finns serier, välj den första automatiskt
      if (seriesData.length > 0) {
        setSelectedSeriesId(seriesData[0].series_uid);
        await renderSeries(seriesData[0].series_uid);
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
          element: axialRef.current,
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
      if (!renderingEngine) return;
      
      setActiveTool(toolName);
      
      // Hämta toolGroup med typkastning
      const toolGroupInstance = (ToolGroupManager as any).getToolGroup('CT_AXIAL_STACK');
      if (!toolGroupInstance) return;
      
      // Inaktivera alla verktyg först
      toolButtons.forEach(tool => {
        toolGroupInstance.setToolPassive(tool.toolName);
      });
      
      // Aktivera det valda verktyget
      toolGroupInstance.setToolActive(toolName, {
        bindings: [{ mouseButton }]
      });
    };
  
  // Hantera byte av bild
  const handleImageChange = useCallback(async (index: number) => {
      if (index < 0 || index >= imageIds.length || !renderingEngine) {
        return;
      }
      
      setCurrentImageIndex(index);
      
      // Uppdatera viewport till den valda bilden med typkastning
      const viewport = renderingEngine.getViewport('CT_AXIAL_STACK') as StackViewport;
      viewport.setImageIdIndex(index);
      renderingEngine.render();
      
      // Hämta metadata för den valda bilden
      try {
        const imageMetadata = await dicomService.getMetadata(imageIds[index].sopInstanceUid);
        setMetadata(imageMetadata);
      } catch (error) {
        console.error('Error loading metadata:', error);
      }
    }, [imageIds, renderingEngine]);
    
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

  // Initiera Cornerstone
  useEffect(() => {
    const initializeViewer = async () => {
      try {
        console.log('[DicomViewer] Initializing viewer...');
        await dicomService.initialize();
        console.log('[DicomViewer] dicomService.initialize() färdigställd');
      } catch (error) {
        console.error('[DicomViewer] Misslyckades att initiera viewer:', error);
      }
    };

    initializeViewer();
  }, []);

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

  // Uppdatera setupViewport för att felsöka bildladdning
  useEffect(() => {
    if (!axialRef.current || imageIds.length === 0 || loading || error) {
      return;
    }

    const setupViewport = async () => {
      try {
        console.log('[DicomViewer] Konfigurerar viewport...');
        
        // Logga information om bild-ID:n
        console.log('[DicomViewer] Första bildformat:', imageIds[0]);
        
        // Kontrollera om bildladdare finns för wadouri
        const imageLoader = cornerstone.imageLoader as any;
        const hasWadoLoader = imageLoader.getImageLoader && imageLoader.getImageLoader('wadouri');
        
        console.log('[DicomViewer] Har WADO-URI laddare:', !!hasWadoLoader);
        
        if (!hasWadoLoader) {
          console.error('[DicomViewer] WADO-URI laddare saknas, kan inte visa DICOM-bilder');
          setError('Kan inte visa DICOM-bilder: WADO-URI laddare saknas');
          return;
        }
        
        // Fortsätt med resten av setup-koden...
      } catch (error) {
        console.error('[DicomViewer] Fel vid setupViewport:', error);
        
        // Visa mer detaljerat felmeddelande
        if (error instanceof Error) {
          setError(`Misslyckades att ställa in viewer: ${error.message}`);
        } else {
          setError('Misslyckades att ställa in viewer');
        }
      }
    };

    // Lägg till en liten fördröjning för att säkerställa att DOM har uppdaterats
    const timeoutId = setTimeout(() => {
      setupViewport();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [imageIds, loading, error]);

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

  // Lägg till dessa loggar i början av komponenten
  console.log('[DicomViewer] Component mounting...');

  // Rendera komponenten
  return (
    <ViewerContainer>
      <ToolbarContainer>
        {toolButtons.map(button => (
          <ToolButton
            key={button.name}
            isActive={activeTool === button.toolName}
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
          <h3>Serieinformation</h3>
          {selectedSeriesId && <div>Serie-ID: {selectedSeriesId}</div>}
          <div>Bilder: {imageIds.length}</div>
          
          {metadata && (
            <MetadataContainer>
              <h4>Bildmetadata</h4>
              <MetadataItem>
                <MetadataLabel>Storlek:</MetadataLabel>
                <MetadataValue>{metadata.rows} x {metadata.columns}</MetadataValue>
              </MetadataItem>
              {metadata.sliceThickness && (
                <MetadataItem>
                  <MetadataLabel>Skivtjocklek:</MetadataLabel>
                  <MetadataValue>{metadata.sliceThickness.toFixed(2)} mm</MetadataValue>
                </MetadataItem>
              )}
              {metadata.pixelSpacing && (
                <MetadataItem>
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