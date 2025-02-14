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

export const DicomManager: React.FC<DicomManagerProps> = ({ 
  patientId,
  onUploadComplete
}) => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { patient } = usePatient(patientId);

  // Fetch studies when patientId changes
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        if (patientId) {
          const fetchedStudies = await dicomService.searchStudies(`patient:${patientId}`);
          setStudies(fetchedStudies);
        } else {
          // If no patientId, fetch all studies
          const fetchedStudies = await dicomService.searchStudies('');
          setStudies(fetchedStudies);
        }
      } catch (error) {
        console.error('Failed to fetch studies:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch studies');
      }
    };

    fetchStudies();
  }, [patientId]);

  const handleDirectorySelect = useCallback(async (directoryPath: string) => {
    try {
      // Tell backend to scan this directory
      const result = await dicomService.parseLocalDirectory(directoryPath);
      
      // Refresh studies list
      const updatedStudies = await dicomService.searchStudies(
        patientId ? `patient:${patientId}` : ''
      );
      setStudies(updatedStudies);

      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('Directory processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process directory');
    }
  }, [patientId, onUploadComplete]);

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
        />
      </UploadSection>
      
      <DicomList 
        studies={studies}
        selectedStudyId={selectedStudyId}
        onStudySelect={handleStudySelect}
      />
    </DicomManagerContainer>
  );
}; 