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