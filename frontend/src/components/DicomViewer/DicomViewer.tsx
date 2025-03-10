import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import dicomService from '../../services/dicomService';
import { DicomStudy, DicomSeries } from '../../types/medical';
import { Patient } from '../../types/patient';
import {
  ViewerContainer,
  ViewerGrid,
  ViewerPanel,
  Canvas,
  Controls,
  ViewerLabel,
  MainContainer,
  SidePanel,
  ListContainer,
  ListItem,
  ListTitle,
  SeriesItem,
  ToolbarContainer,
  ToolButton
} from './styles';
import { 
  RenderingEngine,
  Types,
  Enums,
  cache as cornerstoneCache
} from '@cornerstonejs/core';

// Importera nödvändiga verktyg direkt från csTools
import * as csTools from '@cornerstonejs/tools';
const { 
  ToolGroupManager, 
  Enums: csToolsEnums 
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

const DicomViewer: React.FC<DicomViewerProps> = ({
  seriesId: initialSeriesId,
  segmentationMask,
  showSegmentation,
  onSeriesSelect
}) => {
  // Hämta studyId från URL-parametrar om det finns
  const { studyId } = useParams<{ studyId?: string }>();
  
  // State för Canvas-referenser
  const axialRef = useRef<HTMLCanvasElement>(null);
  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);
  
  // State för patientdata
  const [patients, setPatients] = useState<Patient[]>([]);
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

  // Ladda patienter när komponenten monteras
  useEffect(() => {
    loadPatients();
  }, []);

  // Hantera initialSeriesId om det ändras externt
  useEffect(() => {
    if (initialSeriesId && initialSeriesId !== selectedSeriesId) {
      setSelectedSeriesId(initialSeriesId);
      handleSeriesSelect(initialSeriesId);
    }
  }, [initialSeriesId]);

  // Hantera studyId från URL om det finns
  useEffect(() => {
    if (studyId && studyId !== selectedStudyId) {
      setSelectedStudyId(studyId);
      loadSeries(studyId);
    }
  }, [studyId]);

  // Initiera Cornerstone och verktyg
  useEffect(() => {
    const initCornerstone = async () => {
      try {
        setLoading(true);
        // Initiera DicomService (som nu inkluderar Cornerstone och DICOM Image Loader)
        await dicomService.initialize();
        
        // Skapa rendering engine
        const engine = new RenderingEngine('myRenderingEngine');
        setRenderingEngine(engine);
        
        // Skapa och konfigurera toolGroup
        const toolGroupId = 'myToolGroup';
        const newToolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        
        // Lägg till alla registrerade verktyg till toolGroup
        newToolGroup.addTool('PanTool');
        newToolGroup.addTool('ZoomTool');
        newToolGroup.addTool('WindowLevelTool');
        newToolGroup.addTool('StackScrollMouseWheelTool');
        
        // Aktivera scrollhjulet för stackNavigering som standard
        newToolGroup.setToolActive('StackScrollMouseWheelTool', {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }]
        });
        
        // Aktivera standardverktyget (WindowLevel)
        newToolGroup.setToolActive('WindowLevelTool', {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }]
        });
        
        setToolGroup(newToolGroup);
        console.log('Cornerstone initialized successfully');
        setLoading(false);
      } catch (error) {
        console.error('Error initializing Cornerstone:', error);
        setLoading(false);
      }
    };
    
    initCornerstone();
    
    return () => {
      // Cleanup
      if (renderingEngine) {
        renderingEngine.destroy();
      }
      cornerstoneCache.purgeCache();
    };
  }, []);

  const loadPatients = async () => {
    try {
      const fetchedPatients = await dicomService.getPatients({ withDicom: true });
      
      if (Array.isArray(fetchedPatients)) {
        setPatients(fetchedPatients);
      } else {
        console.error('Fetched patients is not an array:', fetchedPatients);
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]);
    }
  };

  const loadStudies = async (patientId: string) => {
    try {
      const fetchedStudies = await dicomService.getStudiesForPatient(patientId);
      setStudies(fetchedStudies);
      
      // Om vi har studier och inget är valt, välj det första
      if (fetchedStudies.length > 0 && !selectedStudyId) {
        setSelectedStudyId(fetchedStudies[0].study_instance_uid);
        loadSeries(fetchedStudies[0].study_instance_uid);
      }
    } catch (error) {
      console.error('Failed to load studies:', error);
    }
  };

  const loadSeries = async (studyId: string) => {
    try {
      const study = await dicomService.getStudy(studyId);
      setSeries(study.series || []);
      
      // Om vi har serier och inget är valt, välj den första
      if (study.series && study.series.length > 0 && !selectedSeriesId) {
        const firstSeriesId = study.series[0].series_instance_uid;
        setSelectedSeriesId(firstSeriesId);
        handleSeriesSelect(firstSeriesId);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    }
  };

  const handleSeriesSelect = async (seriesId: string) => {
    try {
      setSelectedSeriesId(seriesId);
      
      // Meddela TumorAnalysis om vald serie
      if (onSeriesSelect) {
        onSeriesSelect(seriesId);
      }

      // Ladda och visa serien med Cornerstone3D
      await renderSeries(seriesId);
    } catch (error) {
      console.error('Failed to load series:', error);
      setSelectedSeriesId(null);
    }
  };

  // Uppdatera renderSeries för att använda toolGroup
  const renderSeries = async (seriesId: string) => {
    try {
      if (!axialRef.current || !renderingEngine) {
        console.error('Viewport element or rendering engine not available');
        return;
      }
      
      setLoading(true);
      
      // Hämta bilderna för serien
      const imageIds = await dicomService.getImageIds({ seriesId });
      
      if (imageIds.length === 0) {
        console.error('No images found for series');
        setLoading(false);
        return;
      }
      
      console.log(`Rendering ${imageIds.length} images from series ${seriesId}`);
      
      // Skapa viewport
      const viewportId = 'CT_AXIAL_STACK';
      
      // Skapa viewport-input
      const viewportInput = {
        viewportId,
        element: axialRef.current,
        type: Enums.ViewportType.STACK,
      };
      
      renderingEngine.enableElement(viewportInput);
      
      // Hämta viewport och sätt stack
      const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
      
      await viewport.setStack(imageIds);
      
      // Sätt bra window/level om möjligt
      viewport.setProperties({
        voiRange: {
          // CT Window för hjärna
          lower: 0,
          upper: 80
        }
      });
      
      // Lägg till viewport till toolGroup om det inte redan är gjort
      if (toolGroup && !toolGroup.hasViewport(viewportId)) {
        toolGroup.addViewport(viewportId);
      }
      
      // Rendera viewport
      viewport.render();
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error rendering series:', error);
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    loadStudies(patient.patient_id);
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
        const volume = await dicomService.loadVolumeForSeries(selectedSeriesId);
        
        // Skapa VolumeViewport enligt dokumentation
        const viewportId = 'CT_MPR';
        const viewportInput = {
          viewportId,
          element: axialRef.current,
          type: Enums.ViewportType.ORTHOGRAPHIC,
          defaultOptions: {
            orientation: Enums.OrientationAxis.AXIAL,
            background: [0, 0, 0],
          },
        };
        
        // Aktivera element
        engine.enableElement(viewportInput);
        
        // Hämta viewport
        const viewport = engine.getViewport(viewportId) as Types.IVolumeViewport;
        
        // Lägg till volymen till viewporten
        await viewport.setVolumes([
          { volumeId: volume.volumeId }
        ]);
        
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
    if (!toolGroup) return;
    
    // Inaktivera alla verktyg först
    toolButtons.forEach(button => {
      if (button.toolName !== 'StackScrollMouseWheelTool') {
        toolGroup.setToolPassive(button.toolName);
      }
    });
    
    // Aktivera valt verktyg
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton }]
    });
    
    setActiveTool(toolName);
  };

  return (
    <ViewerContainer>
      <MainContainer>
        <SidePanel>
          <ListContainer>
            <ListTitle>Patients</ListTitle>
            {patients.map(patient => (
              <ListItem 
                key={patient.patient_id}
                isSelected={patient.patient_id === selectedPatientId}
                onClick={() => handlePatientSelect(patient)}
              >
                {patient.name} ({patient.patient_id})
              </ListItem>
            ))}
          </ListContainer>
          
          <ListContainer>
            <ListTitle>Studies</ListTitle>
            {studies.map(study => (
              <ListItem
                key={study.study_instance_uid}
                isSelected={study.study_instance_uid === selectedStudyId}
                onClick={() => {
                  setSelectedStudyId(study.study_instance_uid);
                  loadSeries(study.study_instance_uid);
                }}
              >
                {study.description} ({study.study_date})
              </ListItem>
            ))}
          </ListContainer>
          
          <ListContainer>
            <ListTitle>Series</ListTitle>
            {series.map((series) => (
              <SeriesItem
                key={series.series_instance_uid}
                isSelected={series.series_instance_uid === selectedSeriesId}
                onClick={() => handleSeriesSelect(series.series_instance_uid)}
              >
                <div>Series {series.series_number}</div>
                <div>{series.description || 'No description'}</div>
              </SeriesItem>
            ))}
          </ListContainer>
        </SidePanel>

        <ViewerGrid>
          <ViewerPanel>
            <ViewerLabel>
              {loading ? 'Loading...' : 'DICOM-image'}
            </ViewerLabel>
            <Canvas ref={axialRef} />
            
            {/* Toolbar för verktyg */}
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
              <button onClick={toggleMprView}>
                {useMprView ? 'Show Stack' : 'Show MPR'} 
              </button>
            </ToolbarContainer>
          </ViewerPanel>
        </ViewerGrid>
      </MainContainer>
    </ViewerContainer>
  );
};

export default DicomViewer; 