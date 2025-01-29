import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-top: 1rem;
`;

const Button = styled.button`
  margin-right: 1rem;
`;

const MedicalDocumentation: React.FC = () => {
  const [transcription, setTranscription] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = () => {
    setIsRecording(true);
    // Implement recording logic
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Implement stop recording logic
  };

  return (
    <Container>
      <h1>Medical Documentation</h1>
      
      <Section>
        <h2>Voice Transcription</h2>
        <Button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <TextArea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Transcribed text will appear here..."
        />
      </Section>

      <Section>
        <h2>ICD-10 Coding Suggestions</h2>
        <Button>Get ICD Codes</Button>
        {/* Add ICD code suggestions here */}
      </Section>

      <Section>
        <h2>AI Journal Generation</h2>
        <Button>Generate Journal Entry</Button>
        <TextArea
          readOnly
          placeholder="Generated journal entry will appear here..."
        />
      </Section>
    </Container>
  );
};

export default MedicalDocumentation; 