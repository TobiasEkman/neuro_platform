import styled from 'styled-components';

export const Container = styled.div`
  padding: 2rem;
`;

export const Title = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 2rem;
`;

export const ApproachSelector = styled.div`
  margin-bottom: 2rem;

  select {
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid ${props => props.theme.colors.border};
  }
`;

export const AnalysisResults = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

export const Metrics = styled.div`
  display: grid;
  gap: 1rem;
`;

export const MetricItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  label {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

export const RiskAnalysis = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const VesselInvolvement = styled(RiskAnalysis)``;

export const RiskList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;

  li {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background: ${props => props.theme.colors.background.warning};
    color: ${props => props.theme.colors.text.warning};
    border-radius: 4px;
  }
`;

export const VesselList = styled(RiskList)`
  li {
    background: ${props => props.theme.colors.background.danger};
    color: ${props => props.theme.colors.text.danger};
  }
`;

export const Visualization = styled.div`
  margin-top: 2rem;
  height: 500px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const ProgressIndicator = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .progress-bar {
    width: 100%;
    height: 0.5rem;
    background: ${props => props.theme.colors.background.secondary};
    border-radius: 0.25rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .progress {
    height: 100%;
    background: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }

  p {
    margin: 0;
    color: ${props => props.theme.colors.text.secondary};
  }
`;

export const MGMTResults = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin-top: 0;
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  .mgmt-status, .confidence, .methylation-score {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    
    label {
      font-weight: 500;
      color: #666;
    }
    
    span {
      font-weight: 600;
      color: #2c3e50;
    }
  }
`;

export const SegmentationControls = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const ModelSelector = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;

    input[type="checkbox"] {
      width: 1.2rem;
      height: 1.2rem;
    }
  }
`;

export const AnalysisLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
`;

export const ViewerContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

export const ControlPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ProcessingSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const StepContainer = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 1rem 0;
    color: ${props => props.theme.colors.text.primary};
  }

  select {
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    border: 1px solid ${props => props.theme.colors.border};
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

export const ResultsPanel = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const ImageSelector = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;

  h3 {
    margin: 0 0 1rem 0;
    color: ${props => props.theme.colors.text.primary};
  }

  p {
    color: ${props => props.theme.colors.text.secondary};
  }
`; 