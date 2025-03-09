import React, { useState } from 'react';
import styled from 'styled-components';
import { FaFolder } from 'react-icons/fa';

// Utöka File-typen för att inkludera path
interface CustomFile extends File {
  path?: string;
  webkitRelativePath: string;
}

// Uppdatera input-attributen
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

interface FileUploadProps {
  onDirectorySelect: (path: string) => void;
  disabled?: boolean;
  basePath?: string;
}

// Skapa en custom styled input-komponent
const HiddenInput = styled.input.attrs<CustomInputProps>({
  type: 'file',
  webkitdirectory: '',
  directory: ''
})<CustomInputProps>`
  display: none;
`;

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onDirectorySelect, 
  disabled
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');

  const handleSelect = (path: string) => {
    setCurrentPath(path);
    onDirectorySelect(path);
  };

  return (
    <UploadContainer>
      <HiddenInput
        disabled={disabled}
        id="dicom-directory-input"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            // Använd typade filer
            const file = files[0] as CustomFile;
            const fullPath = file.path || file.webkitRelativePath;
            handleSelect(fullPath);
          }
        }}
      />
      <UploadButton
        disabled={disabled}
        onClick={() => document.getElementById('dicom-directory-input')?.click()}
      >
        <FaFolder style={{ marginRight: '8px' }} />
        {disabled ? 'Processing...' : 'Select DICOM Directory'}
      </UploadButton>
      {currentPath && (
        <PathDisplay>
          Selected: {currentPath}
        </PathDisplay>
      )}
    </UploadContainer>
  );
};

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  background: ${props => props.theme.colors.background.secondary};
`;

const UploadButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: ${props => props.disabled ? 
    props.theme.colors.background.disabled : 
    props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.disabled ? 
      props.theme.colors.background.disabled : 
      props.theme.colors.primaryDark};
    transform: ${props => props.disabled ? 'none' : 'translateY(-1px)'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(0)'};
  }
`;

const PathDisplay = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
  text-align: center;
  word-break: break-all;
  max-width: 100%;
  padding: 0.5rem;
  background: ${props => props.theme.colors.background.primary};
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
`; 