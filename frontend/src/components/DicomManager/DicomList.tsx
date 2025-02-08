import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { DicomStudy } from '../../types/dicom';

const StudyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
`;

const StudyItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

interface DicomListProps {
  studies: DicomStudy[];
}

export const DicomList: React.FC<DicomListProps> = ({ studies = [] }) => {
  const navigate = useNavigate();

  if (!studies || studies.length === 0) {
    return (
      <StudyList>
        <StudyItem>
          <StudyInfo>
            <h3>No studies available</h3>
            <p>Upload DICOM files to get started</p>
          </StudyInfo>
        </StudyItem>
      </StudyList>
    );
  }

  return (
    <StudyList>
      {studies.map(study => (
        <StudyItem key={study.study_instance_uid}>
          <StudyInfo>
            <h3>{study.study_description || 'Untitled Study'}</h3>
            <p>Date: {new Date(study.study_date).toLocaleDateString()}</p>
            <p>Type: {study.type}</p>
          </StudyInfo>
          <ViewButton onClick={() => navigate(`/dicom-viewer/${study.study_instance_uid}`)}>
            View Images
          </ViewButton>
        </StudyItem>
      ))}
    </StudyList>
  );
}; 