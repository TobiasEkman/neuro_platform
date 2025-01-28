import React, { useState, useEffect } from 'react';
import { usePatient } from '../context/PatientContext';

export const MedicalDocumentation: React.FC = () => {
  const { patient } = usePatient();
  const [transcription, setTranscription] = useState('');
  const [icdCodes, setIcdCodes] = useState([]);
  const [journalEntry, setJournalEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setTranscription(data.text);
    };

    setMediaRecorder(recorder);
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
  };

  return (
    <div className="medical-documentation">
      <div className="voice-transcription">
        <h3>Voice Transcription</h3>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <textarea 
          value={transcription} 
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Transcribed text will appear here..."
        />
      </div>

      <div className="coding-suggestions">
        <h3>ICD-10 Coding Suggestions</h3>
        <button onClick={() => {/* Request ICD codes */}}>
          Get ICD Codes
        </button>
        {/* Display ICD codes */}
      </div>

      <div className="journal-generation">
        <h3>AI Journal Generation</h3>
        <button onClick={() => {/* Generate journal */}}>
          Generate Journal Entry
        </button>
        <textarea
          value={journalEntry}
          readOnly
          placeholder="Generated journal entry will appear here..."
        />
      </div>
    </div>
  );
}; 