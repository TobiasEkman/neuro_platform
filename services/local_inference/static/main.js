let model = null;
let keyExpirationTime = null;

async function updateTimer() {
    if (keyExpirationTime) {
        const now = new Date();
        const timeLeft = Math.max(0, (keyExpirationTime - now) / 1000);
        document.getElementById('key-timer').textContent = 
            `Time remaining on the key: ${Math.floor(timeLeft)} seconds`;
        
        if (timeLeft <= 0) {
            model = null;
            document.getElementById('predict-button').style.display = 'none';
            tf.disposeVariables(); // Cleanup TensorFlow memory
        }
    }
}

async function decryptModel() {
    const keyFile = document.getElementById('keyFile').files[0];
    if (!keyFile) {
        alert('Please select a key file');
        return;
    }

    const keyData = await keyFile.text();
    
    try {
        const response = await fetch('/get_decryption_key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: keyData })
        });

        if (!response.ok) {
            throw new Error('Failed to decrypt model');
        }

        const result = await response.json();
        keyExpirationTime = new Date(result.expires_at);
        
        // Load and warm up the model
        try {
            model = await tf.loadLayersModel('/get_decrypted_model/model_decrypted.json');
            
            // Warm up the model with a dummy tensor
            const dummyTensor = tf.zeros([1, 224, 224, 3]);
            await model.predict(dummyTensor).data();
            dummyTensor.dispose();
            
            document.getElementById('predict-button').style.display = 'block';
            document.getElementById('key-timer').style.display = 'block';
            setInterval(updateTimer, 1000);
        } catch (modelError) {
            console.error('Error loading model:', modelError);
            alert('Error loading model. Please try again.');
        }
        
    } catch (error) {
        alert('Error decrypting model: ' + error.message);
    }
}

async function preprocessImage(img) {
    // Return a preprocessed tensor
    return tf.tidy(() => {
        // Convert image to tensor
        const tensor = tf.browser.fromPixels(img)
            .resizeNearestNeighbor([224, 224]) // Standard input size
            .toFloat();

        // Normalize to [-1, 1]
        const normalized = tensor.div(127.5).sub(1);
        
        // Add batch dimension
        return normalized.expandDims(0);
    });
}

function formatPrediction(prediction, threshold = 0.5) {
    // Format prediction based on model type
    // This is an example for binary classification
    const confidence = prediction[0];
    const label = confidence > threshold ? 'Positive' : 'Negative';
    return {
        label,
        confidence: (confidence * 100).toFixed(2) + '%'
    };
}

async function predict() {
    if (!model) {
        alert('Please decrypt the model first');
        return;
    }

    const files = document.getElementById('file').files;
    if (files.length === 0) {
        alert('Please select image files');
        return;
    }

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<h3>Processing Results:</h3>';

    // Show loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = 'Processing images...';
    resultDiv.appendChild(loadingDiv);

    try {
        for (let file of files) {
            const resultElement = document.createElement('div');
            resultElement.className = 'prediction-result';
            
            try {
                // Create image bitmap
                const img = await createImageBitmap(file);
                
                // Preprocess image
                const tensor = await preprocessImage(img);
                
                // Run inference
                const predictions = await model.predict(tensor).data();
                
                // Format results
                const result = formatPrediction(predictions);
                
                // Display results
                resultElement.innerHTML = `
                    <strong>${file.name}</strong><br>
                    Classification: ${result.label}<br>
                    Confidence: ${result.confidence}
                `;
                
                // Cleanup
                tensor.dispose();
                
            } catch (error) {
                console.error('Error processing image:', error);
                resultElement.innerHTML = `
                    <strong>${file.name}</strong><br>
                    Error: Failed to process image
                `;
            }
            
            resultDiv.appendChild(resultElement);
        }
    } finally {
        // Remove loading message
        loadingDiv.remove();
    }
}

// Memory cleanup when navigating away
window.addEventListener('beforeunload', () => {
    if (model) {
        tf.disposeVariables();
    }
});

document.getElementById('decrypt-button').addEventListener('click', decryptModel);
document.getElementById('predict-button').addEventListener('click', predict); 