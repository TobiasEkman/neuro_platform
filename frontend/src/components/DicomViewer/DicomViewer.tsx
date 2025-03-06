import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import dicomService, { DicomService } from '../../services/dicomService';
import { DicomStudy, DicomSeries, DicomInstance, SearchResult } from '../../types/medical';
import { Patient } from '../../types/patient';
import {
  ViewerContainer,
  ViewerGrid,
  ViewerPanel,
  Canvas,
  Controls,
  SliceSlider,
  ViewerLabel,
  SegmentationOverlay,
  SideNav,
  SideNavItem
} from './styles';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { ViewportType, OrientationAxis } from '../../types/cornerstoneEnums';
import { 
  RenderingEngine,
  Types,
  Enums,
  cache as cornerstoneCache
} from '@cornerstonejs/core';
import {
  ToolGroupManager
} from '@cornerstonejs/tools';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaSearch, FaBrain, FaChartLine } from 'react-icons/fa';

// Definiera verktygskonstanter
const WindowLevelToolName = 'WindowLevel';
const PanToolName = 'Pan';
const ZoomToolName = 'Zoom';
const StackScrollToolName = 'StackScroll';

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

const ImageViewer = styled.div`
  flex: 1;
  position: relative;
  background: black;
`;

const ListTitle = styled.h3`
  margin: 0 0 1rem 0;
  padding: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const InfoPanel = styled.div`
  padding: 1rem;
  background: ${props => props.theme.colors.background.primary};
  border-radius: 4px;
  margin-top: 1rem;
`;

const SearchContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 300px;
  z-index: 1000;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background.secondary};
  color: ${props => props.theme.colors.text.primary};
`;

const SearchResultsList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.background.secondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
`;

const SearchResultItem = styled.div<{ isSelected?: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${props => props.isSelected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.background.hover};
    color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  }
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

interface VolumeDataType {
  volume: Float32Array;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  spacing?: [number, number, number];
  slices: DicomInstance[];
}

interface ImageResponse {
  pixelData: number[][];
  rows: number;
  columns: number;
  windowCenter: number;
  windowWidth: number;
  bitsAllocated: number;
  rescaleIntercept: number;
  rescaleSlope: number;
}

// Lägg till denna hjälpfunktion för window/level beräkning
const windowLevel = (pixelValue: number, width: number, center: number): number => {
  const min = center - (width / 2);
  const max = center + (width / 2);
  
  // Normalisera värdet mellan min och max
  const normalized = ((pixelValue - min) / (width)) * 255;
  
  // Begränsa värdet till 0-255
  return Math.max(0, Math.min(255, normalized));
};

// Lägg till denna hjälpfunktion för att skapa volymdata
const createVolume = async (instances: DicomInstance[]): Promise<VolumeDataType | null> => {
  try {
    // Sortera instances efter position
    const sortedInstances = [...instances].sort((a, b) => 
      (a.instance_number || 0) - (b.instance_number || 0)
    );

    // Ladda första bilden för att få dimensioner
    const firstResponse = await dicomService.getImageData(sortedInstances[0].file_path);
    const firstImage = await firstResponse.json() as ImageResponse;
    
    // Skapa volym array
    const volume = new Float32Array(
      firstImage.rows * firstImage.columns * sortedInstances.length
    );

    // Fyll volymen med data från alla slices
    for (let i = 0; i < sortedInstances.length; i++) {
      const response = await dicomService.getImageData(sortedInstances[i].file_path);
      const imageData = await response.json() as ImageResponse;
      
      // Kopiera denna slice till volymen
      for (let y = 0; y < imageData.rows; y++) {
        for (let x = 0; x < imageData.columns; x++) {
          const volumeIndex = i * (imageData.rows * imageData.columns) + y * imageData.columns + x;
          volume[volumeIndex] = imageData.pixelData[y][x];
        }
      }
    }

    return {
      volume,
      dimensions: {
        width: firstImage.columns,
        height: firstImage.rows,
        depth: sortedInstances.length
      },
      slices: sortedInstances
    };
  } catch (error) {
    console.error('Failed to create volume:', error);
    return null;
  }
};

interface DicomViewerProps {
  seriesId: string | undefined;
  segmentationMask: number[] | null;
  showSegmentation: boolean;
  onSeriesSelect?: (seriesId: string) => void;  // Callback för att meddela TumorAnalysis
}

interface ViewportInput {
  viewportId: string;
  element: HTMLCanvasElement;
  type: ViewportType;
  defaultOptions?: {
    orientation?: string;
  };
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
  
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [currentSeries, setCurrentSeries] = useState<any>(null);
  const [currentSlices, setCurrentSlices] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [series, setSeries] = useState<DicomSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [currentNotes, setCurrentNotes] = useState<Record<string, any>>({});
  const [volumeData, setVolumeData] = useState<VolumeDataType | null>(null);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isWindowLeveling, setIsWindowLeveling] = useState(false);
  const [windowLevelStartPos, setWindowLevelStartPos] = useState({ x: 0, y: 0 });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [imageCache, setImageCache] = useState<Map<number, ImageData>>(new Map());
  const BATCH_SIZE = 10;
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [currentScale, setCurrentScale] = useState(1);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalPixelDataRef = useRef<ImageData | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  


  useEffect(() => {
    loadPatients();
    
    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowRight':
          navigateSlices(1);
          break;
        case 'ArrowLeft':
          navigateSlices(-1);
          break;
        case 'w':
          setIsWindowLeveling(true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w') {
        setIsWindowLeveling(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const setupImageControls = () => {
    // Implementera kontroller
  };

  const loadPatients = async () => {
    try {
      console.log('Loading patients...');
      const fetchedPatients = await dicomService.getPatients({ withDicom: true });
      console.log('Fetched patients:', fetchedPatients);
      
      if (Array.isArray(fetchedPatients)) {
        setPatients(fetchedPatients);
        console.log('Set patients state:', fetchedPatients);
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
      console.log('Loading studies for patient:', patientId);
      const fetchedStudies = await dicomService.getStudiesForPatient(patientId);
      console.log('Fetched studies:', fetchedStudies);
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
      console.log('Loading series for study:', studyId);
      const study = await dicomService.getStudy(studyId);
      console.log('Fetched study with series:', study);
      setSeries(study.series);
      setSelectedSeriesId(null);
      setCurrentSlices([]);
      setCurrentSlice(-1);
    } catch (error) {
      console.error('Failed to load series:', error);
    }
  };

  // Uppdatera handleSeriesSelect för att ladda volymdata
  const handleSeriesSelect = async (seriesId: string) => {
    try {
      setSelectedSeriesId(seriesId);
      
      const selectedSeries = series.find(s => s.series_instance_uid === seriesId);
      if (!selectedSeries || !selectedSeries.instances) {
        throw new Error('No instances found for series');
      }

      // Skapa volymen
      const volumeData = await createVolume(selectedSeries.instances);
      if (!volumeData) {
        throw new Error('Failed to create volume');
      }

      // Uppdatera state
      setVolumeData(volumeData);
      setCurrentSeries(selectedSeries);
      setCurrentSlices(selectedSeries.instances);
      setCurrentSlice(0);

      // Visa första bilden
      await loadAndDisplayImage(selectedSeries.instances[0]);

      // Rendera MPR-vyer
      renderMPR();

      // Meddela TumorAnalysis om vald serie
      if (onSeriesSelect) {
        onSeriesSelect(seriesId);
      }

    } catch (error) {
      console.error('Failed to load series:', error);
      setSelectedSeriesId(null);
    }
  };

  const loadAndDisplayImage = async (instance: DicomInstance) => {
    try {
      const response = await dicomService.getImageData(instance.file_path);
      const rawData = await response.text();
      console.log('[DicomViewer] Raw response data:', rawData.substring(0, 200));

      const imageData = JSON.parse(rawData) as ImageResponse;
      console.log('[DicomViewer] Parsed data:', {
        hasData: !!imageData,
        structure: {
          rows: typeof imageData?.rows,
          columns: typeof imageData?.columns,
          pixelData: Array.isArray(imageData?.pixelData)
        },
        sample: imageData?.pixelData?.[0]?.[0]
      });

      if (!imageData.rows || !imageData.columns || !imageData.pixelData) {
        throw new Error('Invalid image data received');
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Säkerställ att vi har heltal
        const width = Math.floor(imageData.columns);
        const height = Math.floor(imageData.rows);

        console.log('[DicomViewer] Creating canvas:', width, 'x', height);
        
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Skapa ImageData med korrekta dimensioner
        const imgData = new ImageData(width, height);
        
        // Kopiera pixel data
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const value = Math.floor(imageData.pixelData[y][x]);
            
            imgData.data[idx] = value;     // R
            imgData.data[idx + 1] = value; // G
            imgData.data[idx + 2] = value; // B
            imgData.data[idx + 3] = 255;   // A
          }
        }

        // Spara för window/level
        originalPixelDataRef.current = imgData;
        setWindowWidth(imageData.windowWidth);
        setWindowCenter(imageData.windowCenter);

        ctx.putImageData(imgData, 0, 0);
      }
    } catch (error) {
      console.error('[DicomViewer] Error:', error);
    }
  };

  const applyWindowLevel = (width: number, center: number) => {
    if (!canvasRef.current || !originalPixelDataRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(originalPixelDataRef.current);
    const data = imageData.data;
    const original = originalPixelDataRef.current.data;

    for (let i = 0; i < data.length; i += 4) {
      const pixelValue = original[i];
      const windowedValue = windowLevel(pixelValue, width, center);
      
      data[i] = windowedValue;     // R
      data[i + 1] = windowedValue; // G
      data[i + 2] = windowedValue; // B
      data[i + 3] = 255;          // A
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const navigateSlices = (delta: number) => {
    const newIndex = Math.max(0, Math.min(currentSlices.length - 1, currentSlice + delta));
    if (newIndex !== currentSlice && currentSlices[newIndex]) {
      setCurrentSlice(newIndex);
      loadAndDisplayImage(currentSlices[newIndex]);
    }
  };

  const handleSearch = (query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await dicomService.searchStudies(query);
        setSearchResults(results);
        setShowSearchResults(true);
        setSelectedSearchIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSearchIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSearchIndex >= 0) {
          handleSearchResultSelect(searchResults[selectedSearchIndex]);
        }
        break;
      case 'Escape':
        setShowSearchResults(false);
        break;
    }
  };

  const handleSearchResultSelect = async (result: SearchResult) => {
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }

    switch (result.type) {
      case 'patient':
        setSelectedPatientId(result.id);
        await loadStudies(result.id);
        break;
      case 'study':
        if (result.patientId) {
          setSelectedPatientId(result.patientId);
          await loadStudies(result.patientId);
          setSelectedStudyId(result.id);
          await loadSeries(result.id);
        }
        break;
      case 'series':
        if (result.studyId) {
          await loadSeries(result.studyId);
          handleSeriesSelect(result.id);
        }
        break;
    }
  };

  // Lägg till click-outside hantering
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && 
          !searchInputRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || isWindowLeveling) { // Höger musknapp eller 'w' nedtryckt
      setIsWindowLeveling(true);
      setWindowLevelStartPos({ x: e.clientX, y: e.clientY });
    } else {
      setIsDragging(true);
      setStartX(e.clientX - translateX);
      setStartY(e.clientY - translateY);
    }
  };

  const updateImageTransform = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `
        translate(-50%, -50%) 
        translate(${translateX}px, ${translateY}px) 
        scale(${currentScale})
      `;
    }
  }, [translateX, translateY, currentScale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isWindowLeveling) {
      const deltaX = e.clientX - windowLevelStartPos.x;
      const deltaY = e.clientY - windowLevelStartPos.y;
      
      const newWidth = Math.max(1, windowWidth + deltaX);
      const newCenter = windowCenter + deltaY;
      
      setWindowWidth(newWidth);
      setWindowCenter(newCenter);
      applyWindowLevel(newWidth, newCenter);
      
      setWindowLevelStartPos({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const newTranslateX = e.clientX - startX;
      const newTranslateY = e.clientY - startY;
      
      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);
      updateImageTransform();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey) {
      // Zoom
      const delta = -Math.sign(e.deltaY) * 0.1;
      const newScale = Math.max(0.1, Math.min(5, currentScale + delta));
      setCurrentScale(newScale);
      
      if (canvasRef.current) {
        canvasRef.current.style.transform = 
          `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${newScale})`;
      }
    } else {
      // Slice navigation
      const delta = Math.sign(e.deltaY);
      const newIndex = Math.max(0, Math.min(currentSlices.length - 1, currentSlice + delta));
      
      if (newIndex !== currentSlice && currentSlices[newIndex]) {
        setCurrentSlice(newIndex);
        loadAndDisplayImage(currentSlices[newIndex]);
      }
    }
  };

  const createImageData = (pixelData: number[][], rows: number, columns: number): ImageData => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    
    const imageData = ctx.createImageData(columns, rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = (y * columns + x) * 4;
        const value = pixelData[y][x];
        imageData.data[i] = value;
        imageData.data[i + 1] = value;
        imageData.data[i + 2] = value;
        imageData.data[i + 3] = 255;
      }
    }
    return imageData;
  };

  const loadImageBatch = useCallback(async (startIndex: number) => {
    if (!seriesId) return;
    
    try {
      const response = await dicomService.getImageBatch(seriesId, startIndex, BATCH_SIZE);
      
      // Uppdatera cache med nya bilder
      const newCache = new Map(imageCache);
      response.images.forEach((img, i) => {
        const imageData = createImageData(img.pixelData, img.rows, img.columns);
        newCache.set(startIndex + i, imageData);
      });
      setImageCache(newCache);
      
    } catch (error) {
      console.error('Failed to load image batch:', error);
    }
  }, [seriesId, imageCache]);

  // Förladda nästa batch när användaren närmar sig slutet
  useEffect(() => {
    if (currentSlice > 0 && (currentSlice % BATCH_SIZE) === BATCH_SIZE - 3) {
      loadImageBatch(currentSlice + BATCH_SIZE);
    }
  }, [currentSlice, loadImageBatch]);

  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setCurrentSlice(newIndex);
    
    if (imageCache.has(newIndex)) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageCache.get(newIndex)!, 0, 0);
      }
    } else {
      const batchStart = Math.floor(newIndex / BATCH_SIZE) * BATCH_SIZE;
      loadImageBatch(batchStart);
    }
  };

  // Window/level handlers
  const handleWindowLevelChange = (center: number, width: number) => {
    setWindowCenter(center);
    setWindowWidth(width);
    applyWindowLevel(width, center);
  };

  const updateSliceUI = useCallback(() => {
    if (currentSlices.length === 0) return;
    
    const sliceInfo = `Slice ${currentSlice + 1}/${currentSlices.length}`;
    // Uppdatera UI med slice info...
  }, [currentSlice, currentSlices]);

  useEffect(() => {
    updateSliceUI();
  }, [currentSlice, currentSlices, updateSliceUI]);

  // Uppdatera Patient referenser för att matcha typerna
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    loadStudies(patient.patient_id);
  };

  const renderMPR = useCallback(() => {
    if (!volumeData) return;
    const { dimensions, spacing = [1, 1, 1] } = volumeData;

    // Sagittal view (YZ plane)
    if (sagittalRef.current) {
      const midX = Math.floor(dimensions.width / 2);
      const sagittalSlice = getSagittalSlice(midX);
      if (sagittalSlice) {
        sagittalRef.current.width = dimensions.depth * spacing[2];
        sagittalRef.current.height = dimensions.height * spacing[1];
        drawSlice(sagittalRef.current, sagittalSlice, dimensions.depth, dimensions.height);
      }
    }

    // Coronal view (XZ plane)
    if (coronalRef.current) {
      const midY = Math.floor(dimensions.height / 2);
      const coronalSlice = getCoronalSlice(midY);
      if (coronalSlice) {
        coronalRef.current.width = dimensions.width * spacing[0];
        coronalRef.current.height = dimensions.depth * spacing[2];
        drawSlice(coronalRef.current, coronalSlice, dimensions.width, dimensions.depth);
      }
    }
  }, [volumeData, windowCenter, windowWidth]);

  const getSagittalSlice = (x: number) => {
    if (!volumeData?.volume || !volumeData.dimensions) return null;
    const { width, height, depth } = volumeData.dimensions;
    
    const slice = new Float32Array(height * depth);
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        const volumeIndex = z * (width * height) + y * width + x;
        const sliceIndex = z * height + y;
        slice[sliceIndex] = volumeData.volume[volumeIndex];
      }
    }
    return slice;
  };

  const getCoronalSlice = (y: number) => {
    if (!volumeData?.volume || !volumeData.dimensions) return null;
    const { width, height, depth } = volumeData.dimensions;
    
    const slice = new Float32Array(width * depth);
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const volumeIndex = z * (width * height) + y * width + x;
        const sliceIndex = z * width + x;
        slice[sliceIndex] = volumeData.volume[volumeIndex];
      }
    }
    return slice;
  };

  const drawSlice = (canvas: HTMLCanvasElement, sliceData: Float32Array, width: number, height: number) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const windowMin = windowCenter - (windowWidth / 2);
    const windowMax = windowCenter + (windowWidth / 2);

    for (let i = 0; i < sliceData.length; i++) {
      const value = sliceData[i];
      const normalized = ((value - windowMin) / (windowMax - windowMin)) * 255;
      const final = Math.max(0, Math.min(255, normalized));
      const index = i * 4;
      data[index] = final;
      data[index + 1] = final;
      data[index + 2] = final;
      data[index + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Lägg till hantering av segmenteringsmasken
  useEffect(() => {
    if (!showSegmentation || !segmentationMask || !axialRef.current || !renderingEngine) return;

    const viewport = renderingEngine.getViewport('axial-viewport') as Types.IStackViewport;
    if (!viewport) return;

    // Kontrollera att viewport är en StackViewport innan du använder addLayer
    if ('addLayer' in viewport) {
      viewport.addLayer({
        imageIds: ['segmentation'],
        options: {
          opacity: 0.5,
          colormap: 'hsv',
          data: segmentationMask
        }
      });
    }
  }, [segmentationMask, showSegmentation, renderingEngine]);

  // Initiera Cornerstone
  useEffect(() => {
    const init = async () => {
      try {
        await cornerstone.init();
        await cornerstoneTools.init();

        const engine = new cornerstone.RenderingEngine('dicom-viewer');
        setRenderingEngine(engine);

        dicomService.registerImageLoader();

        const toolGroup = ToolGroupManager.createToolGroup('default');
        if (!toolGroup) return;

        // Använd verktygen direkt
        toolGroup.addTool(WindowLevelToolName);
        toolGroup.addTool(PanToolName);
        toolGroup.addTool(ZoomToolName);
        toolGroup.addTool(StackScrollToolName);

        toolGroup.setToolActive(WindowLevelToolName, {
          mouseButtonMask: 1
        });
        toolGroup.setToolActive(PanToolName, {
          mouseButtonMask: 2
        });
        toolGroup.setToolActive(ZoomToolName, {
          mouseButtonMask: 4
        });
        toolGroup.setToolActive(StackScrollToolName);

      } catch (error) {
        console.error('Error initializing Cornerstone3D:', error);
      }
    };

    init();
    return () => {
      if (renderingEngine) {
        renderingEngine.destroy();
      }
      cornerstoneCache.purgeCache();
    };
  }, []);

  // Ladda serie när seriesId ändras
  useEffect(() => {
    const loadSeries = async () => {
      if (!selectedSeriesId) return;

      try {
        // Hämta imageIds för serien
        const imageIds = await dicomService.getImageIds(selectedSeriesId);
        
        // Ladda första bilden
        const image = await dicomService.loadAndCacheImage(imageIds[0]);
        
        // Visa i viewport
        // ... Cornerstone3D rendering kod här
      } catch (error) {
        console.error('Error loading series:', error);
      }
    };

    loadSeries();
  }, [selectedSeriesId]);

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
            <div>W: {windowWidth}</div>
            <div>C: {windowCenter}</div>
            <div>Slice: {currentSlice + 1}/{totalSlices}</div>
          </Controls>
        </ViewerGrid>

        <SearchContainer>
          <SearchInput
            ref={searchInputRef}
            placeholder="Sök patient, studie eller serie..."
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {showSearchResults && searchResults.length > 0 && (
            <SearchResultsList>
              {searchResults.map((result, index) => (
                <SearchResultItem
                  key={`${result.type}-${result.id}`}
                  isSelected={index === selectedSearchIndex}
                  onClick={() => handleSearchResultSelect(result)}
                >
                  {result.type}: {result.text}
                </SearchResultItem>
              ))}
            </SearchResultsList>
          )}
        </SearchContainer>
      </MainContainer>
    </ViewerContainer>
  );
};

export default DicomViewer; 