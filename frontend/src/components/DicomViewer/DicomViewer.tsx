import React, { useEffect, useRef, useState } from 'react';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import styled from 'styled-components';
import { dicomService } from '../../services/dicomService';
import { MPRView } from './components/MPRView';

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

interface PatientData {
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
}

const WindowLevelPresets = {
  'Brain': { center: 40, width: 80 },
  'Bone': { center: 400, width: 2000 },
  'Lung': { center: -600, width: 1500 },
  'Soft Tissue': { center: 50, width: 350 }
};

interface ViewportState {
  element: HTMLElement | null;
  imageIds: string[];
  currentImageIndex: number;
}

const DicomViewer: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [selectedPatientPid, setSelectedPatientPid] = useState('');
  const [selectedStudyUid, setSelectedStudyUid] = useState('');
  const [selectedSeriesUid, setSelectedSeriesUid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState('wwwc'); // window/level by default
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [layout, setLayout] = useState<'single' | 'mpr'>('single');
  const [viewports, setViewports] = useState<Record<string, ViewportState>>({});
  
  // Add refs for MPR views
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);

  // 1. Load patients with DICOM data
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (!response.ok) throw new Error('Failed to fetch patients');
        const data = await response.json();
        // Only keep patients with studies
        const patientsWithDicom = data.filter((p: PatientData) => p.studies?.length > 0);
        setPatients(patientsWithDicom);
      } catch (error) {
        console.error(error);
        setError('Failed to load patients');
      }
    };
    fetchPatients();
  }, []);

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
    if (layout === 'mpr') {
      const initMPR = async () => {
        if (!axialRef.current || !sagittalRef.current || !coronalRef.current) return;

        // Initialize each view
        await cornerstone.enable(axialRef.current);
        await cornerstone.enable(sagittalRef.current);
        await cornerstone.enable(coronalRef.current);

        // Load current series if any
        if (selectedSeriesUid) {
          const series = findSelectedSeries(selectedSeriesUid);
          if (series) {
            await loadMPRViews(series);
          }
        }
      };

      initMPR();
    }
  }, [layout]);

  // 2. Handle selection changes
  const handlePatientChange = (pid: string) => {
    setSelectedPatientPid(pid);
    setSelectedStudyUid('');
    setSelectedSeriesUid('');
  };

  const handleStudyChange = (studyUid: string) => {
    setSelectedStudyUid(studyUid);
    setSelectedSeriesUid('');
  };

  const handleSeriesChange = async (seriesUid: string) => {
    setSelectedSeriesUid(seriesUid);
    
    const series = findSelectedSeries(seriesUid);
    if (!series) return;

    try {
      // Load image stack
      const imageArrayBuffer = await dicomService.loadLocalDicom(series.filePath);
      const imageStack = await cornerstone.createImageStack(imageArrayBuffer);
      
      setTotalImages(imageStack.length);
      setCurrentImageIndex(0);

      if (viewerRef.current) {
        await cornerstone.enable(viewerRef.current);
        viewerRef.current.addEventListener('wheel', handleScroll);
        await cornerstone.displayImage(viewerRef.current, imageStack[0]);
      }
    } catch (error) {
      console.error('Failed to load DICOM:', error);
      setError('Failed to load DICOM image');
    }
  };

  const setTool = (toolName: string) => {
    setActiveTool(toolName);
    cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
  };

  const applyWindowLevel = (center: number, width: number) => {
    if (!viewerRef.current) return;
    const viewport = cornerstone.getViewport(viewerRef.current);
    viewport.voi.windowCenter = center;
    viewport.voi.windowWidth = width;
    cornerstone.setViewport(viewerRef.current, viewport);
  };

  const handleScroll = (event: WheelEvent) => {
    if (event.deltaY > 0 && currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else if (event.deltaY < 0 && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

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
      setError('Failed to load MPR views');
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ViewerContainer>
      <h2>DICOM Viewer</h2>

      <LayoutControls>
        <LayoutButton 
          active={layout === 'single'} 
          onClick={() => setLayout('single')}
        >
          Single View
        </LayoutButton>
        <LayoutButton 
          active={layout === 'mpr'} 
          onClick={() => setLayout('mpr')}
        >
          MPR Views
        </LayoutButton>
      </LayoutControls>

      <ViewerGrid layout={layout}>
        {layout === 'single' ? (
          <ViewerPanel>
            <ViewerHeader>
              <span>Main View</span>
              <span>{currentImageIndex + 1} / {totalImages}</span>
            </ViewerHeader>
            <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
          </ViewerPanel>
        ) : (
          <>
            <ViewerPanel>
              <ViewerHeader>Axial</ViewerHeader>
              <div ref={axialRef} style={{ width: '100%', height: '100%' }} />
            </ViewerPanel>
            <ViewerPanel>
              <ViewerHeader>Sagittal</ViewerHeader>
              <div ref={sagittalRef} style={{ width: '100%', height: '100%' }} />
            </ViewerPanel>
            <ViewerPanel>
              <ViewerHeader>Coronal</ViewerHeader>
              <div ref={coronalRef} style={{ width: '100%', height: '100%' }} />
            </ViewerPanel>
          </>
        )}
      </ViewerGrid>
    </ViewerContainer>
  );
};

export default DicomViewer; 