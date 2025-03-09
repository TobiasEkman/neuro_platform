import React, { useEffect, useRef, useState} from 'react';
import styled from 'styled-components';
import dicomService from '../../services/dicomService';
import { DicomStudy, DicomSeries} from '../../types/medical';
import { Patient } from '../../types/patient';
import {
  ViewerContainer,
  ViewerGrid,
  ViewerPanel,
  Canvas,
  Controls,
  ViewerLabel
} from './styles';
import * as cornerstone from '@cornerstonejs/core';
import { 
  RenderingEngine,
  Types,
  Enums,
  cache as cornerstoneCache,
  volumeLoader as cornerstoneVolumeLoader,
  setVolumesForViewports as cornerstoneSetVolumesForViewports
} from '@cornerstonejs/core';


// Styled components
const MainContainer = styled.div`
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;
`;

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 300px;
  min-width: 300px;
  overflow-y: auto;
  background: ${props => props.theme.colors.background.secondary};
  border-radius: 8px;
  padding: 1rem;
`;

const ListContainer = styled.div`
  flex: 0 0 300px;
  overflow-y: auto;
  padding: 1rem;
  background: ${props => props.theme.colors.background.secondary};
`;

const ListItem = styled.div<{ isSelected?: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${props => props.isSelected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.background.hover};
    color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  }
`;

const ListTitle = styled.h3`
  margin: 0 0 1rem 0;
  padding: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SeriesItem = styled.div<{ isSelected: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${props => props.isSelected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.background.hover};
  }
`;

interface DicomViewerProps {
  seriesId: string | undefined;
  segmentationMask: number[] | null;
  showSegmentation: boolean;
  onSeriesSelect?: (seriesId: string) => void;
}

const DicomViewer: React.FC<DicomViewerProps> = ({
  seriesId,
  segmentationMask,
  showSegmentation,
  onSeriesSelect
}) => {
  const axialRef = useRef<HTMLCanvasElement>(null);
  const sagittalRef = useRef<HTMLCanvasElement>(null);
  const coronalRef = useRef<HTMLCanvasElement>(null);
  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [toolGroup, setToolGroup] = useState<any>(null);
  const [useMprView, setUseMprView] = useState(false);

  // Ladda patienter när komponenten monteras
  useEffect(() => {
    loadPatients();
  }, []);

  // Initiera Cornerstone
  useEffect(() => {
    const initCornerstone = async () => {
      try {
        // Initiera Cornerstone Core
        await cornerstone.init();
        
        // Registrera DICOM-bildladdare
        await dicomService.registerImageLoader();
        
        // Skapa rendering engine
        const engine = new RenderingEngine('myRenderingEngine');
        setRenderingEngine(engine);
        
        console.log('Cornerstone initialized successfully');
      } catch (error) {
        console.error('Error initializing Cornerstone:', error);
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
      setSelectedStudyId(null);
      setSeries([]);
      setSelectedSeriesId(null);
    } catch (error) {
      console.error('Failed to load studies:', error);
    }
  };

  const loadSeries = async (studyId: string) => {
    try {
      const study = await dicomService.getStudy(studyId);
      setSeries(study.series);
      setSelectedSeriesId(null);
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
      await renderSeriesWithCornerstone(seriesId);

    } catch (error) {
      console.error('Failed to load series:', error);
      setSelectedSeriesId(null);
    }
  };

  const renderSeriesWithCornerstone = async (seriesId: string) => {
    try {
      if (!axialRef.current || !sagittalRef.current || !coronalRef.current) {
        console.error('Viewport elements not available');
        return;
      }
      
      const engine = renderingEngine;
      if (!engine) {
        console.error('Rendering engine not initialized');
        return;
      }
      
      // Hämta bilderna för serien
      const imageIds = await dicomService.getImageIdsForSeries(seriesId);
      
      if (useMprView) {
        // === VOLYM-RENDERING (MPR) ===
        
        // Definiera volym-ID
        const volumeId = `volume-${seriesId}`;
        
        // Skapa volym i minnet
        const volume = await cornerstoneVolumeLoader.createAndCacheVolume(volumeId, {
          imageIds,
          dimensions: [512, 512, imageIds.length],
          spacing: [1, 1, 1],
          orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1]
        } as any);
        
        // Definiera viewports för olika orienteringar
        const viewportInput = [
          {
            viewportId: 'CT_AXIAL',
            element: axialRef.current,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: {
              orientation: Enums.OrientationAxis.AXIAL,
            },
          },
          {
            viewportId: 'CT_SAGITTAL',
            element: sagittalRef.current,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: {
              orientation: Enums.OrientationAxis.SAGITTAL,
            },
          },
          {
            viewportId: 'CT_CORONAL',
            element: coronalRef.current,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: {
              orientation: Enums.OrientationAxis.CORONAL,
            },
          },
        ];
        
        // Sätt upp viewports
        engine.setViewports(viewportInput);
        
        // Ladda volymen
        await volume.load();
        
        // Sätt volymen för alla viewports
        cornerstoneSetVolumesForViewports(
          engine,
          [{ volumeId }],
          ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL']
        );
        
        // Lägg till viewports i toolGroup om det finns
        if (toolGroup) {
          toolGroup.addViewport('CT_AXIAL', 'myRenderingEngine');
          toolGroup.addViewport('CT_SAGITTAL', 'myRenderingEngine');
          toolGroup.addViewport('CT_CORONAL', 'myRenderingEngine');
        }
      } else {
        // === STACK-RENDERING ===
        
        // Skapa viewport med explicit typ
        const viewportId = 'CT_AXIAL_STACK';
        const viewportInput = {
          viewportId,
          element: axialRef.current,
          type: Enums.ViewportType.STACK,
        };
        
        // Använd enableElement istället för setViewports
        engine.enableElement(viewportInput);
        
        // Hämta viewport och sätt stack
        const viewport = engine.getViewport(viewportId) as Types.IStackViewport;
        viewport.setStack(imageIds);
        
        // Rendera viewport
        viewport.render();
        
        // Lägg till viewport i toolGroup
        if (toolGroup) {
          toolGroup.addViewport(viewportId, 'myRenderingEngine');
        }
      }
    } catch (error) {
      console.error('Error rendering series:', error);
    }
  };

  // Hantera segmentering
  useEffect(() => {
    if (!showSegmentation || !segmentationMask || !axialRef.current || !renderingEngine) return;

    try {
      const viewport = renderingEngine.getViewport('axial-viewport') as Types.IStackViewport;
      if (!viewport) return;

      // Lägg till segmenteringslager
      // Obs: Detta är en förenklad implementation och kan behöva anpassas
      // beroende på hur segmenteringsmasken är strukturerad
      if ('addLayer' in viewport) {
        viewport.addLayer({
          imageIds: ['segmentation'],
          options: {
            opacity: 0.5,
            colormap: 'hsv',
            data: segmentationMask
          }
        });
        renderingEngine.render();
      }
    } catch (error) {
      console.error('Error applying segmentation mask:', error);
    }
  }, [segmentationMask, showSegmentation, renderingEngine]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    loadStudies(patient.patient_id);
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
                <div>Serie {series.series_number}</div>
                <div>{series.description || 'Ingen beskrivning'}</div>
              </SeriesItem>
            ))}
          </ListContainer>
        </SidePanel>

        <ViewerGrid>
          <ViewerPanel>
            <ViewerLabel>Axial</ViewerLabel>
            <Canvas ref={axialRef} />
          </ViewerPanel>

          <ViewerPanel>
            <ViewerLabel>Sagittal</ViewerLabel>
            <Canvas ref={sagittalRef} />
          </ViewerPanel>

          <ViewerPanel>
            <ViewerLabel>Coronal</ViewerLabel>
            <Canvas ref={coronalRef} />
          </ViewerPanel>

          <Controls>
            <div>Bild: {currentSlice + 1}/{totalSlices}</div>
          </Controls>
        </ViewerGrid>
      </MainContainer>
    </ViewerContainer>
  );
};

export default DicomViewer; 