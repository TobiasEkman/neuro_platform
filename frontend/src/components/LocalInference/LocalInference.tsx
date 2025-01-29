import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import './styles/LocalInference.css';

interface PredictionResult {
    label: string;
    confidence: number;
}

interface ModelResponse {
    expires_at: string;
}

const LocalInference: React.FC = () => {
    const [model, setModel] = useState<tf.LayersModel | null>(null);
    const [keyExpirationTime, setKeyExpirationTime] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Array<{name: string; label?: string; confidence?: number; error?: string}>>([]);

    useEffect(() => {
        return () => {
            // Cleanup when component unmounts
            if (model) {
                model.dispose();
                tf.disposeVariables();
            }
        };
    }, [model]);

    const decryptModel = async (keyFile: File) => {
        try {
            setIsLoading(true);
            setError(null);
            const keyData = await keyFile.text();
            
            const response = await fetch('/api/local_inference/get_decryption_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key: keyData })
            });

            if (!response.ok) {
                throw new Error('Failed to decrypt model');
            }

            const result: ModelResponse = await response.json();
            setKeyExpirationTime(new Date(result.expires_at));
            
            // Load and warm up the model
            const loadedModel = await tf.loadLayersModel('/api/local_inference/get_decrypted_model/model_decrypted.json');
            
            // Warm up the model with proper typing
            const dummyTensor = tf.zeros([1, 224, 224, 3]);
            const warmupPrediction = loadedModel.predict(dummyTensor);
            
            if (Array.isArray(warmupPrediction)) {
                await Promise.all(warmupPrediction.map(t => t.data()));
                warmupPrediction.forEach(t => t.dispose());
            } else {
                await warmupPrediction.data();
                warmupPrediction.dispose();
            }
            
            dummyTensor.dispose();
            setModel(loadedModel);
            
            // Track successful model load
            await fetch('/api/local_inference/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'model_loaded',
                    timestamp: new Date().toISOString()
                })
            });
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const preprocessImage = async (img: ImageBitmap): Promise<tf.Tensor> => {
        return tf.tidy(() => {
            const tensor = tf.browser.fromPixels(img)
                .resizeBilinear([224, 224])
                .toFloat()
                .div(tf.scalar(255))
                .expandDims(0);
            return tensor;
        });
    };

    const formatPrediction = (prediction: Float32Array): PredictionResult => {
        const confidence = prediction[0];
        return {
            label: confidence > 0.5 ? 'Positive' : 'Negative',
            confidence: parseFloat((confidence * 100).toFixed(2))
        };
    };

    const handlePredict = async (files: FileList) => {
        if (!model) {
            setError('Please decrypt the model first');
            return;
        }

        const newResults = [];
        for (const file of Array.from(files)) {
            try {
                const img = await createImageBitmap(file);
                const tensor = await preprocessImage(img);
                
                // Type assertion and proper tensor handling
                const prediction = model.predict(tensor);
                let predictionData: Float32Array;
                
                if (Array.isArray(prediction)) {
                    // Handle case where model returns multiple tensors
                    predictionData = await prediction[0].data() as Float32Array;
                    prediction.forEach(t => t.dispose());
                } else {
                    // Handle single tensor output
                    predictionData = await prediction.data() as Float32Array;
                    prediction.dispose();
                }

                const result = formatPrediction(predictionData);
                
                newResults.push({
                    name: file.name,
                    label: result.label,
                    confidence: result.confidence
                });

                // Cleanup
                tensor.dispose();
                
            } catch (err) {
                console.error('Error processing image:', err);
                newResults.push({
                    name: file.name,
                    error: err instanceof Error ? err.message : 'Failed to process image'
                });
            }
        }

        setResults(newResults);
    };

    return (
        <div className="local-inference">
            <h2>Local Model Inference</h2>
            
            <div className="upload-section">
                <div className="key-upload">
                    <label htmlFor="keyFile">Upload Model Key (.key):</label>
                    <input
                        type="file"
                        id="keyFile"
                        accept=".key"
                        onChange={(e) => e.target.files?.[0] && decryptModel(e.target.files[0])}
                        disabled={isLoading}
                    />
                </div>

                <div className="image-upload">
                    <label htmlFor="imageFiles">Upload Images:</label>
                    <input
                        type="file"
                        id="imageFiles"
                        accept="image/*"
                        multiple
                        onChange={(e) => e.target.files && handlePredict(e.target.files)}
                        disabled={!model || isLoading}
                    />
                </div>
            </div>

            {isLoading && <div className="loading">Loading model...</div>}
            {error && <div className="error">{error}</div>}
            {keyExpirationTime && (
                <div className="key-expiration">
                    Key expires at: {keyExpirationTime.toLocaleString()}
                </div>
            )}

            {results.length > 0 && (
                <div className="results">
                    <h3>Results</h3>
                    {results.map((result, index) => (
                        <div key={index} className="result-item">
                            <span className="filename">{result.name}</span>
                            {result.error ? (
                                <span className="error">{result.error}</span>
                            ) : (
                                <span className="prediction">
                                    {result.label} ({result.confidence}%)
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocalInference; 