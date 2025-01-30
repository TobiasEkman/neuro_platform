import React, { useState, useEffect } from 'react';
import { DicomUploader } from './DicomUploader';
import { DicomList } from './DicomList';
import { DicomControls } from './DicomControls';
import { DicomImportResult, DicomStudy } from '../../types/dicom';
import { dicomService } from '../../services/dicomService';
import './styles/DicomManager.css';
import { usePatient } from '../../hooks/usePatient';
import { useDicomData } from '../../hooks/useDicomData';
import { UploadSection } from './UploadSection';
import { FileUpload } from './FileUpload';
import { StatsButton } from './StatsButton';
import { dicomManagerService } from '../../services/dicomManagerService';
import styled from 'styled-components';

// Add props interface
export interface DicomManagerProps {
  patientId: string;
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

export const DicomManager: React.FC<DicomManagerProps> = ({ patientId }) => {
  const [folderPath, setFolderPath] = useState('');
  const [dicomdirPath, setDicomdirPath] = useState('');
  const [importResult, setImportResult] = useState<DicomImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { patient, loading: patientLoading } = usePatient(patientId);
  const { latestCTFindings, loading: dicomLoading } = useDicomData(patientId);
  const [stats, setStats] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [studies, setStudies] = useState<DicomStudy[]>([]);

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const data = await dicomManagerService.searchStudies(`patient:${patientId}`);
        setStudies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch studies');
      }
    };
    fetchStudies();
  }, [patientId]);

  if (patientLoading || dicomLoading) {
    return <div>Loading...</div>;
  }

  const handleDicomUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    try {
      const result = await dicomManagerService.uploadDicom(event.target.files);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    }
  };

  const showStats = async () => {
    try {
      const stats = await dicomManagerService.getStats();
      setStats(stats);
      setShowStatsModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  };

  return (
    <div className="dicom-manager">
      <h2>DICOM Studies</h2>
      <UploadSection>
        <FileUpload 
          onUpload={handleDicomUpload}
          accept=".dcm,.dicom"
          multiple
        />
        <StatsButton onClick={showStats}>
          Show Dataset Statistics
        </StatsButton>
      </UploadSection>
      
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
    </div>
  );
}; 