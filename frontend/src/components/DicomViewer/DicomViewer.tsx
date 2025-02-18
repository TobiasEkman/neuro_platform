import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  RenderingEngine,
  cache,
  utilities as csUtils,
  init as csInit,
  StackViewport,
  VolumeViewport,
  volumeLoader,
  imageLoader,
  setVolumesForViewports
} from '@cornerstonejs/core';

import {
  init as csToolsInit,
  utilities as csToolsUtils,
  addTool,
  PanTool,
  ZoomTool,
} from '@cornerstonejs/tools';

import styled from 'styled-components';
import dicomService from '../../services/dicomService';
import { MPRViewer } from './components/MPRViewer';
import { WindowLevelControls } from './components/WindowLevelControls';
import { DicomStudy, DicomSeries } from '../../types/medical';
import { WindowLevel } from '../../types/medical';
import { ViewerContainer, ErrorMessage } from './styles';

// Enhanced styled components
const ViewerGrid = styled.div<{ layout: 'single' | 'mpr' }>`
  display: grid;
  grid-template-columns: ${props => props.layout === 'single' ? '1fr' : 'repeat(2, 1fr)'};
  grid-template-rows: ${props => props.layout === 'single' ? '1fr' : 'repeat(2, 1fr)'};
  gap: 1rem;
  margin-top: 1rem;
  height: 70vh;
`;

const ViewerPanel = styled.div`
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const ViewerHeader = styled.div`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
`;

// Add layout controls
const LayoutControls = styled.div`
  margin: 1rem 0;
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const LayoutButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.colors.text.primary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
`;

const SelectionBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.background.secondary};
  border-radius: 8px;
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`;

interface ViewerState {
  windowLevel: WindowLevel;
  currentSlice: number;
  totalSlices: number;
  layout: 'single' | 'mpr';
  selectedPatientId: string;
  selectedStudyId: string;
  selectedSeriesId: string;
  currentImageIndex: number;
  totalImages: number;
  error: string | null;
}

export interface DicomViewerProps {
  studyId?: string;
}

interface Study {
  studyInstanceUID: string;
  studyDate: string;
  series: Array<{
    seriesInstanceUID: string;
    modality: string;
    filePath: string;
  }>;
}

interface Patient {
  _id: string;
  patient_id: string;
  name: string;
  studies: Study[];
}

const findSelectedSeries = (study: DicomStudy | null, seriesId: string) => {
  return study?.series.find(s => s.series_instance_uid === seriesId);
};

export const DicomViewer: React.FC<DicomViewerProps> = () => {
  const { studyId } = useParams<{ studyId: string }>();
  const [state, setState] = useState<ViewerState>({
    windowLevel: {
      windowCenter: 40,
      windowWidth: 400
    },
    currentSlice: 0,
    totalSlices: 0,
    layout: 'single',
    selectedPatientId: '',
    selectedStudyId: '',
    selectedSeriesId: '',
    currentImageIndex: 0,
    totalImages: 0,
    error: null
  });

  const [patients, setPatients] = useState<Patient[]>([]);

  const viewerRef = useRef<HTMLDivElement>(null);
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);

  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);

  const [study, setStudy] = useState<DicomStudy | null>(null);

  useEffect(() => {
    const loadStudy = async () => {
      try {
        console.log('Loading study with ID:', studyId);
        if (!studyId) {
          return; // Don't throw error, just return
        }

        const studies = await dicomService.searchStudies(`study:${studyId}`);
        console.log('Found studies:', studies);
        
        if (studies.length === 0) {
          throw new Error('Study not found');
        }

        setStudy(studies[0]);
        if (studies[0].series?.length > 0) {
          setState(prev => ({
            ...prev,
            selectedSeriesId: studies[0].series[0].series_instance_uid
          }));
        }
      } catch (err) {
        console.error('Failed to load study:', err);
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to load study'
        }));
      }
    };

    loadStudy();
  }, [studyId]); // Only run when studyId changes

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        console.log('Fetching patients...');
        const patientsData = await dicomService.getPatientsWithDicom();
        console.log('Fetched patients data:', patientsData);
        
        if (!Array.isArray(patientsData)) {
          console.error('Received invalid patients data format:', patientsData);
          throw new Error('Invalid patients data format');
        }
        
        if (patientsData.length === 0) {
          console.log('No patients found with DICOM data');
        }
        
        setPatients(patientsData);

        // If we have a studyId, find and select the corresponding patient
        if (studyId) {
          console.log('Looking for patient with study:', studyId);
          const patientWithStudy = patientsData.find((patient: Patient) => {
            console.log('Checking patient:', patient.patient_id, 'studies:', patient.studies);
            return patient.studies.some((study: Study) => study.studyInstanceUID === studyId);
          });
          
          if (patientWithStudy) {
            console.log('Found patient with study:', patientWithStudy);
            setState(prev => ({
              ...prev,
              selectedPatientId: patientWithStudy._id,
              selectedStudyId: studyId
            }));
          } else {
            console.log('No patient found with study:', studyId);
          }
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load patient list'
        }));
      }
    };

    fetchPatients();
  }, [studyId]); // Add studyId as dependency

  const handleWindowLevelChange = (center: number, width: number) => {
    setState(prev => ({
      ...prev,
      windowLevel: { windowCenter: center, windowWidth: width }
    }));
  };

  const handleSliceChange = (slice: number) => {
    setState(prev => ({ ...prev, currentSlice: slice }));
  };

  const handleLayoutChange = (newLayout: 'single' | 'mpr') => {
    setState(prev => ({ ...prev, layout: newLayout }));
  };

  const handlePatientSelect = async (patientId: string) => {
    console.log('Selected patient:', patientId);
    const selectedPatient = patients.find(p => p._id === patientId);
    
    if (selectedPatient) {
      setState(prev => ({
        ...prev,
        selectedPatientId: patientId,
        selectedStudyId: '',
        selectedSeriesId: ''
      }));
    }
  };

  const handleStudySelect = async (studyId: string) => {
    console.log('Selected study:', studyId);
    try {
      const studies = await dicomService.searchStudies(`study:${studyId}`);
      if (studies.length > 0) {
        setStudy(studies[0]);
        setState(prev => ({
          ...prev,
          selectedStudyId: studyId,
          selectedSeriesId: ''
        }));
      }
    } catch (error) {
      console.error('Failed to load study:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load study'
      }));
    }
  };

  const handleSeriesSelect = async (seriesId: string) => {
    setState(prev => ({ ...prev, selectedSeriesId: seriesId }));
    const series = findSelectedSeries(study, seriesId);
    if (series?.filePath) {
      await loadSeries(series.filePath);
    } else {
      setState(prev => ({
        ...prev,
        error: 'No file path available for this series'
      }));
    }
  };

  const loadSeries = async (filePath: string) => {
    try {
      console.log('Loading series from path:', filePath);
      const response = await fetch(filePath);
      const imageArrayBuffer = await response.arrayBuffer();
      
      if (state.layout === 'mpr') {
        console.log('Loading MPR views');
        await loadMPRViews(filePath);
      } else {
        console.log('Loading single view');
        await loadSingleView(imageArrayBuffer);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load series'
      }));
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!renderingEngine) { // Only initialize if we haven't already
        try {
          console.log('Initializing Cornerstone');
          await csInit();
          await csToolsInit();

          if (!mounted) return;

          console.log('Creating rendering engine');
          const engine = new RenderingEngine('myRenderingEngine');
          setRenderingEngine(engine);

          console.log('Adding tools');
          addTool(PanTool);
          addTool(ZoomTool);

          csToolsUtils.triggerEvent('pan', { 
            mouseButtonMask: 1 
          });
          
          console.log('Tools initialized successfully');
        } catch (error) {
          console.error('Error initializing Cornerstone:', error);
          if (mounted) {
            setState(prev => ({
              ...prev,
              error: 'Failed to initialize viewer'
            }));
          }
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (renderingEngine) {
        renderingEngine.destroy();
      }
    };
  }, [renderingEngine]); // Only re-run if renderingEngine changes

  // Initialize MPR views
  useEffect(() => {
    if (state.layout === 'mpr') {
      const initMPR = async () => {
        if (!axialRef.current || !sagittalRef.current || !coronalRef.current) return;

        // Initialize each view
        await csInit();
        await csToolsInit();

        // Load current series if any
        if (state.selectedSeriesId) {
          const series = findSelectedSeries(study, state.selectedSeriesId);
          if (series?.filePath) {
            await loadMPRViews(series.filePath);
          } else {
            setState(prev => ({
              ...prev,
              error: 'No file path available for this series'
            }));
          }
        }
      };

      initMPR();
    }
  }, [state.layout]);

  const loadMPRViews = async (filePath: string) => {
    try {
      // Convert file path to ArrayBuffer
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      
      if (!renderingEngine) throw new Error('Rendering engine not initialized');

      // Create volume and load it
      const volumeId = 'myVolume';
      await volumeLoader.createAndCacheVolume(volumeId, { imageIds: [arrayBuffer] });
      const volume = await cache.getVolume(volumeId);

      if (!volume) throw new Error('Failed to create volume');

      // Create viewports
      const viewportIds = ['axial', 'sagittal', 'coronal'];
      const viewportInputArray = [
        {
          viewportId: 'axial',
          type: 'ORTHOGRAPHIC',
          element: axialRef.current,
          defaultOptions: {
            orientation: { sliceNormal: [0, 0, 1], viewUp: [0, -1, 0] }
          },
        },
        {
          viewportId: 'sagittal',
          type: 'ORTHOGRAPHIC',
          element: sagittalRef.current,
          defaultOptions: {
            orientation: { sliceNormal: [1, 0, 0], viewUp: [0, 0, 1] }
          },
        },
        {
          viewportId: 'coronal',
          type: 'ORTHOGRAPHIC',
          element: coronalRef.current,
          defaultOptions: {
            orientation: { sliceNormal: [0, 1, 0], viewUp: [0, 0, 1] }
          },
        },
      ];

      renderingEngine.setViewports(viewportInputArray);

      // Set the volume to display
      await setVolumesForViewports(
        renderingEngine,
        [{ volumeId }],
        viewportIds
      );

      renderingEngine.render();

      setState(prev => ({
        ...prev,
        totalImages: 1,
        currentImageIndex: 0
      }));
    } catch (error) {
      console.error('Failed to load MPR views:', error);
      setState(prev => ({ ...prev, error: 'Failed to load MPR views' }));
    }
  };

  const loadSingleView = async (imageArrayBuffer: ArrayBuffer) => {
    try {
      if (!renderingEngine || !viewerRef.current) {
        throw new Error('Rendering engine or viewer element not initialized');
      }

      // Create and cache the image
      const imageId = 'myImage';
      await imageLoader.createAndCacheLocalImage(imageId, imageArrayBuffer);
      
      // Create the viewport
      const viewport = renderingEngine.getViewport('stack') as StackViewport;
      
      if (!viewport) {
        const viewportInput = {
          viewportId: 'stack',
          type: 'STACK',
          element: viewerRef.current,
        };
        renderingEngine.enableElement(viewportInput);
      }

      // Set the image to display
      await viewport.setStack([imageId]);
      renderingEngine.render();

      setState(prev => ({
        ...prev,
        totalImages: 1,
        currentImageIndex: 0
      }));
    } catch (error) {
      console.error('Failed to load single view:', error);
      setState(prev => ({ ...prev, error: 'Failed to load single view' }));
    }
  };

  const handleScroll = (event: WheelEvent) => {
    if (event.deltaY > 0 && state.currentImageIndex < state.totalImages - 1) {
      setState(prev => ({ ...prev, currentImageIndex: prev.currentImageIndex + 1 }));
    } else if (event.deltaY < 0 && state.currentImageIndex > 0) {
      setState(prev => ({ ...prev, currentImageIndex: prev.currentImageIndex - 1 }));
    }
  };

  if (state.error) {
    console.error('Rendering error state:', state.error);
    return <ErrorMessage>{state.error}</ErrorMessage>;
  }

  console.log('Rendering viewer with study:', study);

  return (
    <ViewerContainer>
      <SelectionBar>
        {/* Patient Selection */}
        <div>
          <label>Patient: </label>
          <Select 
            value={state.selectedPatientId} 
            onChange={(e) => handlePatientSelect(e.target.value)}
          >
            <option value="">Select Patient</option>
            {patients.map(patient => (
              <option key={patient._id} value={patient._id}>
                {patient.patient_id} - {patient.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Study Selection - Only show if patient is selected */}
        {state.selectedPatientId && (
          <div>
            <label>Study: </label>
            <Select
              value={state.selectedStudyId}
              onChange={(e) => handleStudySelect(e.target.value)}
            >
              <option value="">Select Study</option>
              {patients
                .find(p => p._id === state.selectedPatientId)
                ?.studies.map(study => (
                  <option key={study.studyInstanceUID} value={study.studyInstanceUID}>
                    {new Date(study.studyDate).toLocaleDateString()} 
                  </option>
                ))}
            </Select>
          </div>
        )}

        {/* Series Selection - Only show if study is selected */}
        {study && (
          <div>
            <label>Series: </label>
            <Select
              value={state.selectedSeriesId}
              onChange={(e) => handleSeriesSelect(e.target.value)}
            >
              <option value="">Select Series</option>
              {study.series.map(series => (
                <option key={series.series_instance_uid} value={series.series_instance_uid}>
                  {series.series_description || `Series ${series.series_number}`} ({series.modality})
                </option>
              ))}
            </Select>
          </div>
        )}
      </SelectionBar>

      {/* Show study info and viewer only if a study is loaded */}
      {study ? (
        <>
          <h2>{study.description}</h2>
          <div>Patient ID: {study.patient_id}</div>
          <div>Study Date: {new Date(study.study_date).toLocaleDateString()}</div>
          
          {/* Viewer controls and grid */}
          <LayoutControls>
            <LayoutButton 
              active={state.layout === 'single'} 
              onClick={() => handleLayoutChange('single')}
            >
              Single View
            </LayoutButton>
            <LayoutButton 
              active={state.layout === 'mpr'} 
              onClick={() => handleLayoutChange('mpr')}
            >
              MPR Views
            </LayoutButton>
          </LayoutControls>

          <WindowLevelControls
            center={state.windowLevel.windowCenter}
            width={state.windowLevel.windowWidth}
            onChange={handleWindowLevelChange}
          />

          <ViewerGrid layout={state.layout}>
            {state.layout === 'single' ? (
              <ViewerPanel>
                <ViewerHeader>
                  <span>Main View</span>
                  <span>{state.currentImageIndex + 1} / {state.totalImages}</span>
                </ViewerHeader>
                <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
              </ViewerPanel>
            ) : (
              <>
                <ViewerPanel>
                  <ViewerHeader>Axial</ViewerHeader>
                  <MPRViewer
                    seriesId={state.selectedSeriesId}
                    orientation="axial"
                    windowCenter={state.windowLevel.windowCenter}
                    windowWidth={state.windowLevel.windowWidth}
                    currentSlice={state.currentSlice}
                    onSliceChange={handleSliceChange}
                  />
                </ViewerPanel>
                <ViewerPanel>
                  <ViewerHeader>Sagittal</ViewerHeader>
                  <MPRViewer
                    seriesId={state.selectedSeriesId}
                    orientation="sagittal"
                    windowCenter={state.windowLevel.windowCenter}
                    windowWidth={state.windowLevel.windowWidth}
                    currentSlice={state.currentSlice}
                    onSliceChange={handleSliceChange}
                  />
                </ViewerPanel>
                <ViewerPanel>
                  <ViewerHeader>Coronal</ViewerHeader>
                  <MPRViewer
                    seriesId={state.selectedSeriesId}
                    orientation="coronal"
                    windowCenter={state.windowLevel.windowCenter}
                    windowWidth={state.windowLevel.windowWidth}
                    currentSlice={state.currentSlice}
                    onSliceChange={handleSliceChange}
                  />
                </ViewerPanel>
              </>
            )}
          </ViewerGrid>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          {patients.length > 0 ? 
            'Select a patient and study to view images' : 
            'Loading patient list...'}
        </div>
      )}
    </ViewerContainer>
  );
};

export default DicomViewer; 