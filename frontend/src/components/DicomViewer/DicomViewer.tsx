import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
import { WelcomeView } from './components/WelcomeView';
import { convertStudy } from '../../types/dicom';

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
  width: 100%;
  height: 100%;
  min-height: 500px;
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

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 2;
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
  const series = study?.series.find(s => 
    s.series_instance_uid === seriesId || 
    s.series_uid === seriesId
  );

  if (series) {
    // Get relative path from series or first instance
    series.filePath = series.filePath || series.instances?.[0]?.file_path;
    
    if (series.filePath) {
      // Ensure forward slashes
      series.filePath = series.filePath.replace(/\\/g, '/');
      // Remove any Windows drive letter prefix if present
      series.filePath = series.filePath.replace(/^[A-Za-z]:\\/, '');
      // Remove any leading slashes
      series.filePath = series.filePath.replace(/^\/+/, '');
      
      console.log('[DicomViewer] Using relative path:', series.filePath);
    }
  }

  return series;
};

export const DicomViewer: React.FC<DicomViewerProps> = () => {
  const location = useLocation();
  const studyId = location.state?.studyId;
  console.log('DicomViewer: location state studyId =', studyId);
  
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

  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  const loadSeries = useCallback(async (filePath: string) => {
    try {
      console.log('[DicomViewer] Preparing to request image from Node using path:', filePath);
      
      if (!renderingEngine) {
        console.error('Rendering engine not initialized');
        return;
      }

      console.log('[DicomViewer] getImageData() called with path:', filePath);
      const imageArrayBuffer = await dicomService.getImageData(filePath);
      console.log('[DicomViewer] Got image data, size:', imageArrayBuffer.byteLength);

      // Add this debug check
      if (!(imageArrayBuffer instanceof ArrayBuffer)) {
        console.error('Received data is not an ArrayBuffer:', imageArrayBuffer);
        throw new Error('Invalid image data format');
      }

      if (state.layout === 'mpr') {
        console.log('Loading MPR views');
        await loadMPRViews(filePath);
      } else {
        console.log('Loading single view');
        await loadSingleView(filePath);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load series'
      }));
    }
  }, [renderingEngine, state.layout]);

  useEffect(() => {
    let mounted = true;

    const loadStudy = async () => {
      if (!studyId) return;

      try {
        console.log('Loading study with ID:', studyId);
        const studies = await dicomService.searchStudies(`study:${studyId}`);
        
        if (!mounted) return;

        const studyWithSeries = studies.find(s => s.series && s.series.length > 0);
        
        if (!studyWithSeries) {
          throw new Error('Study not found or has no series data');
        }

        setStudy(convertStudy(studyWithSeries));
        
        if (studyWithSeries.series?.length > 0) {
          const firstSeries = studyWithSeries.series[0];
          const seriesId = firstSeries.series_uid || firstSeries.series_instance_uid;
          
          if (!seriesId) {
            throw new Error('Invalid series data');
          }

          setState(prev => ({
            ...prev,
            selectedSeriesId: seriesId
          }));
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: err instanceof Error ? err.message : 'Failed to load study'
          }));
        }
      }
    };

    loadStudy();

    return () => {
      mounted = false;
    };
  }, [studyId]);

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
        // Convert the study before setting it
        setStudy(convertStudy(studies[0]));
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

  // Only initialize Cornerstone if we have a study
  useEffect(() => {
    let mounted = true;
    let engine: RenderingEngine | null = null;
    
    const initialize = async () => {
      if (!studyId) return;

      try {
        console.log('Initializing Cornerstone');
        await csInit();
        await csToolsInit();

        if (!mounted) return;

        console.log('Creating rendering engine');
        engine = new RenderingEngine('myRenderingEngine');
        setRenderingEngine(engine);

        console.log('Adding tools');
        addTool(PanTool);
        addTool(ZoomTool);

        csToolsUtils.triggerEvent('pan', { 
          mouseButtonMask: 1 
        });
      } catch (error) {
        console.error('Error initializing Cornerstone:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: 'Failed to initialize viewer'
          }));
        }
      }
    };

    initialize();

    // Cleanup function
    return () => {
      mounted = false;
      if (engine) {
        console.log('Cleaning up rendering engine');
        engine.destroy();
        setRenderingEngine(null);
      }
    };
  }, [studyId]); // Only run when studyId changes

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

  const loadSingleView = async (filePath: string) => {
    try {
      setIsLoading(true);
      if (!renderingEngine || !viewerRef.current) {
        throw new Error('Rendering engine or viewer element not initialized');
      }

      console.log('[DicomViewer] Loading single view for:', filePath);

      // Get the image data
      const imageArrayBuffer = await dicomService.getImageData(filePath);
      console.log('[DicomViewer] Got image data, creating image');

      // Create a unique imageId
      const imageId = `dicom://${filePath}`;
      
      // Cache the image data
      await imageLoader.createAndCacheLocalImage(imageId, imageArrayBuffer);
      console.log('[DicomViewer] Image cached');

      // Create or get the viewport
      let viewport = renderingEngine.getViewport('stack') as StackViewport;
      
      if (!viewport) {
        console.log('[DicomViewer] Creating new viewport');
        const viewportInput = {
          viewportId: 'stack',
          type: 'STACK',
          element: viewerRef.current,
          defaultOptions: {
            background: [0, 0, 0], // Black background
          },
        };
        renderingEngine.enableElement(viewportInput);
        viewport = renderingEngine.getViewport('stack') as StackViewport;
      }

      // Set the image stack
      console.log('[DicomViewer] Setting image stack');
      await viewport.setStack([imageId]);
      
      // Reset camera and render using the rendering engine
      viewport.setCamera({ reset: true });  // Use setCamera with reset option
      renderingEngine.render();  // Render using the engine
      
      console.log('[DicomViewer] View rendered');

      setState(prev => ({
        ...prev,
        totalImages: 1,
        currentImageIndex: 0,
        error: null
      }));
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Failed to load single view:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load single view' 
      }));
    }
  };

  const handleScroll = (event: WheelEvent) => {
    if (event.deltaY > 0 && state.currentImageIndex < state.totalImages - 1) {
      setState(prev => ({ ...prev, currentImageIndex: prev.currentImageIndex + 1 }));
    } else if (event.deltaY < 0 && state.currentImageIndex > 0) {
      setState(prev => ({ ...prev, currentImageIndex: prev.currentImageIndex - 1 }));
    }
  };

  // Add this effect to load series when available
  useEffect(() => {
    const loadInitialSeries = async () => {
      if (!study || !state.selectedSeriesId) {
        console.log('Waiting for study and series ID');
        return;
      }

      console.log('Loading initial series:', state.selectedSeriesId);
      const series = findSelectedSeries(study, state.selectedSeriesId);
      console.log('Found series:', series);

      if (series?.filePath) {
        console.log('Found series path:', series.filePath);
        await loadSeries(series.filePath);
      } else {
        console.error('Missing file path. Series data:', series);
        console.error('Full study data:', study);
        setState(prev => ({
          ...prev,
          error: 'No file path available for this series'
        }));
      }
    };

    loadInitialSeries();
  }, [study, state.selectedSeriesId, loadSeries]);

  // Early return for welcome view
  if (!studyId) {
    return <WelcomeView />;
  }

  if (state.error) {
    return <ErrorMessage>{state.error}</ErrorMessage>;
  }

  console.log('Rendering viewer with study:', study);

  return (
    <ViewerContainer>
      {/* Only show viewer UI when we have a study */}
      <h2>{study?.description}</h2>
      <div>Patient ID: {study?.patient_id}</div>
      <div>Study Date: {study?.study_date && new Date(study.study_date).toLocaleDateString()}</div>
      
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
            <div 
              ref={viewerRef} 
              style={{ 
                width: '100%', 
                height: '100%',
                minHeight: '500px',
                background: '#000',
                position: 'relative'
              }} 
            />
            {isLoading && (
              <LoadingOverlay>
                Loading DICOM image...
              </LoadingOverlay>
            )}
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
    </ViewerContainer>
  );
};

export default DicomViewer; 