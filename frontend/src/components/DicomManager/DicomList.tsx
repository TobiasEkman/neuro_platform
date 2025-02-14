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
          <StudyInfo>
            <h3>No studies available</h3>
            <p>Select a directory to scan for DICOM files</p>
          </StudyInfo>
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
          <StudyInfo>
            <h3>{study.study_description || 'Untitled Study'}</h3>
            <p>Date: {new Date(study.study_date).toLocaleDateString()}</p>
            <p>Series Count: {study.series?.length || 0}</p>
            <p>Modality: {study.modality}</p>
          </StudyInfo>
          <ViewButton onClick={(e) => {
            e.stopPropagation();
            navigate(`/dicom-viewer/${study.study_instance_uid}`);
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

const StudyInfo = styled.div`
  h3 {
    margin: 0 0 5px 0;
    color: #2c3e50;
  }
  p {
    margin: 0;
    color: #7f8c8d;
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