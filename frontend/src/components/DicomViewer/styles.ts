import styled from 'styled-components';

export const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.colors.background.primary};
`;

export const ControlsContainer = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  gap: 1rem;
  align-items: center;
`;

export const ViewerLayout = styled.div`
  flex: 1;
  display: grid;
  gap: 1rem;
  padding: 1rem;

  &.single {
    grid-template-columns: 1fr;
  }

  &.mpr {
    grid-template-columns: repeat(3, 1fr);
  }
`; 