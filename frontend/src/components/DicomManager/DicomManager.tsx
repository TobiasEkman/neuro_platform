import React, { useState, useEffect, useCallback } from 'react';
import { 
  DicomStudy, 
  DicomImportResult
} from '../../types/medical';
import dicomService from '../../services/dicomService';
import { usePatient } from '../../hooks/usePatient';
import { UploadSection } from './UploadSection';
import { FileUpload } from './FileUpload';
import styled from 'styled-components';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';


// Add props interface
export interface DicomManagerProps {
  patientId: string;
  patient_name: string;
  onUploadComplete?: (result: DicomImportResult) => void;
}


const DicomManagerContainer = styled.div`
  padding: 20px;
  
  h2 {
    margin-bottom: 20px;
    color: ${props => props.theme.colors.text.primary};
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


// Lägg till en ny komponent för bekräftelsedialog
const ConfirmationDialog = styled.div`
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

const DialogContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DialogTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text.primary};
`;

const PatientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
`;

const PatientItem = styled.div<{ isNew: boolean }>`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${props => props.isNew ? '#e6f7ff' : '#f0f0f0'};
  border-radius: 4px;
  border-left: 4px solid ${props => props.isNew ? '#1890ff' : '#52c41a'};
`;

const PatientIcon = styled.div`
  margin-right: 10px;
  color: ${props => props.theme.colors.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Button = styled.button<{ primary?: boolean }>`
  padding: 8px 16px;
  background: ${props => props.primary ? props.theme.colors.primary : 'white'};
  color: ${props => props.primary ? 'white' : props.theme.colors.text.primary};
  border: 1px solid ${props => props.primary ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.primary ? props.theme.colors.primaryDark : '#f5f5f5'};
  }
`;

// Lägg till en ny typ för patientsammanfattning
interface PatientConfirmation {
  patientId: string;
  name?: string;
  isNew: boolean;
  studyCount: number;
}

const DicomManager: React.FC<DicomManagerProps> = ({ 
  patientId,
  onUploadComplete
}) => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { patient } = usePatient(patientId);
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dicomPath, setDicomPath] = useState<string>(
    localStorage.getItem('lastDicomPath') || ''
  );
  
  // State för bekräftelsedialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [patientsToConfirm, setPatientsToConfirm] = useState<PatientConfirmation[]>([]);
  const [pendingDirectoryPath, setPendingDirectoryPath] = useState<string>('');
  const [pendingDicomData, setPendingDicomData] = useState<any>(null);



  const handleDirectorySelect = async (selectedPath: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      console.log('[DicomManager] Parsing directory:', selectedPath);
      
      const result = await dicomService.parseDirectory(
        selectedPath,
        (progress) => {
          // progress innehåller { current, total, percentage }
          setProgress(progress.percentage);
        }
      );
      
      if (!result.studies || result.studies.length === 0) {
        setError('No DICOM files found in the selected directory');
        setIsProcessing(false);
        return;
      }
      
      // Hämta befintliga patienter för att jämföra
      const existingPatients = await dicomService.getAllPatients();
      
      // Skapa en lista över patienter som ska bekräftas
      const patientMap = new Map<string, PatientConfirmation>();
      
      // Gruppera studier efter patient-ID
      result.studies.forEach((study: DicomStudy) => {
        const pid = study.patient_id;
        if (!patientMap.has(pid)) {
          const existingPatient = existingPatients.find(p => p.patient_id === pid);
          patientMap.set(pid, {
            patientId: pid,
            name: study.patient_name || 'Unknown',
            isNew: !existingPatient,
            studyCount: 1
          });
        } else {
          const patient = patientMap.get(pid)!;
          patient.studyCount++;
          patientMap.set(pid, patient);
        }
      });
      
      setPatientsToConfirm(Array.from(patientMap.values()));
      setPendingDirectoryPath(selectedPath);
      setPendingDicomData(result);
      setShowConfirmation(true);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process directory');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmImport = async () => {
    try {
      setShowConfirmation(false);
      setIsProcessing(true);
      
      // Nu när användaren har bekräftat, importera data till databasen
      const result = await dicomService.importDicomData(pendingDirectoryPath, pendingDicomData, (progress) => {
        setProgress(progress.percentage);
      });
      
      // Uppdatera studielisten
      const results = await dicomService.searchStudies(
        patientId ? `patient:${patientId}` : ''
      );
      const studyResults = results
        .filter(result => result.type === 'study' && result.studyData)
        .map(result => result.studyData as DicomStudy);
      setStudies(studyResults);

      if (onUploadComplete) {
        onUploadComplete({
          ...result,
          studies: result.studies || []
        });
      }
      
      // Rensa pending data
      setPendingDirectoryPath('');
      setPendingDicomData(null);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import DICOM data');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCancelImport = () => {
    setShowConfirmation(false);
    setPendingDirectoryPath('');
    setPendingDicomData(null);
  };

  return (
    <DicomManagerContainer>
      <h2>Upload DICOM Data {patient && `for ${patient.name}`}</h2>
      
      {/* Error display */}
      {error && (
        <ErrorMessage>
          {error}
          <CloseButton onClick={() => setError(null)}>×</CloseButton>
        </ErrorMessage>
      )}

      <UploadSection>
        <FileUpload 
          onDirectorySelect={(path) => {
            handleDirectorySelect(path);
          }}
          disabled={isProcessing}
        />
        {isProcessing && (
          <ProgressBar 
            progress={progress} 
            text={`Processing: ${progress.toFixed(1)}%`}
          />
        )}
      </UploadSection>
      
      {/* Bekräftelsedialog */}
      {showConfirmation && (
        <ConfirmationDialog>
          <DialogContent>
            <DialogTitle>Confirm DICOM Import</DialogTitle>
            
            <div>
              The following patients will be affected by this import:
            </div>
            
            <PatientList>
              {patientsToConfirm.map(patient => (
                <PatientItem key={patient.patientId} isNew={patient.isNew}>
                  <PatientIcon>
                    {patient.isNew ? <FaExclamationTriangle /> : <FaCheck />}
                  </PatientIcon>
                  <div>
                    <strong>Patient ID: {patient.patientId}</strong>
                    {patient.name && <div>Name: {patient.name}</div>}
                    <div>Studies: {patient.studyCount}</div>
                    <div>{patient.isNew ? 'New patient will be created' : 'Existing patient will be updated'}</div>
                  </div>
                </PatientItem>
              ))}
            </PatientList>
            
            <ButtonGroup>
              <Button onClick={handleCancelImport}>Cancel</Button>
              <Button primary onClick={handleConfirmImport}>Confirm Import</Button>
            </ButtonGroup>
          </DialogContent>
        </ConfirmationDialog>
      )}
    </DicomManagerContainer>
  );
};

export default DicomManager; 