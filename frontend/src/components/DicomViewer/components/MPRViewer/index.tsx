import React, { useEffect, useRef, useState, useCallback } from 'react';
import { dicomService } from '../../../../services/dicomService';
import { Dimensions, VolumeData } from '../../../../types/medical';

export interface MPRViewerProps {
  seriesId: string;
  orientation: 'axial' | 'sagittal' | 'coronal';
  windowCenter: number;
  windowWidth: number;
  currentSlice: number;
  onSliceChange: (slice: number) => void;
}

export const MPRViewer: React.FC<MPRViewerProps> = ({
  seriesId,
  orientation,
  windowCenter,
  windowWidth,
  currentSlice,
  onSliceChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [volumeData, setVolumeData] = useState<Float32Array | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>([0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  const loadVolumeData = useCallback(async () => {
    try {
      const data = await dicomService.getVolumeData(seriesId);
      setVolumeData(new Float32Array(data.volume));
      setDimensions(data.dimensions);  // Nu matchar typerna
    } catch (error) {
      console.error('Error loading volume data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load volume data');
    }
  }, [seriesId]);

  useEffect(() => {
    loadVolumeData();
  }, [loadVolumeData]);

  const extractAxialSlice = useCallback((sliceData: Uint8ClampedArray, slice: number) => {
    if (!volumeData) return;
    const offset = slice * dimensions[0] * dimensions[1];
    for (let i = 0; i < dimensions[0] * dimensions[1]; i++) {
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
    for (let z = 0; z < dimensions[2]; z++) {
      for (let y = 0; y < dimensions[1]; y++) {
        const value = volumeData[z * dimensions[0] * dimensions[1] + y * dimensions[0] + slice];
        const index = (z * dimensions[1] + y) * 4;
        sliceData[index] = value;
        sliceData[index + 1] = value;
        sliceData[index + 2] = value;
        sliceData[index + 3] = 255;
      }
    }
  }, [dimensions, volumeData]);

  const extractCoronalSlice = useCallback((sliceData: Uint8ClampedArray, slice: number) => {
    if (!volumeData) return;
    for (let z = 0; z < dimensions[2]; z++) {
      for (let x = 0; x < dimensions[0]; x++) {
        const value = volumeData[z * dimensions[0] * dimensions[1] + slice * dimensions[0] + x];
        const index = (z * dimensions[0] + x) * 4;
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

    const imageData = ctx.createImageData(dimensions[0], dimensions[1]);
    const sliceData = new Uint8ClampedArray(dimensions[0] * dimensions[1] * 4);

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
        return dimensions[2] - 1;
      case 'sagittal':
        return dimensions[0] - 1;
      case 'coronal':
        return dimensions[1] - 1;
      default:
        return 0;
    }
  }, [dimensions, orientation]);

  return (
    <div className="mpr-viewer">
      <canvas 
        ref={canvasRef} 
        width={dimensions[0]} 
        height={dimensions[1]}
      />
      <div className="slice-controls">
        <input
          type="range"
          min={0}
          max={getMaxSlice()}
          value={currentSlice}
          onChange={(e) => onSliceChange(Number(e.target.value))}
        />
        <span>{orientation.toUpperCase()}</span>
      </div>
      <div className="slice-indicator">
        <div className="position-line" />
        <div className="position-label">{orientation}</div>
      </div>
    </div>
  );
}; 