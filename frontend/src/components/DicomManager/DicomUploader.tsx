import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { DicomImportResult } from '../../types/dicom';
import { patientService } from '../../services/patientService';
import { dicomService } from '../../services/dicomService';

interface DicomUploaderProps {
  onUploadComplete: (result: DicomImportResult) => void;
}

export const DicomUploader: React.FC<DicomUploaderProps> = ({ onUploadComplete }) => {
  const [pid, setPid] = useState('');
  
  const handleUpload = async (files: FileList) => {
    try {
      // First, validate PID exists using patientService
      const patient = await patientService.getPatientByPid(pid);
      if (!patient) {
        throw new Error('Please enter a valid Patient ID (PID) first');
      }

      // Then upload using dicomService.uploadFiles
      const result = await dicomService.uploadFiles(files);
      onUploadComplete(result);
    } catch (error) {
      console.error('Upload error:', error);
      // Handle error display
    }
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="Enter Patient ID (PID)" 
        value={pid}
        onChange={(e) => setPid(e.target.value)}
      />
      <FileUpload onUpload={handleUpload} />
    </div>
  );
}; 