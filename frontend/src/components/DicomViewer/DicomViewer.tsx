import React, { useEffect, useRef, useState } from 'react';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import styled from 'styled-components';
import dicomService from '../../services/dicomService';
import { MPRViewer } from './components/MPRViewer';
import { WindowLevelControls } from './components/WindowLevelControls';
import { DicomStudy, DicomSeries } from '../../types/dicom';
import { WindowLevel } from '../../types/medical';

// Enhanced styled components
const ViewerContainer = styled.div`
  padding: 2rem;
  background: ${props => props.theme.colors.background.primary};
  min-height: 100vh;
`;

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

const DicomViewer: React.FC = () => {
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

  const [patients, setPatients] = useState<Array<{
    _id: string;
    pid: string;
    name: string;
    studies: Array<{
      studyInstanceUID: string;
      studyDate: string;
      series: Array<{
        seriesInstanceUID: string;
        modality: string;
        filePath: string;
      }>;
    }>;
  }>>([]);

  const viewerRef = useRef<HTMLDivElement>(null);
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);

  // Get current selections
  const currentPatient = patients.find(p => p._id === state.selectedPatientId);
  const currentStudy = currentPatient?.studies.find(s => s.studyInstanceUID === state.selectedStudyId);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patientsData = await dicomService.getPatientsWithDicom();
        setPatients(patientsData);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load patient list'
        }));
      }
    };

    fetchPatients();
  }, []);

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

  const handlePatientSelect = (patientId: string) => {
    setState(prev => ({
      ...prev,
      selectedPatientId: patientId,
      selectedStudyId: '',
      selectedSeriesId: ''
    }));
  };

  const handleStudySelect = (studyId: string) => {
    setState(prev => ({
      ...prev,
      selectedStudyId: studyId,
      selectedSeriesId: ''
    }));
  };

  const handleSeriesSelect = async (seriesId: string) => {
    setState(prev => ({ ...prev, selectedSeriesId: seriesId }));
    const series = findSelectedSeries(seriesId);
    if (series) {
      await loadSeries(series);
    }
  };

  const findSelectedSeries = (seriesId: string) => {
    return currentStudy?.series.find(s => s.seriesInstanceUID === seriesId);
  };

  const loadSeries = async (series: { filePath: string }) => {
    try {
      const imageArrayBuffer = await dicomService.loadLocalDicom(series.filePath);
      if (state.layout === 'mpr') {
        await loadMPRViews(series);
      } else {
        await loadSingleView(imageArrayBuffer);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load series'
      }));
    }
  };

  // Initialize cornerstone tools
  useEffect(() => {
    cornerstoneTools.init();
    cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.AngleTool);
  }, []);

  // Initialize MPR views
  useEffect(() => {
    if (state.layout === 'mpr') {
      const initMPR = async () => {
        if (!axialRef.current || !sagittalRef.current || !coronalRef.current) return;

        // Initialize each view
        await cornerstone.enable(axialRef.current);
        await cornerstone.enable(sagittalRef.current);
        await cornerstone.enable(coronalRef.current);

        // Load current series if any
        if (state.selectedSeriesId) {
          const series = findSelectedSeries(state.selectedSeriesId);
          if (series) {
            await loadMPRViews(series);
          }
        }
      };

      initMPR();
    }
  }, [state.layout]);

  const loadMPRViews = async (series: any) => {
    try {
      const imageArrayBuffer = await dicomService.loadLocalDicom(series.filePath);
      const volumeData = await cornerstone.createVolume(imageArrayBuffer);

      // Display MPR views
      if (axialRef.current && sagittalRef.current && coronalRef.current) {
        await cornerstone.displayVolume(axialRef.current, volumeData, { orientation: 'axial' });
        await cornerstone.displayVolume(sagittalRef.current, volumeData, { orientation: 'sagittal' });
        await cornerstone.displayVolume(coronalRef.current, volumeData, { orientation: 'coronal' });
      }
    } catch (error) {
      console.error('Failed to load MPR views:', error);
      setState(prev => ({ ...prev, error: 'Failed to load MPR views' }));
    }
  };

  const loadSingleView = async (imageArrayBuffer: ArrayBuffer) => {
    try {
      const imageStack = await cornerstone.createImageStack(imageArrayBuffer);
      
      setState(prev => ({
        ...prev,
        totalImages: imageStack.length,
        currentImageIndex: 0
      }));

      if (viewerRef.current) {
        await cornerstone.enable(viewerRef.current);
        viewerRef.current.addEventListener('wheel', handleScroll);
        await cornerstone.displayImage(viewerRef.current, imageStack[0]);
      }
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
    return <div>Error: {state.error}</div>;
  }

  return (
    <ViewerContainer>
      <h2>DICOM Viewer</h2>

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
                {patient.pid} - {patient.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Study Selection */}
        {currentPatient && (
          <div>
            <label>Study: </label>
            <Select
              value={state.selectedStudyId}
              onChange={(e) => handleStudySelect(e.target.value)}
            >
              <option value="">Select Study</option>
              {currentPatient.studies.map(study => (
                <option key={study.studyInstanceUID} value={study.studyInstanceUID}>
                  {new Date(study.studyDate).toLocaleDateString()} 
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Series Selection */}
        {currentStudy && (
          <div>
            <label>Series: </label>
            <Select
              value={state.selectedSeriesId}
              onChange={(e) => handleSeriesSelect(e.target.value)}
            >
              <option value="">Select Series</option>
              {currentStudy.series.map(series => (
                <option key={series.seriesInstanceUID} value={series.seriesInstanceUID}>
                  {series.modality}
                </option>
              ))}
            </Select>
          </div>
        )}
      </SelectionBar>

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
    </ViewerContainer>
  );
};

export default DicomViewer; 