import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const ActionContainer = styled(Link)`
  display: flex;
  padding: 1rem;
  margin: 1rem 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  align-items: center;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  font-size: 1.5rem;
  color: #3498db;
`;

const TextContent = styled.div`
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
`;

const Description = styled.p`
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
`;

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, title, description, to }) => {
  return (
    <ActionContainer to={to}>
      <IconWrapper>{icon}</IconWrapper>
      <TextContent>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </TextContent>
    </ActionContainer>
  );
};

export default QuickAction; 