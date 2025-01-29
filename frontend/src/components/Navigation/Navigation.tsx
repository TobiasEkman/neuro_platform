import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FaHome, 
  FaImages, 
  FaBrain, 
  FaChartLine, 
  FaClipboardList,
  FaCube,
  FaSearch
} from 'react-icons/fa';

const NavContainer = styled.nav`
  background: #1a237e;
  color: white;
  padding: 2rem 1rem;
  height: 100%;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: ${props => props.$active ? 'white' : 'rgba(255,255,255,0.7)'};
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  background: ${props => props.$active ? 'rgba(255,255,255,0.1)' : 'transparent'};

  &:hover {
    background: rgba(255,255,255,0.1);
    color: white;
  }

  svg {
    font-size: 1.25rem;
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  padding: 0 1rem;
`;

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <NavContainer>
      <Logo>NeuroNav</Logo>
      <NavLink to="/" $active={location.pathname === '/'}>
        <FaHome /> Dashboard
      </NavLink>
      <NavLink to="/dicom-manager" $active={location.pathname === '/dicom-manager'}>
        <FaImages /> DICOM Manager
      </NavLink>
      <NavLink to="/tumor-analysis" $active={location.pathname === '/tumor-analysis'}>
        <FaBrain /> Tumor Analysis
      </NavLink>
      <NavLink to="/icp-monitoring" $active={location.pathname === '/icp-monitoring'}>
        <FaChartLine /> ICP Monitoring
      </NavLink>
      <NavLink to="/preop-planning" $active={location.pathname === '/preop-planning'}>
        <FaClipboardList /> Preop Planning
      </NavLink>
      <NavLink to="/simulator" $active={location.pathname === '/simulator'}>
        <FaCube /> 3D Simulator
      </NavLink>
      <NavLink to="/dicom-viewer" $active={location.pathname === '/dicom-viewer'}>
        <FaSearch /> DICOM Viewer
      </NavLink>
    </NavContainer>
  );
}; 