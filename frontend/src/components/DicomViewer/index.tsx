import React, { useState } from 'react';
import { MPRViewer } from './MPRViewer';
import { WindowLevelControls } from './WindowLevelControls';
import { MeasurementTools } from './MeasurementTools';
import { usePatient } from '../../context/PatientContext';
import { DicomImage } from '../../types/dicom';
import './DicomViewer.css';

interface DicomViewerProps {
  seriesId: string;
}

export const DicomViewer: React.FC<DicomViewerProps> = ({ seriesId }) => {
  const { patient } = usePatient();
  const [layout, setLayout] = useState<'single' | 'mpr'>('single');
  const [windowLevel, setWindowLevel] = useState({ center: 127, width: 255 });
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentImage, setCurrentImage] = useState<DicomImage | null>(null);

  return (
    <div className="dicom-viewer">
      <div className="viewer-controls">
        <button onClick={() => setLayout(layout === 'single' ? 'mpr' : 'single')}>
          {layout === 'single' ? 'Show MPR' : 'Single View'}
        </button>
        <WindowLevelControls
          center={windowLevel.center}
          width={windowLevel.width}
          onChange={(center, width) => setWindowLevel({ center, width })}
        />
        <MeasurementTools
          onMeasure={measurement => setMeasurements([...measurements, measurement])}
          pixelSpacing={currentImage?.pixelSpacing}
        />
      </div>

      <div className={`viewer-layout ${layout}`}>
        {layout === 'single' ? (
          <MPRViewer seriesId={seriesId} orientation="axial" />
        ) : (
          <>
            <MPRViewer seriesId={seriesId} orientation="axial" />
            <MPRViewer seriesId={seriesId} orientation="sagittal" />
            <MPRViewer seriesId={seriesId} orientation="coronal" />
          </>
        )}
      </div>
    </div>
  );
}; 