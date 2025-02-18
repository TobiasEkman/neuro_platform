import React, { ChangeEvent } from 'react';
import styled from 'styled-components';

// Define custom attributes for input element
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

interface Props {
  onDirectorySelect: (path: string) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<Props> = ({ onDirectorySelect, disabled }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    // Get the full path from the first file
    const fullPath = fileList[0].webkitRelativePath;
    // Get only the top-level directory name
    const directoryName = fullPath.split('/')[0];
    
    console.log('Selected directory name:', directoryName);
    onDirectorySelect(directoryName);
  };

  return (
    <UploadContainer>
      <input
        type="file"
        {...({ webkitdirectory: '', directory: '' } as CustomInputProps)}
        onChange={handleChange}
        style={{ display: 'none' }}
        id="directory-input"
      />
      <UploadButton
        onClick={() => document.getElementById('directory-input')?.click()}
        disabled={disabled}
      >
        Select DICOM Directory
      </UploadButton>
    </UploadContainer>
  );
};

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const UploadButton = styled.button<{ disabled?: boolean }>`
  padding: 0.75rem 1.5rem;
  background: ${props => props.disabled ? '#ccc' : props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: opacity 0.2s;

  &:hover {
    opacity: ${props => props.disabled ? 1 : 0.9};
  }
`; 