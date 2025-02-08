import React, { ChangeEvent } from 'react';
import styled from 'styled-components';

// Utöka InputHTMLAttributes med våra custom attribut
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

interface Props {
  onUpload: (files: FileList) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<Props> = ({ onUpload, disabled }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onUpload(event.target.files);
    }
  };

  return (
    <UploadContainer>
      <StyledInput
        type="file"
        id="file-upload"
        onChange={handleChange}
        webkitdirectory=""
        directory=""
        multiple
        disabled={disabled}
      />
      <UploadLabel htmlFor="file-upload" disabled={disabled}>
        {disabled ? 'Uploading...' : 'Choose DICOM folder'}
      </UploadLabel>
    </UploadContainer>
  );
};

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const StyledInput = styled.input<CustomInputProps>`
  display: none;
`;

const UploadLabel = styled.label<{ disabled?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.disabled ? '#ccc' : props.theme.colors.primary};
  color: white;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: opacity 0.2s;

  &:hover {
    opacity: ${props => props.disabled ? 1 : 0.9};
  }
`; 