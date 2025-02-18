import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import dicomService from '../../../services/dicomService';
import { DicomStudy } from '../../../types/dicom';

const WelcomeContainer = styled.div`
  padding: 2rem;
  text-align: center;
  max-width: 1000px;
  margin: 0 auto;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
`;

const Message = styled.p`
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const StyledLink = styled(Link)`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: 4px;
  
  &:hover {
    opacity: 0.9;
  }
`;

const StudyList = styled.div`
  margin-top: 2rem;
  width: 100%;
  text-align: left;
`;

const StudyItem = styled.div`
  padding: 1rem;
  margin: 0.5rem 0;
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr;
  gap: 1rem;
  align-items: center;
  
  &:hover {
    background: #f5f5f5;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
`;

const StudyHeader = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 0.5rem 1rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text.secondary};
`;

const LoadingMessage = styled.div`
  margin-top: 1rem;
  color: ${props => props.theme.colors.text.secondary};
`;

export const WelcomeView: React.FC = () => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const fetchedStudies = await dicomService.searchStudies('');
        console.log('Available studies:', fetchedStudies);
        setStudies(fetchedStudies);
      } catch (error) {
        console.error('Failed to fetch studies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudies();
  }, []);

  const handleStudySelect = (study: DicomStudy) => {
    navigate('/dicom-viewer', { 
      state: { studyId: study.study_instance_uid }
    });
  };

  return (
    <WelcomeContainer>
      <Title>Welcome to DICOM Viewer</Title>
      <Message>
        Select a study below or manage your DICOM files
      </Message>
      <StyledLink to="/dicom-manager">
        Go to DICOM Manager
      </StyledLink>

      <StudyList>
        {loading ? (
          <LoadingMessage>Loading available studies...</LoadingMessage>
        ) : studies.length > 0 ? (
          <>
            <StudyHeader>
              <div>Description</div>
              <div>Patient ID</div>
              <div>Date</div>
              <div>Series</div>
            </StudyHeader>
            {studies.map(study => (
              <StudyItem 
                key={study.study_instance_uid}
                onClick={() => handleStudySelect(study)}
              >
                <h3>{study.description || 'Untitled Study'}</h3>
                <div>{study.patient_id}</div>
                <div>{new Date(study.study_date).toLocaleDateString()}</div>
                <div>{study.series?.length || 0}</div>
              </StudyItem>
            ))}
          </>
        ) : (
          <Message>No studies available. Upload some DICOM files in the DICOM Manager.</Message>
        )}
      </StudyList>
    </WelcomeContainer>
  );
}; 