import React from 'react';
import styled from 'styled-components';
import { PostopPlan } from '../../types/simulator';

const Container = styled.div`
  padding: 40px;
  background: white;
  min-height: 100vh;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 30px;
`;

const Section = styled.div`
  margin-bottom: 30px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
`;

const SubTitle = styled.h2`
  color: #34495e;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Button = styled.button`
  background: #3498db;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InfoPanel = styled.div`
  background: #fff;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
`;

interface PostopCareProps {
  onComplete: () => void;
  postopData: PostopPlan;
  setPostopData: (data: PostopPlan) => void;
}

const PostopCare: React.FC<PostopCareProps> = ({ 
  onComplete, 
  postopData, 
  setPostopData 
}) => {
  const handleChange = (field: string, value: string) => {
    setPostopData({
      ...postopData,
      recoveryPlan: {
        ...postopData.recoveryPlan,
        [field]: value
      }
    } as PostopPlan);
  };

  const isComplete = () => {
    const required = ['mobilization', 'nutrition', 'woundCare', 'painManagement'];
    return required.every(field => postopData.recoveryPlan[field as keyof typeof postopData.recoveryPlan]);
  };

  return (
    <Container>
      <Title>Post-operative Care Plan</Title>

      <Section>
        <SubTitle>Recovery Plan</SubTitle>
        
        <FormGroup>
          <Label>Mobilization Plan</Label>
          <Select
            value={postopData.recoveryPlan.mobilization}
            onChange={(e) => handleChange('mobilization', e.target.value)}
          >
            <option value="">Select mobilization plan...</option>
            <option value="early">Early Mobilization (within 24h)</option>
            <option value="gradual">Gradual Mobilization (2-3 days)</option>
            <option value="delayed">Delayed Mobilization (3+ days)</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Nutrition Plan</Label>
          <Select
            value={postopData.recoveryPlan.nutrition}
            onChange={(e) => handleChange('nutrition', e.target.value)}
          >
            <option value="">Select nutrition plan...</option>
            <option value="regular">Regular Diet</option>
            <option value="soft">Soft Diet</option>
            <option value="liquid">Liquid Diet</option>
            <option value="npo">NPO with IV Fluids</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Wound Care</Label>
          <Select
            value={postopData.recoveryPlan.woundCare}
            onChange={(e) => handleChange('woundCare', e.target.value)}
          >
            <option value="">Select wound care plan...</option>
            <option value="daily">Daily Dressing Change</option>
            <option value="alternate">Alternate Day Dressing</option>
            <option value="weekly">Weekly Dressing</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Pain Management</Label>
          <Select
            value={postopData.recoveryPlan.painManagement}
            onChange={(e) => handleChange('painManagement', e.target.value)}
          >
            <option value="">Select pain management...</option>
            <option value="oral">Oral Analgesics</option>
            <option value="iv">IV Analgesics</option>
            <option value="pca">Patient-Controlled Analgesia</option>
          </Select>
        </FormGroup>

        <InfoPanel>
          <SubTitle>Monitoring Requirements</SubTitle>
          <ul>
            <li>Neurological checks every 1 hour for first 24 hours</li>
            <li>Vital signs every 4 hours</li>
            <li>Daily wound inspection</li>
            <li>Pain score assessment every shift</li>
          </ul>
        </InfoPanel>

        <Button 
          onClick={onComplete}
          disabled={!isComplete()}
        >
          Complete Post-op Care Plan
        </Button>
      </Section>
    </Container>
  );
};

export default PostopCare; 