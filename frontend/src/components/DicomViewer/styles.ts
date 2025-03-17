import styled from 'styled-components';

export const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #1e1e1e;
  color: white;
`;

export const ToolbarContainer = styled.div`
  display: flex;
  gap: 5px;
  padding: 8px;
  background-color: #333;
  border-bottom: 1px solid #555;
`;

export const MainContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

export const SidePanel = styled.div`
  width: 250px;
  min-width: 250px;
  height: 100%;
  overflow-y: auto;
  background: #2d2d2d;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid #444;
`;

export const ViewerPanel = styled.div`
  position: relative;
  flex: 1;
  background: black;
  display: flex;
  flex-direction: column;
`;

export const InfoPanel = styled.div`
  width: 250px;
  min-width: 250px;
  height: 100%;
  overflow-y: auto;
  background: #2d2d2d;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-left: 1px solid #444;
`;

export const ControlsContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  display: flex;
  justify-content: center;
`;

export const ImageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  button {
    background: #333;
    color: white;
    border: 1px solid #555;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      background: #444;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

export const ViewerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 1rem;
  flex: 1;
  padding: 1rem;
  background: black;
`;

export const Canvas = styled.div`
  width: 100%;
  height: 100%;
  outline: none;
`;

export const Controls = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 1rem;
  border-radius: 4px;
  color: white;
`;

export const SliceSlider = styled.input`
  flex: 1;
  width: 100%;
`;

export const ViewerLabel = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
`;

export const SegmentationOverlay = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

export const SideNav = styled.nav`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 60px;
  background: ${props => props.theme.colors.background.secondary};
  border-right: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  z-index: 100;
`;

export const SideNavItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0;
  color: ${props => props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  span {
    font-size: 0.7rem;
    text-align: center;
  }

  &:hover {
    color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.background.hover};
  }
`;

export const ListContainer = styled.div`
  flex: 0 0 300px;
  overflow-y: auto;
  padding: 1rem;
  background: ${props => props.theme.colors.background.secondary};
`;

export const ListItem = styled.div<{ isSelected?: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${props => props.isSelected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.background.hover};
    color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  }
`;

export const ListTitle = styled.h3`
  margin: 0 0 1rem 0;
  padding: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const SeriesItem = styled.div<{ isSelected: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${props => props.isSelected ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isSelected ? '#ffffff' : props.theme.colors.text.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:hover {
    background: ${props => props.isSelected ? props.theme.colors.primary : props.theme.colors.background.hover};
  }
`;

export const ToolButton = styled.button<{ isActive: boolean }>`
  padding: 8px;
  border: 1px solid ${props => props.isActive ? '#1976d2' : '#ccc'};
  background-color: ${props => props.isActive ? '#e3f2fd' : 'white'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: ${props => props.isActive ? '#bbdefb' : '#f5f5f5'};
  }
`; 