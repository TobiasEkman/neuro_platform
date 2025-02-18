import styled from 'styled-components';

export const ViewerContainer = styled.div`
  padding: 2rem;
  background: ${props => props.theme.colors.background.primary};
  min-height: 100vh;
`;

export const ViewerLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
`;

export const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.background.secondary};
  border-radius: 8px;
`;

export const ErrorMessage = styled.div`
  background-color: ${props => props.theme.colors.error};
  color: white;
  padding: 1rem;
  margin: 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
`; 