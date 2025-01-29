import React, { useState, useEffect } from 'react';
import { MPRViewer } from './components/MPRViewer';
import { WindowLevelControls } from './components/WindowLevelControls';
import { MeasurementTools } from './components/MeasurementTools';
import { ViewerContainer, ControlsContainer, ViewerLayout } from './styles';
import { dicomService } from '../../services/dicomService';
import { DicomSeries } from '../../types/dicom';
import { DicomDebug } from './DicomDebug';

export interface DicomViewerProps {
  seriesId: string;
}

const DicomViewer: React.FC<DicomViewerProps> = ({ seriesId }) => {
  const [series, setSeries] = useState<DicomSeries | null>(null);
  const [layout, setLayout] = useState<'single' | 'mpr'>('single');
  const [windowLevel, setWindowLevel] = useState({ center: 127, width: 255 });
  const [currentSlice, setCurrentSlice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeries = async () => {
      try {
        setError(null);
        const data = await dicomService.loadSeries(seriesId);
        setSeries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load series');
        console.error('Error loading series:', err);
      }
    };

    loadSeries();
  }, [seriesId]);

  if (loadingError) {
    return (
      <div className="error-container">
        <h3>Error Loading DICOM Series</h3>
        <p>{loadingError}</p>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;
  if (!series) return <div>Loading...</div>;

  return (
    <ViewerContainer>
      <DicomDebug />

      <ControlsContainer>
        <button onClick={() => setLayout(layout === 'single' ? 'mpr' : 'single')}>
          {layout === 'single' ? 'Show MPR' : 'Single View'}
        </button>
        <WindowLevelControls
          center={windowLevel.center}
          width={windowLevel.width}
          onChange={(center, width) => setWindowLevel({ center, width })}
        />
        <MeasurementTools
          onMeasure={measurement => console.log('Measurement:', measurement)}
          pixelSpacing={[1, 1]}
        />
      </ControlsContainer>

      <ViewerLayout className={layout}>
        {layout === 'single' ? (
          <MPRViewer 
            seriesId={seriesId} 
            orientation="axial"
            windowCenter={windowLevel.center}
            windowWidth={windowLevel.width}
            currentSlice={currentSlice}
            onSliceChange={setCurrentSlice}
          />
        ) : (
          <>
            <MPRViewer 
              seriesId={seriesId} 
              orientation="axial"
              windowCenter={windowLevel.center}
              windowWidth={windowLevel.width}
              currentSlice={currentSlice}
              onSliceChange={setCurrentSlice}
            />
            <MPRViewer 
              seriesId={seriesId} 
              orientation="sagittal"
              windowCenter={windowLevel.center}
              windowWidth={windowLevel.width}
              currentSlice={currentSlice}
              onSliceChange={setCurrentSlice}
            />
            <MPRViewer 
              seriesId={seriesId} 
              orientation="coronal"
              windowCenter={windowLevel.center}
              windowWidth={windowLevel.width}
              currentSlice={currentSlice}
              onSliceChange={setCurrentSlice}
            />
          </>
        )}
      </ViewerLayout>
    </ViewerContainer>
  );
};

export default DicomViewer; 