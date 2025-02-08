// Service for interacting with medical_documentation Flask service (port 5002)
class DocumentationService {
  async generateJournal(patientData: any) {
    const eventSource = new EventSource('/api/journal/generate');
    
    return new Promise((resolve, reject) => {
      let journalText = '';
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          eventSource.close();
          reject(new Error(data.error));
          return;
        }
        
        journalText += data.text;
        if (data.complete) {
          eventSource.close();
          resolve(journalText);
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error('Journal generation failed'));
      };
    });
  }

  async transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to transcribe audio');
    return response.json();
  }

  async getICDCodes(text: string) {
    const response = await fetch('/api/coding/icd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Failed to get ICD codes');
    return response.json();
  }
}

export const documentationService = new DocumentationService(); 