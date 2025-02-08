import React, { useState, useEffect, useRef } from 'react';
import { DicomUploader } from './DicomUploader';
import { DicomList } from './DicomList';
import { DicomImportResult, DicomStudy } from '../../types/dicom';
import { dicomService } from '../../services/dicomService';
import { usePatient } from '../../hooks/usePatient';
import { useDicomData } from '../../hooks/useDicomData';
import { UploadSection } from './UploadSection';
import { FileUpload } from './FileUpload';
import { StatsButton } from './StatsButton';
import styled from 'styled-components';
import { FaSpinner, FaTimes } from 'react-icons/fa';
import { logger } from '../../utils/logger';

// Add props interface
export interface DicomManagerProps {
  patientId: string;
  onUploadComplete?: (result: DicomImportResult) => void;
}

// Flytta styled components till komponenten
const StatsModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80vh;
  overflow-y: auto;
`;

const DicomManagerContainer = styled.div`
  padding: 20px;
  
  h2 {
    margin-bottom: 20px;
    color: ${props => props.theme.colors.text.primary};
  }
`;

// Styled components för loading och error
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: white;
`;

const Spinner = styled(FaSpinner)`
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
  font-size: 2rem;
  
  @keyframes spin {
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: #ff5252;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
`;

export const DicomManager: React.FC<DicomManagerProps> = ({ 
  patientId,
  onUploadComplete
}) => {
  const [folderPath, setFolderPath] = useState('');
  const [dicomdirPath, setDicomdirPath] = useState('');
  const [importResult, setImportResult] = useState<DicomImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const { patient, loading: patientLoading } = usePatient(patientId);
  const { latestCTFindings, loading: dicomLoading } = useDicomData(patientId);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        logger.debug('Fetching studies...', { patientId });
        const query = patientId && patientId !== 'default' 
          ? `patient:${patientId}`
          : '';
        
        const data = await dicomService.searchStudies(query);
        logger.debug('Received studies:', { count: data?.length, data });
        setStudies(Array.isArray(data) ? data : []);
      } catch (err) {
        logger.error('Failed to fetch studies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch studies');
        setStudies([]);
      }
    };
    fetchStudies();
  }, [patientId]);

  if (patientLoading || dicomLoading) {
    return <div>Loading...</div>;
  }

  const handleDicomUpload = async (files: FileList) => {
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);
      
      abortController.current = new AbortController();
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        const relativePath = file.webkitRelativePath || file.name;
        formData.append('files', file, relativePath);
      });
      
      if (patientId) {
        formData.append('pid', patientId);
      }
      
      const response = await fetch('/api/dicom/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.current.signal,
        // OBS: onUploadProgress tas bort då fetch inte stöder progress tracking nativt.
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setImportResult(result);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Upload cancelled');
      } else {
        console.error('Upload error:', error);
        setError(error instanceof Error ? error.message : 'Failed to upload files');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      abortController.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
  };

  const showStats = async () => {
    try {
      const stats = await dicomService.getStats();
      setStats(stats);
      setShowStatsModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  };

  return (
    <DicomManagerContainer>
      <h2>DICOM Studies</h2>
      
      {/* Error display */}
      {error && (
        <ErrorMessage>
          {error}
          <CloseButton onClick={() => setError(null)}>
            <FaTimes />
          </CloseButton>
        </ErrorMessage>
      )}

      <UploadSection>
        <FileUpload 
          onUpload={handleDicomUpload}
          disabled={isUploading}
        />
        <StatsButton onClick={showStats}>
          Show Dataset Statistics
        </StatsButton>
      </UploadSection>
      
      {/* Loading overlay */}
      {isUploading && (
        <LoadingOverlay>
          <Spinner />
          <div>Uploading DICOM files... {uploadProgress}%</div>
          <button onClick={handleCancelUpload}>Cancel Upload</button>
        </LoadingOverlay>
      )}
      
      <DicomList studies={studies} />
      
      {/* Stats Modal */}
      {showStatsModal && stats && (
        <StatsModal onClick={() => setShowStatsModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>Dataset Statistics</h2>
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </ModalContent>
        </StatsModal>
      )}
    </DicomManagerContainer>
  );
}; 