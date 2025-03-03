import React, { useState } from 'react';
import DicomViewer from '../DicomViewer/DicomViewer';
import {
  Container,
  AnalysisLayout,
  ViewerContainer,
  ControlPanel,
  ProcessingSteps,
  StepContainer,
  ModelSelector,
  ProgressIndicator,
  ResultsPanel,
  ImageSelector
} from './components/styles';
import { tumorService } from '../../services/tumorService';

interface ProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
}

const TumorAnalysis: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [segmentationMask, setSegmentationMask] = useState<number[] | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentStep: '',
    progress: 0
  });

  // BraTS konfiguration
  const [config, setConfig] = useState({
    preprocessing: {
      mode: 'gpu' as 'gpu' | 'cpu' | 'robex',
      defacing: false,
      batchProcessing: true
    },
    segmentation: {
      models: ['nnunet'] as string[],
      availableModels: [
        { id: 'nnunet', name: 'nnU-Net' },
        { id: 'hdglio', name: 'HD-GliO' },
        { id: 'scan', name: 'SCAN' },
        { id: 'econib', name: 'EcoNiB' }
      ]
    },
    fusion: {
      method: 'simple' as 'simple' | 'majority' | 'simple'
    }
  });

  const handlePreprocessing = async () => {
    if (!selectedImage) return;
    
    try {
      setProcessingState({
        isProcessing: true,
        currentStep: 'Förbehandlar bilder...',
        progress: 0
      });

      await tumorService.preprocessImages(selectedImage, config.preprocessing);
      
      setProcessingState(prev => ({
        ...prev,
        progress: 33,
        currentStep: 'Förbehandling klar'
      }));
    } catch (error) {
      console.error('Preprocessing error:', error);
    }
  };

  const handleSegmentation = async () => {
    if (!selectedImage) return;
    
    try {
      setProcessingState(prev => ({
        ...prev,
        currentStep: 'Segmenterar tumör...',
        progress: 34
      }));

      const result = await tumorService.segmentTumor(selectedImage, {
        models: config.segmentation.models,
        fusion: config.fusion.method
      });

      setSegmentationMask(result.segmentation);
      
      setProcessingState(prev => ({
        ...prev,
        progress: 66,
        currentStep: 'Segmentering klar'
      }));
    } catch (error) {
      console.error('Segmentation error:', error);
    }
  };

  const handleFusion = async () => {
    if (!selectedImage) return;
    
    try {
      setProcessingState(prev => ({
        ...prev,
        currentStep: 'Fusionerar segmenteringar...',
        progress: 67
      }));

      const result = await tumorService.fuseSegmentations(selectedImage, {
        method: config.fusion.method
      });

      setSegmentationMask(result.fusedSegmentation);
      
      setProcessingState({
        isProcessing: false,
        currentStep: 'Klar',
        progress: 100
      });
    } catch (error) {
      console.error('Fusion error:', error);
    }
  };

  // När en serie väljs i DicomViewer
  const handleSeriesSelect = (seriesId: string) => {
    setSelectedImage(seriesId);
    // Återställ segmentering när ny bild väljs
    setSegmentationMask(null);
  };

  return (
    <Container>
      <AnalysisLayout>
        <ViewerContainer>
          <DicomViewer 
            seriesId={selectedImage}
            segmentationMask={segmentationMask}
            showSegmentation={true}
            onSeriesSelect={handleSeriesSelect}
          />
        </ViewerContainer>

        <ControlPanel>
          {!selectedImage ? (
            <ImageSelector>
              <h3>Välj bild för analys</h3>
              <p>Använd DICOM-visaren för att välja en serie att analysera</p>
            </ImageSelector>
          ) : (
            <ProcessingSteps>
              <StepContainer>
                <h3>1. Förbehandling</h3>
                <select 
                  value={config.preprocessing.mode}
                  onChange={(e) => setConfig({
                    ...config,
                    preprocessing: {
                      ...config.preprocessing,
                      mode: e.target.value as 'gpu' | 'cpu' | 'robex'
                    }
                  })}
                >
                  <option value="gpu">GPU (HD-BET)</option>
                  <option value="cpu">CPU (HD-BET)</option>
                  <option value="robex">ROBEX</option>
                </select>
                <button onClick={handlePreprocessing}>
                  Starta förbehandling
                </button>
              </StepContainer>

              <StepContainer>
                <h3>2. Segmentering</h3>
                <ModelSelector>
                  {config.segmentation.availableModels.map(model => (
                    <label key={model.id}>
                      <input
                        type="checkbox"
                        checked={config.segmentation.models.includes(model.id)}
                        onChange={(e) => {
                          const models = e.target.checked
                            ? [...config.segmentation.models, model.id]
                            : config.segmentation.models.filter(m => m !== model.id);
                          setConfig({
                            ...config,
                            segmentation: { ...config.segmentation, models }
                          });
                        }}
                      />
                      {model.name}
                    </label>
                  ))}
                </ModelSelector>
                <button onClick={handleSegmentation}>
                  Starta segmentering
                </button>
              </StepContainer>

              <StepContainer>
                <h3>3. Fusionering</h3>
                <select
                  value={config.fusion.method}
                  onChange={(e) => setConfig({
                    ...config,
                    fusion: {
                      ...config.fusion,
                      method: e.target.value as 'simple' | 'majority'
                    }
                  })}
                >
                  <option value="simple">Simple Average</option>
                  <option value="majority">Majority Voting</option>
                </select>
                <button onClick={handleFusion}>
                  Fusionera segmenteringar
                </button>
              </StepContainer>
            </ProcessingSteps>
          )}

          {processingState.isProcessing && (
            <ProgressIndicator>
              <div className="progress-bar">
                <div 
                  className="progress"
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
              <p>{processingState.currentStep}</p>
            </ProgressIndicator>
          )}
        </ControlPanel>
      </AnalysisLayout>
    </Container>
  );
};

export default TumorAnalysis;