import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { DicomStudy } from '../../types/dicom';

interface DicomListProps {
  studies: DicomStudy[];
  onStudySelect?: (study: DicomStudy) => void;
  selectedStudyId?: string;
}

export const DicomList: React.FC<DicomListProps> = ({ 
  studies = [], 
  onStudySelect,
  selectedStudyId 
}) => {
  const navigate = useNavigate();

  if (!studies || studies.length === 0) {
    return (
      <StudyList>
        <StudyItem>
          <div>
            <h3>No studies available</h3>
            <p>Select a directory to scan for DICOM files</p>
          </div>
        </StudyItem>
      </StudyList>
    );
  }

  return (
    <StudyList>
      {studies.map(study => (
        <StudyItem 
          key={study.study_instance_uid}
          selected={study.study_instance_uid === selectedStudyId}
          onClick={() => onStudySelect?.(study)}
        >
          <StudyInfo study={study} />
          <ViewButton onClick={(e) => {
            e.stopPropagation();
            navigate('/dicom-viewer', { 
              state: { studyId: study.study_instance_uid }
            });
          }}>
            View Images
          </ViewButton>
        </StudyItem>
      ))}
    </StudyList>
  );
};

const StudyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
`;

interface StudyItemProps {
  selected?: boolean;
}

const StudyItem = styled.div<StudyItemProps>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: ${props => props.selected ? '#e0e0e0' : 'white'};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  &:hover {
    background: #f0f0f0;
  }
`;

const StudyInfo = ({ study }: { study: DicomStudy }) => {
  // Get modality from first series that has one, with null check
  const modality = study?.series?.find(s => s.modality)?.modality || 'Unknown';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    
    // Handle YYYYMMDD format
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    }
    
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <StudyInfoContainer>
      <h3>{study.description || 'Untitled Study'}</h3>
      <InfoGrid>
        <div>PID: {study.patient_id}</div>
        <div>Date: {formatDate(study.study_date)}</div>
        <div>Series: {study.num_series || study.series?.length || 0}</div>
        <div>Modality: {modality}</div>
      </InfoGrid>
    </StudyInfoContainer>
  );
};

// Add styled components for better layout
const StudyInfoContainer = styled.div`
  h3 {
    margin: 0 0 8px 0;
    color: ${props => props.theme.colors.text.primary};
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  
  div {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const ViewButton = styled.button`
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #2980b9;
  }
`; 