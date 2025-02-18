import React, { useState, useEffect, useCallback } from 'react';
import { DicomList } from './DicomList';
import { DicomStudy, DicomImportResult } from '../../types/dicom';
import dicomService from '../../services/dicomService';
import { usePatient } from '../../hooks/usePatient';
import { UploadSection } from './UploadSection';
import { FileUpload } from './FileUpload';
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

interface ProgressBarProps {
  progress: number;
  text: string;
}

const ProgressBar = styled.div<ProgressBarProps>`
  width: 100%;
  height: 20px;
  background-color: #ddd;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
  position: relative;

  &:after {
    content: "${props => props.text}";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 1;
  }

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
    width: ${props => `${props.progress}%`};
    border-radius: 10px;
    transition: width 0.5s ease-in-out;
  }
`;

interface StudyListItemProps {
  study: DicomStudy;
  isSelected: boolean;
  onSelect: (studyId: string) => void;
}

const StudyListItem = styled.div<{ isSelected: boolean }>`
  padding: 10px;
  margin: 5px 0;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
  background-color: ${props => props.isSelected ? props.theme.colors.highlight : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.theme.colors.highlightHover};
  }
`;

const StudyInfo = ({ study }: { study: DicomStudy }) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No Date';
    
    // Handle YYYYMMDD format
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    }
    
    // Handle ISO format (YYYY-MM-DD)
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  return (
    <>
      <h3>{study.description || 'Untitled Study'}</h3>
      <div>
        Date: {formatDate(study.study_date)}
      </div>
      <div>
        Series Count: {study.num_series || study.series?.length || 0}
      </div>
      <div>
        Modality: {study.modalities?.join(', ') || ''}
      </div>
    </>
  );
};

export const DicomManager: React.FC<DicomManagerProps> = ({ 
  patientId,
  onUploadComplete
}) => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { patient } = usePatient(patientId);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch studies when patientId changes
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        if (patientId) {
          const fetchedStudies = await dicomService.searchStudies(`patient:${patientId}`);
          console.log('Fetched studies:', fetchedStudies);
          setStudies(fetchedStudies);
        } else {
          // If no patientId, fetch all studies
          const fetchedStudies = await dicomService.searchStudies('');
          console.log('Fetched studies:', fetchedStudies);
          setStudies(fetchedStudies);
        }
      } catch (error) {
        console.error('Failed to fetch studies:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch studies');
      }
    };

    fetchStudies();
  }, [patientId]);

  const handleDirectorySelect = async (path: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      const result = await dicomService.parseDirectory(path, (progress) => {
        setProgress(progress.percentage);
      });
      
      if (!result.studies || result.studies.length === 0) {
        setError('No DICOM files found in the selected directory');
        return;
      }
      
      // Refresh studies list
      const updatedStudies = await dicomService.searchStudies(
        patientId ? `patient:${patientId}` : ''
      );
      setStudies(updatedStudies);

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process directory');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStudySelect = useCallback((study: DicomStudy) => {
    setSelectedStudyId(study.study_instance_uid);
  }, []);

  return (
    <DicomManagerContainer>
      <h2>DICOM Studies {patient && `for ${patient.name}`}</h2>
      
      {/* Error display */}
      {error && (
        <ErrorMessage>
          {error}
          <CloseButton onClick={() => setError(null)}>×</CloseButton>
        </ErrorMessage>
      )}

      <UploadSection>
        <FileUpload 
          onDirectorySelect={handleDirectorySelect}
          disabled={isProcessing}
        />
        {isProcessing && (
          <ProgressBar 
            progress={progress} 
            text={`Processing: ${progress.toFixed(1)}%`}
          />
        )}
      </UploadSection>
      
      <DicomList 
        studies={studies}
        selectedStudyId={selectedStudyId}
        onStudySelect={handleStudySelect}
      />
    </DicomManagerContainer>
  );
}; 