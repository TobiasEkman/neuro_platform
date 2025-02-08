import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import * as tf from '@tensorflow/tfjs';

const Container = styled.div`
  background-color: #ffffff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
  text-align: center;
`;

const Title = styled.h1`
  color: #333333;
  font-size: 28px;
  margin-bottom: 20px;
`;

const Description = styled.p`
  color: #666666;
  margin-bottom: 20px;
  font-size: 16px;
`;

const FileInput = styled.input`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #dddddd;
  width: 100%;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background-color: #4CAF50;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  margin: 10px;

  &:hover {
    background-color: #45a049;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ResultArea = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 5px;
  border: 1px solid #dddddd;
  text-align: left;
`;

const Instructions = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #e0e0e0;
  border-radius: 5px;
  text-align: left;

  h2 {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  ul, ol {
    padding-left: 20px;
  }

  li {
    margin-bottom: 0.5rem;
  }
`;

const Timer = styled.p`
  font-weight: bold;
  color: #d9534f;
  margin-top: 20px;
`;

const LocalInference: React.FC = () => {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [images, setImages] = useState<FileList | null>(null);
  const [predictions, setPredictions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  const handleKeyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setKeyFile(e.target.files[0]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(e.target.files);
    }
  };

  const decryptModel = async () => {
    setIsDecrypting(true);
    try {
      // Simulera modell-dekryptering
      const loadedModel = await tf.loadLayersModel('/path/to/model.json');
      setModel(loadedModel);
      setTimeRemaining(3600); // 1 timme
    } catch (error) {
      console.error('Error decrypting model:', error);
    }
    setIsDecrypting(false);
  };

  const predict = async () => {
    if (!model || !images) return;
    
    setIsPredicting(true);
    try {
      const predictions = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        // Konvertera bild till tensor och gör prediktion
        // Detta är en förenklad version
        const tensor = await tf.browser.fromPixels(await createImageBitmap(image));
        const prediction = await model.predict(tensor.expandDims(0));
        predictions.push(prediction.toString());
      }
      setPredictions(predictions);
    } catch (error) {
      console.error('Error making predictions:', error);
    }
    setIsPredicting(false);
  };

  return (
    <Container>
      <Title>Secure Cloud-Based AI Inference</Title>
      <Description>Developed by Tobias Ekman</Description>

      <label>Upload Encryption Key (.key):</label>
      <FileInput 
        type="file" 
        accept=".key" 
        onChange={handleKeyUpload}
        disabled={isDecrypting || model !== null}
      />

      <label>Upload Handwritten Digit Images:</label>
      <FileInput 
        type="file" 
        accept="image/*" 
        multiple 
        onChange={handleImageUpload}
        disabled={!model || isPredicting}
      />

      <Button 
        onClick={decryptModel} 
        disabled={!keyFile || isDecrypting || model !== null}
      >
        {isDecrypting ? 'Decrypting...' : 'Decrypt Model'}
      </Button>

      <Button 
        onClick={predict}
        disabled={!model || !images || isPredicting}
      >
        {isPredicting ? 'Processing...' : 'Predict'}
      </Button>

      {predictions.length > 0 && (
        <ResultArea>
          <h3>Predictions:</h3>
          {predictions.map((pred, idx) => (
            <div key={idx}>Image {idx + 1}: {pred}</div>
          ))}
        </ResultArea>
      )}

      {timeRemaining !== null && (
        <Timer>Time remaining on the key: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</Timer>
      )}

      <Instructions>
        <h2>Description</h2>
        <strong>This application is a flexible solution for AI inference on medical data. The approach ensures that patient data never leaves the hospital premises, leveraging cloud infrastructure for secure model deployment while performing inference locally using TensorFlow.js.</strong>
        
        <h2>Technical Implementation:</h2>
        <ol>
          <li><strong>Architecture Overview:</strong>
            <ul>
              <li><strong>Container on AWS:</strong>
                <ul>
                  <li><strong>Docker Container:</strong> The Docker container is hosted on AWS and includes the encrypted AI model, the decryption logic, and the code necessary for model inference.</li>
                  <li><strong>Web Interface:</strong> The container hosts a web-based interface that hospital staff can access via a secure HTTPS connection (currently HTTP in demo). This interface guides them through the process of decrypting the model, uploading images, and viewing the results.</li>
                </ul>
              </li>
              <li><strong>Local Data Processing:</strong>
                <ul>
                  <li><strong>Local Execution:</strong> The model is decrypted on the server and sent to the user's browser, where TensorFlow.js runs the inference directly in the user's browser, ensuring that sensitive data remains within the hospital's local network.</li>
                </ul>
              </li>
            </ul>
          </li>
          <li><strong>Workflow Details:</strong>
            <ul>
              <li><strong>Step 1: User Accesses Application</strong>
                <ul>
                  <li><strong>Access Interface:</strong> The hospital staff accesses the application through a web browser by navigating to the secure URL hosted on AWS.</li>
                </ul>
              </li>
              <li><strong>Step 2: Model Decryption</strong>
                <ul>
                  <li><strong>Secure Model Decryption:</strong> Once authenticated, the user triggers the decryption process. The server decrypts the AI model using the provided key, and the decrypted model is then sent to the user's browser.</li>
                </ul>
              </li>
              <li><strong>Step 3: Local Data Processing</strong>
                <ul>
                  <li><strong>Image Processing:</strong> The user uploads patient images through the web interface. These images are processed locally using the decrypted AI model in the browser with TensorFlow.js. The processing (inference) is done entirely within the hospital's premises.</li>
                  <li><strong>Display Results:</strong> Once processing is complete, the results are displayed directly within the web interface. No patient data is transmitted back to the cloud during this process.</li>
                </ul>
              </li>
              <li><strong>Step 4: Cleanup</strong>
                <ul>
                  <li><strong>Automatic Cleanup:</strong> After processing, the decrypted model is automatically removed from the local environment. This ensures that no sensitive information remains on the client machine. Additionally, the time-limited encryption key ensures that even if the encrypted model is accessed again, it cannot be decrypted without a new valid key.</li>
                </ul>
              </li>
            </ul>
          </li>
        </ol>
        
        <h2>User Experience:</h2>
        <ul>
          <li><strong>Seamless Interaction:</strong> From the user's perspective, the entire process is seamless. They access a web interface, initiate the model decryption, upload images, and receive results—all within a single, cohesive workflow.</li>
          <li><strong>No Technical Expertise Required:</strong> The complex processes of model decryption, inference, and cleanup are handled behind the scenes, abstracted away from the user.</li>
        </ul>
        
        <h2>Conclusion:</h2>
        <strong>This hybrid approach allows the hospital to maintain strict control over patient data while leveraging cloud infrastructure for hosting and managing the AI model. The result is a secure, scalable, and user-friendly solution that ensures patient privacy and complies with healthcare regulations.</strong>
      </Instructions>
    </Container>
  );
};

export default LocalInference; 