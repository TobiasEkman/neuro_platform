import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  display: none;
`;

const UploadButton = styled.label`
  padding: 10px 20px;
  background: #4a90e2;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #357abd;
  }
`;

interface FileUploadProps {
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept, multiple }) => (
  <div>
    <StyledInput
      type="file"
      id="file-upload"
      onChange={onUpload}
      accept={accept}
      multiple={multiple}
    />
    <UploadButton htmlFor="file-upload">
      Upload DICOM Files
    </UploadButton>
  </div>
); 