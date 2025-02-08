import React, { useState, useEffect } from 'react';
import { MPRViewer } from './components/MPRViewer';
import { WindowLevelControls } from './components/WindowLevelControls';
import { MeasurementTools } from './components/MeasurementTools';
import { ViewerContainer, ControlsContainer, ViewerLayout } from './styles';
import { dicomViewerService } from '../../services/dicomViewerService';
import { DicomSeries } from '../../types/dicom';
import { DicomDebug } from './DicomDebug';
import { WelcomeView } from './components/WelcomeView';

export interface DicomViewerProps {
  seriesId: string;
}

const DicomViewer: React.FC<DicomViewerProps> = ({ seriesId }) => {
  const [image, setImage] = useState<Blob | null>(null);
  const [metadata, setMetadata] = useState<DicomSeries | null>(null);
  const [layout, setLayout] = useState<'single' | 'mpr'>('single');
  const [windowLevel, setWindowLevel] = useState({ center: 127, width: 255 });
  const [currentSlice, setCurrentSlice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeriesData = async () => {
      try {
        const [imageData, metaData] = await Promise.all([
          dicomViewerService.getImage(seriesId),
          dicomViewerService.getSeriesMetadata(seriesId)
        ]);
        setImage(imageData);
        setMetadata(metaData);
        setLoadingError(null);
      } catch (err) {
        console.error('Failed to load series data:', err);
        setLoadingError('Failed to load DICOM data. Please ensure the Imaging Service is running.');
      }
    };
    loadSeriesData();
  }, [seriesId]);

  if (seriesId === 'default') {
    return <WelcomeView />;
  }

  if (loadingError) {
    return (
      <div className="error-container">
        <h3>Error Loading DICOM Series</h3>
        <p>{loadingError}</p>
        <p>Please check that:</p>
        <ul>
          <li>The Imaging Service is running on port 5003</li>
          <li>MongoDB is running and accessible</li>
          <li>The series ID "{seriesId}" exists</li>
        </ul>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;
  if (!image || !metadata) return <div>Loading...</div>;

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