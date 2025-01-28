NEUROSURGERY PLATFORM
====================

TECHNICAL ARCHITECTURE

A comprehensive platform for neurosurgical planning, monitoring, and analysis.

CORE COMPONENTS

1. Frontend (React + TypeScript)
- Modern SPA architecture with real-time monitoring
- Key features:
  * Patient dashboard with vital metrics
  * Real-time ICP monitoring with alerts
  * 3D tumor visualization using Three.js
  * Surgical approach planning interface
  * ICD coding assistance
  * DICOM data management interface
- Shared Components:
  * PatientHeader: Consistent patient info display
  * ServiceStatus: Service health monitoring
  * CommonControls: Reusable UI controls
- Global State Management:
  * PatientContext: Patient data management
  * ServicesContext: Service status tracking
- Unified Styling:
  * Shared CSS components
  * Consistent theming
  * Responsive layouts
- Technologies: React 18, TypeScript, Chart.js, Three.js

2. Main API (Node.js + Express)
- Central orchestration layer
- Handles:
  * Patient data management
  * Authentication/Authorization
  * Request routing to microservices
  * Data aggregation
  * DICOM import coordination
- Technologies: Node.js, Express, TypeScript, Mongoose

3. Tumor Analysis Service (Flask)
- Specialized Python microservice for:
  * Tumor segmentation
  * Critical structure identification
  * Surgical approach risk analysis
  * MGMT methylation status prediction
  * Molecular marker analysis
- Technologies: Flask, TensorFlow, NumPy, PyDICOM

4. ICP Monitoring Service (Flask)
- Dedicated service for:
  * Real-time ICP trend analysis
  * ICP prediction and alerting
  * Risk factor analysis
- Technologies: Flask, TensorFlow, NumPy

5. Model Training Service (Flask)
- Dedicated service for:
  * Training tumor classification models
  * ICP prediction model training
  * Model versioning and storage
- Technologies: Flask, TensorFlow, Keras

6. Medical Documentation Service (Flask)
- Natural language processing for:
  * ICD-10 code suggestions
  * Procedure coding
  * Clinical text analysis
  * Journal generation
  * Voice transcription
- Technologies: Flask, Transformers, PyTorch, Whisper

7. Imaging Data Service (Flask)
- DICOM data management:
  * Folder-based DICOM import
  * DICOMDIR parsing
  * Study/Series organization
  * DICOM metadata extraction
  * Advanced search functionality
  * Image data organization
- Technologies: Flask, PyDICOM, PyMongo

8. Simulator Service (Flask)
- Neurosurgical simulation features:
  * Session management and tracking
  * Performance metrics collection
  * Crisis scenario management
  * Real-time vital sign monitoring
  * Procedure step tracking
  * Medication management
- Technologies: Flask, PyMongo

8. Data Storage
- MongoDB:
  * Patient metadata
  * Analysis results
  * Model metadata
  * System logs
  * DICOM metadata
- Local DICOM storage:
  * Raw imaging data
  * Segmentation masks
  * Analysis outputs

API ENDPOINTS

1. Main API (port 4000)
- /api/patients: Patient management
- /api/analysis: Analysis routing
- /api/icp: ICP monitoring
- /api/dicom: DICOM management

2. Tumor Analysis Service (port 5005)
- /api/analysis/tumor: Tumor analysis
- /api/analysis/mgmt/{study_id}: MGMT methylation status prediction

3. ICP Monitoring Service (port 5006)
- /api/analysis/icp/predict: ICP prediction

4. Training Service (port 5001)
- /api/training/tumor: Model training
- /api/training/icp: ICP model training

5. Clinical Coding (port 5002)
- /api/coding/icd: ICD code suggestions
- /api/coding/procedure: Procedure coding
- /api/journal/generate: AI-powered journal generation
- /api/transcribe: Voice transcription service

6. DICOM Service (port 5003)
- /api/dicom/parse/folder: Parse DICOM folder
- /api/dicom/parse/dicomdir: Parse DICOMDIR file
- /api/search: Fuzzy search across DICOM data

7. Simulator Service (port 5007)
- /api/simulator/*: Simulator endpoints
  - /session: Create and manage simulation sessions
  - /metrics: Track performance metrics
  - /procedures: Get surgical procedures
  - /medications: Get available medications
  - /crisis: Handle crisis events
  - /vital-signs: Get patient vital signs

DEVELOPMENT SETUP

1. Frontend:
cd frontend
npm install
npm start

2. Backend:
cd backend
npm install
npm run dev

3. Individual Service Development

Each service can be tested independently using either Docker or local development.

Using Docker (Recommended):
```bash
# Start a specific service in development mode
cd docker
docker-compose -f docker-compose.dev.yml up local_inference

# Start multiple services if needed
docker-compose -f docker-compose.dev.yml up local_inference mongodb
```

Local Development:
```bash
cd services/local_inference  # or other service
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

4. Testing with Mock Data

Generate mock data for specific services:
```bash
cd data

# Generate mock data for local inference service
python mock_data_generator.py local_inference

# Generate mock ICP data
python mock_data_generator.py icp

# Generate all mock data
python mock_data_generator.py
```

5. Testing Model Decrypt Service

After starting the service and generating mock data:
```bash
# The mock_data_generator will output a test key
# Use this key to test the decrypt endpoint
curl -X POST http://localhost:5004/get_decryption_key \
  -H "Content-Type: application/json" \
  -d '{"key":"YOUR_TEST_KEY_HERE"}'

# Retrieve decrypted model
curl http://localhost:5004/get_decrypted_model/model_decrypted.json
```

DEPENDENCIES

1. Frontend:
- React 18.2
- TypeScript 4.9
- Three.js 0.150
- Chart.js 4.3
- TensorFlow.js 4.2

2. Backend:
- Node.js 16+
- Express 4.18
- Mongoose 7.0

3. AI Services:
- Python 3.9+
- TensorFlow 2.15
- Flask 2.0
- PyDICOM 2.2
- Whisper 1.0
- FuzzyWuzzy 0.18

4. DICOM Service:
- Python 3.9+
- Flask 2.0
- PyDICOM 2.2
- PyMongo 4.3

DOCKER SUPPORT

All components are containerized with Docker:
- Frontend: Node 16 Alpine
- Backend: Node 16 Alpine
- Services: Python 3.9 Slim
- MongoDB: Latest official image

Docker Compose handles orchestration with proper networking and volume management.

SECURITY FEATURES

- HTTPS for all external communication
- JWT-based authentication
- CORS protection
- Encrypted data storage
- Sanitized API inputs
- Audit logging

PROJECT STRUCTURE

neuro-platform/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── shared/      # Shared UI components
│   │   │   │   ├── PatientHeader.tsx
│   │   │   │   └── ServiceStatus.tsx
│   │   ├── context/         # Context providers
│   │   │   ├── PatientContext.tsx
│   │   │   └── ServicesContext.tsx
│   │   ├── styles/          # CSS styles
│   │   │   ├── shared.css   # Shared styles
│   │   └── types/          # TypeScript definitions
│   └── public/              # Static assets
├── backend/                 # Node.js main API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── models/         # Mongoose models
├── services/               # Flask microservices
│   ├── tumor_analysis/    # Tumor analysis service
│   │   ├── models/
│   │   │   ├── tumor_segmentation.py
│   │   │   └── mgmt_prediction.py    # MGMT prediction model
│   ├── icp_monitoring/    # ICP monitoring service
│   ├── model_training/    # Model training service
│   ├── medical_documentation/   # Medical documentation service
│   ├── imaging_data/      # Imaging data service
│   │   ├── preprocessors/
│   │   │   └── mgmt_preprocessor.py  # MGMT-specific preprocessing
│   └── shared/            # Shared utilities
│   └── local_inference/   # Local inference service
├── data/                  # Mock data generation
└── docker/                # Docker configurations

SECURITY MODEL

Local Inference Service
---------------------
The platform includes a secure local inference service that ensures patient data privacy:

1. Model Security:
   - Models are stored in encrypted form
   - Time-limited decryption keys
   - Secure key distribution

2. Data Privacy:
   - All inference runs locally in the browser
   - Patient data never leaves the local environment
   - TensorFlow.js for client-side processing

3. Database Integration:
   - Secure MongoDB integration for tracking model usage
   - No patient data stored in the database
   - Only metadata and usage statistics tracked

UI INTEGRATION

Each microservice integrates with the frontend through:
1. Shared Components
   - Common UI elements for consistency
   - Reusable functionality

2. Service Status Monitoring
   - Real-time service health tracking
   - Automatic reconnection handling

3. Data Flow
   - Centralized patient context
   - Consistent data formatting
   - Real-time updates

4. Error Handling
   - Unified error display
   - Graceful degradation
   - Service fallbacks

MGMT Analysis Pipeline
--------------------
Integrated workflow for MGMT methylation status prediction:

1. Data Processing:
   - Validation of required MRI sequences (T1, T1c, T2, FLAIR)
   - Automated sequence type identification
   - Standardized preprocessing pipeline

2. Model Architecture:
   - Deep learning model for MGMT status prediction
   - Multi-sequence input (4 channel)
   - Binary classification output
   - Confidence scoring

3. Integration Points:
   - Preprocessing in imaging_data service
   - Model training in model_training service
   - Inference endpoints in tumor_analysis service
   - Sequence validation and normalization

4. Workflow:
   - Study validation → Sequence preprocessing → MGMT prediction
   - Automated sequence identification
   - Standardized data normalization
   - Confidence-scored predictions
