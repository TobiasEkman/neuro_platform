import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MPRViewerProps {
  seriesId: string;
  orientation: 'axial' | 'sagittal' | 'coronal';
}

interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export const MPRViewer: React.FC<MPRViewerProps> = ({ seriesId, orientation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [volumeData, setVolumeData] = useState<Float32Array | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0, depth: 0 });
  const [currentSlice, setCurrentSlice] = useState(0);

  const loadVolumeData = useCallback(async () => {
    try {
      const response = await fetch(`/api/series/${seriesId}/volume`);
      const data = await response.json();
      setVolumeData(new Float32Array(data.volume));
      setDimensions(data.dimensions);
    } catch (error) {
      console.error('Error loading volume data:', error);
    }
  }, [seriesId]);

  useEffect(() => {
    loadVolumeData();
  }, [loadVolumeData]);

  const extractAxialSlice = useCallback((sliceData: Uint8ClampedArray, slice: number) => {
    if (!volumeData) return;
    const offset = slice * dimensions.width * dimensions.height;
    for (let i = 0; i < dimensions.width * dimensions.height; i++) {
      const value = volumeData[offset + i];
      const index = i * 4;
      sliceData[index] = value;
      sliceData[index + 1] = value;
      sliceData[index + 2] = value;
      sliceData[index + 3] = 255;
    }
  }, [dimensions, volumeData]);

  const extractSagittalSlice = useCallback((sliceData: Uint8ClampedArray, slice: number) => {
    if (!volumeData) return;
    for (let z = 0; z < dimensions.depth; z++) {
      for (let y = 0; y < dimensions.height; y++) {
        const value = volumeData[z * dimensions.width * dimensions.height + y * dimensions.width + slice];
        const index = (z * dimensions.height + y) * 4;
        sliceData[index] = value;
        sliceData[index + 1] = value;
        sliceData[index + 2] = value;
        sliceData[index + 3] = 255;
      }
    }
  }, [dimensions, volumeData]);

  const extractCoronalSlice = useCallback((sliceData: Uint8ClampedArray, slice: number) => {
    if (!volumeData) return;
    for (let z = 0; z < dimensions.depth; z++) {
      for (let x = 0; x < dimensions.width; x++) {
        const value = volumeData[z * dimensions.width * dimensions.height + slice * dimensions.width + x];
        const index = (z * dimensions.width + x) * 4;
        sliceData[index] = value;
        sliceData[index + 1] = value;
        sliceData[index + 2] = value;
        sliceData[index + 3] = 255;
      }
    }
  }, [dimensions, volumeData]);

  const renderSlice = useCallback(() => {
    if (!canvasRef.current || !volumeData) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(dimensions.width, dimensions.height);
    const sliceData = new Uint8ClampedArray(dimensions.width * dimensions.height * 4);

    switch (orientation) {
      case 'axial':
        extractAxialSlice(sliceData, currentSlice);
        break;
      case 'sagittal':
        extractSagittalSlice(sliceData, currentSlice);
        break;
      case 'coronal':
        extractCoronalSlice(sliceData, currentSlice);
        break;
    }

    imageData.data.set(sliceData);
    ctx.putImageData(imageData, 0, 0);
  }, [volumeData, dimensions, currentSlice, orientation, extractAxialSlice, extractSagittalSlice, extractCoronalSlice]);

  useEffect(() => {
    renderSlice();
  }, [renderSlice]);

  const getMaxSlice = useCallback((): number => {
    switch (orientation) {
      case 'axial':
        return dimensions.depth - 1;
      case 'sagittal':
        return dimensions.width - 1;
      case 'coronal':
        return dimensions.height - 1;
      default:
        return 0;
    }
  }, [dimensions, orientation]);

  return (
    <div className="mpr-viewer">
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height}
      />
      <div className="slice-controls">
        <input
          type="range"
          min={0}
          max={getMaxSlice()}
          value={currentSlice}
          onChange={(e) => setCurrentSlice(parseInt(e.target.value))}
        />
        <span>{orientation.toUpperCase()}</span>
      </div>
    </div>
  );
}; 