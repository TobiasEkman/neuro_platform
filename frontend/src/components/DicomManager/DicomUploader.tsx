import React, { useState } from 'react';

interface DicomUploaderProps {
  onUploadComplete: (result: DicomImportResult) => void;
}

export const DicomUploader: React.FC<DicomUploaderProps> = ({ onUploadComplete }) => {
  const [pid, setPid] = useState('');
  
  const handleUpload = async (files: FileList) => {
    try {
      // First, validate PID exists
      const response = await fetch(`${PATIENT_SERVICE_URL}/patients/pid/${pid}`);
      if (!response.ok) {
        throw new Error('Please enter a valid Patient ID (PID) first');
      }

      // Then upload to imaging service
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));
      formData.append('pid', pid); // Add PID to form data

      const uploadResponse = await fetch(`${IMAGING_SERVICE_URL}/dicom/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload DICOM files');
      }

      const result = await uploadResponse.json();
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
      <FileUpload onFilesSelected={handleUpload} />
    </div>
  );
}; 