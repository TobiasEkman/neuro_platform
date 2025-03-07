import React, { useState, useEffect, useCallback } from 'react';
import { DicomList } from './DicomList';
import { 
  DicomStudy, 
  DicomImportResult,
  DicomPatientSummary
} from '../../types/medical';
import dicomService from '../../services/dicomService';
import { usePatient } from '../../hooks/usePatient';
import { UploadSection } from './UploadSection';
import { FileUpload } from './FileUpload';
import styled from 'styled-components';
import { FaSpinner, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
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

const ConfigSection = styled.div`
  margin-bottom: 20px;
  padding: 15px;
  background: ${props => props.theme.colors.background.secondary};
  border-radius: 8px;

  .path-input-container {
    display: flex;
    gap: 10px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-grow: 1;
  }

  input {
    padding: 8px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 4px;
    width: 100%;
  }

  button {
    align-self: flex-end;
    padding: 8px 16px;
    background: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    height: 37px;  // Match input height

    &:hover {
      background: ${props => props.theme.colors.primaryDark};
    }
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
  
  // Lägg till state för bekräftelsedialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [patientsToConfirm, setPatientsToConfirm] = useState<PatientConfirmation[]>([]);
  const [pendingDirectoryPath, setPendingDirectoryPath] = useState<string>('');
  const [pendingDicomData, setPendingDicomData] = useState<any>(null);

  // Fetch studies when patientId changes
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        if (patientId) {
          const results = await dicomService.searchStudies(`patient:${patientId}`);
          // Konvertera sökresultat till DicomStudy[]
          const studyResults = results
            .filter(result => result.type === 'study' && result.studyData)
            .map(result => convertStudy(result.studyData as DicomStudy));
          setStudies(studyResults);
        } else {
          const results = await dicomService.searchStudies('');
          const studyResults = results
            .filter(result => result.type === 'study' && result.studyData)
            .map(result => convertStudy(result.studyData as DicomStudy));
          setStudies(studyResults);
        }
      } catch (error) {
        console.error('Failed to fetch studies:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch studies');
      }
    };

    fetchStudies();
  }, [patientId]);

  const handleDirectorySelect = async (selectedPath: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      // Analysera DICOM-data utan att spara till databasen
      console.log('[DicomManager] Analyzing directory:', selectedPath);
      
      // Ändra API-anropet för att bara analysera utan att spara
      const result = await dicomService.analyzeDicomDirectory(selectedPath, (progress) => {
        setProgress(progress.percentage);
      });
      
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
      result.studies.forEach(study => {
        const pid = study.patient_id;
        if (!patientMap.has(pid)) {
          const existingPatient = existingPatients.find(p => p.patient_id === pid);
          patientMap.set(pid, {
            patientId: pid,
            name: (study as any).patient_name || 'Unknown',
            isNew: !existingPatient,
            studyCount: 1
          });
        } else {
          const patient = patientMap.get(pid)!;
          patient.studyCount++;
          patientMap.set(pid, patient);
        }
      });
      
      // Konvertera Map till Array för state
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
        .map(result => convertStudy(result.studyData as DicomStudy));
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

  const handleStudySelect = useCallback((study: DicomStudy) => {
    setSelectedStudyId(study.study_instance_uid);
  }, []);

  const handleSearch = async (query: string) => {
    try {
      const results = await dicomService.searchStudies(query);
      // Filtrera och konvertera endast study-resultat
      const studyResults = results
        .filter(result => result.type === 'study' && result.studyData)
        .map(result => convertStudy(result.studyData as DicomStudy));
      setStudies(studyResults);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const convertStudy = (study: DicomStudy): DicomStudy => {
    return {
      ...study,
      _id: study.study_instance_uid,
      modalities: study.modality ? [study.modality] : [],
      num_series: study.series.length,
      num_instances: study.series.reduce((sum, s) => sum + s.instances.length, 0),
      series: study.series.map(s => ({
        ...s,
        series_uid: s.series_instance_uid,  // Mappa series_instance_uid till series_uid
        filePath: s.instances[0]?.file_path || ''  // Använd första instansens sökväg
      }))
    };
  };

  return (
    <DicomManagerContainer>
      <h2>DICOM Management</h2>
      
      <ConfigSection>
        <div className="path-input-container">
          <label>
            DICOM Base Directory:
            <input 
              type="text" 
              value={dicomPath}
              onChange={(e) => {
                setDicomPath(e.target.value);
                localStorage.setItem('lastDicomPath', e.target.value);
              }}
              placeholder="e.g., C:/DICOM_Data or /data/dicom"
            />
          </label>
          <button 
            onClick={async () => {
              try {
                await dicomService.configureDicomPath(dicomPath);
                setError(null); // Clear any previous errors
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to save DICOM path');
              }
            }}
          >
            Save Path
          </button>
        </div>
        <small style={{ marginTop: '8px', color: 'gray' }}>
          All DICOM files must be located somewhere under this base directory
        </small>
      </ConfigSection>

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
        
        <DicomList 
          studies={studies}
          selectedStudyId={selectedStudyId}
          onStudySelect={handleStudySelect}
        />
      </DicomManagerContainer>
      
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