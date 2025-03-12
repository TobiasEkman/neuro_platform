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
  seriesId: initialSeriesId
}) => {
  // Hämta studyId från URL-parametrar om det finns
  const { studyId } = useParams<{ studyId?: string }>();
  
  // State för Canvas-referenser
  const axialRef = useRef<HTMLDivElement>(null);
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
      // Vänta med att anropa handleSeriesSelect tills renderingEngine är tillgänglig
      if (renderingEngine) {
        handleSeriesSelect(initialSeriesId);
      }
    }
  }, [initialSeriesId, renderingEngine]); // Lägg till renderingEngine som dependency

  // Hantera studyId från URL om det finns
  useEffect(() => {
    if (studyId && studyId !== selectedStudyId) {
      setSelectedStudyId(studyId);
      loadSeries(studyId);
    }
  }, [studyId]);

  // Initiera Cornerstone och verktyg
  useEffect(() => {
    let engineInstance: RenderingEngine | null = null;

    const initCornerstone = async () => {
      try {
        console.log("Starting Cornerstone initialization...");
        setLoading(true);
        
        // Initiera DicomService
        console.log("Initializing DicomService...");
        await dicomService.initialize();
        
        // Skapa rendering engine
        console.log("Creating RenderingEngine...");
        engineInstance = new RenderingEngine('myRenderingEngine');
        console.log("RenderingEngine created:", engineInstance);
        setRenderingEngine(engineInstance);
        
        // Skapa och konfigurera toolGroup
        console.log("Creating ToolGroup...");
        const toolGroupId = 'myToolGroup';
        const newToolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        
        // Lägg till alla registrerade verktyg till toolGroup
        console.log("Adding tools to ToolGroup...");
        newToolGroup.addTool('PanTool');
        newToolGroup.addTool('ZoomTool');
        newToolGroup.addTool('WindowLevelTool');
        newToolGroup.addTool('StackScrollTool');
        
        // Aktivera scrollhjulet för stackNavigering som standard
        newToolGroup.setToolActive('StackScrollTool', {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }]
        });
        
        // Aktivera standardverktyget (WindowLevel)
        newToolGroup.setToolActive('WindowLevelTool', {
          bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }]
        });
        
        
        setToolGroup(newToolGroup);
        console.log('Cornerstone initialized successfully');

        // Om vi har en initial series, rendera den nu när allt är initierat
        if (selectedSeriesId) {
          console.log("Initial series detected, rendering...");
          await renderSeries(selectedSeriesId, engineInstance);
        }

      } catch (error) {
        console.error('Error during Cornerstone initialization:', error);
        setLoading(false);
      }
    };
    
    console.log("Calling initCornerstone...");
    initCornerstone();
    
    return () => {
      console.log("Cleaning up Cornerstone...");
      if (engineInstance) {
        console.log("Destroying renderingEngine...");
        engineInstance.destroy();
      }
      console.log("Purging Cornerstone cache...");
      cornerstoneCache.purgeCache();
    };
  }, [selectedSeriesId]); // Lägg till selectedSeriesId som dependency

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
        const firstSeriesId = study.series[0].series_uid;
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
      
      // Ladda och visa serien med Cornerstone3D
      if (renderingEngine) {
        await renderSeries(seriesId);
      } else {
        console.log("Waiting for rendering engine to be available...");
      }
    } catch (error) {
      console.error('Failed to load series:', error);
      setSelectedSeriesId(null);
    }
  };

  // Uppdatera renderSeries för att ta emot renderingEngine som parameter
  const renderSeries = async (seriesId: string, engine?: RenderingEngine | null) => {
    console.log("renderSeries called with seriesId:", seriesId);
    const currentEngine = engine || renderingEngine;
    console.log("Using engine:", currentEngine);
    
    try {
      console.log("Entering try block");
      
      if (!axialRef.current) {
        console.error("axialRef.current is null or undefined");
        return;
      }

      if (!currentEngine) {
        console.error("No rendering engine available");
        return;
      }

      console.log("Passed all checks - axialRef and renderingEngine are available");
      console.log("seriesId: ", seriesId);
      setLoading(true);
      
      // Hämta bilderna för serien
      const imageIds = await dicomService.getImageIds({ seriesId });
      console.log("Received imageIds:", imageIds);
      
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
      
      console.log("Enabling element with input:", viewportInput);

      // Lägg till mer loggning för att felsöka orsaker
      console.log("Kontrollerar att currentEngine är initierad:", !!currentEngine);
      console.log("Kontrollerar axialRef.current:", !!axialRef.current);

      console.log("Finns axialRef-element i dokumentet?",
        axialRef.current ? document.contains(axialRef.current) : 'Ingen ref'
      );

      currentEngine.enableElement(viewportInput)
        .then(() => {
          console.log("enableElement lyckades för:", viewportInput);
        })
        .catch((error) => {
          console.error("enableElement misslyckades för:", viewportInput, error);
        });
      
      // Hämta viewport och sätt stack
      const viewport = currentEngine.getViewport(viewportId) as Types.IStackViewport;
      console.log("Got viewport:", viewport);
      
      console.log("Setting stack with first imageId:", imageIds[0]);
      await viewport.setStack(imageIds);
      
      // Sätt bra window/level om möjligt
      console.log("Setting viewport properties");
      viewport.setProperties({
        voiRange: {
          lower: 0,
          upper: 80
        }
      });
      
      // Lägg till viewport till toolGroup om det inte redan är gjort
      if (toolGroup && !toolGroup.hasViewport(viewportId)) {
        console.log("Adding viewport to toolGroup");
        toolGroup.addViewport(viewportId);
      }
      
      // Rendera viewport
      console.log("Calling viewport.render()");
      viewport.render();
      
      // Vänta en kort stund och kontrollera om renderingen lyckades
      setTimeout(() => {
        const element = axialRef.current;
        if (element) {
          // Istället för att försöka hämta canvas-kontext och bilddata,
          // kontrollera bara om elementet finns och har dimensioner
          const rect = element.getBoundingClientRect();
          console.log("Viewport element dimensions:", rect.width, rect.height);
          console.log("Viewport element is ready:", !!element);
        }
      }, 1000);

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
      if (button.toolName !== 'StackScrollTool') {
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
            {series.map((series) => {
              
              return (
                <SeriesItem
                  key={series.series_uid}
                  isSelected={series.series_uid === selectedSeriesId}
                  onClick={() => handleSeriesSelect(series.series_uid)}
                >
                  <div>Series {series.series_number}</div>
                  <div>{series.description || 'No description'}</div>
                </SeriesItem>
              );
            })}
          </ListContainer>
        </SidePanel>

        <ViewerGrid>
          <ViewerPanel>
            <ViewerLabel>
              {loading ? 'Loading...' : 'DICOM-image'}
            </ViewerLabel>
            
            <div
              ref={axialRef}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            />
            
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