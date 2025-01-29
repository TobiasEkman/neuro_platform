import React, { useState } from 'react';
import { DicomImportResult } from '../../types/dicom';
import './styles/DicomManager.css';
import { dicomService } from '../../services/dicomService';

const DicomManager: React.FC = () => {
    const [folderPath, setFolderPath] = useState('');
    const [dicomdirPath, setDicomdirPath] = useState('');
    const [importResult, setImportResult] = useState<DicomImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const importFolder = async () => {
        try {
            const result = await dicomService.importFolder(folderPath);
            setImportResult(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };

    const importDicomdir = async () => {
        try {
            const response = await fetch('/api/dicom/parse/dicomdir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dicomdirPath }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to import DICOMDIR');
            }
            
            const result = await response.json();
            setImportResult(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };

    return (
        <div className="dicom-manager">
            <div className="card">
                <h2>DICOM Import</h2>
                
                <div className="import-section">
                    <h3>Import from Folder</h3>
                    <div className="input-group">
                        <input
                            type="text"
                            value={folderPath}
                            onChange={(e) => setFolderPath(e.target.value)}
                            placeholder="Enter folder path"
                        />
                        <button onClick={importFolder}>Import Folder</button>
                    </div>
                </div>

                <div className="import-section">
                    <h3>Import from DICOMDIR</h3>
                    <div className="input-group">
                        <input
                            type="text"
                            value={dicomdirPath}
                            onChange={(e) => setDicomdirPath(e.target.value)}
                            placeholder="Enter DICOMDIR path"
                        />
                        <button onClick={importDicomdir}>Import DICOMDIR</button>
                    </div>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {importResult && (
                    <div className="import-result">
                        <h3>Import Result</h3>
                        <p>{importResult.message}</p>
                        <p>Imported {importResult.studies.length} studies</p>
                        <ul>
                            {importResult.studies.map((study, index) => (
                                <li key={index}>
                                    Patient ID: {study.patient_id}<br />
                                    Study UID: {study.study_instance_uid}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DicomManager; 