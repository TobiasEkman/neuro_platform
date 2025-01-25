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
- Technologies: React 18, TypeScript, Chart.js, Three.js

2. Main API (Node.js + Express)
- Central orchestration layer
- Handles:
  * Patient data management
  * Authentication/Authorization
  * Request routing to microservices
  * Data aggregation
- Technologies: Node.js, Express, TypeScript, Mongoose

3. AI/Analysis Service (Flask)
- Specialized Python microservice for:
  * Tumor segmentation
  * Critical structure identification
  * Surgical approach risk analysis
  * Real-time ICP trend analysis
- Technologies: Flask, TensorFlow, NumPy, PyDICOM

4. Model Training Service (Flask)
- Dedicated service for:
  * Training tumor classification models
  * ICP prediction model training
  * Model versioning and storage
- Technologies: Flask, TensorFlow, Keras

5. Clinical Coding Service (Flask)
- Natural language processing for:
  * ICD-10 code suggestions
  * Procedure coding
  * Clinical text analysis
- Technologies: Flask, Transformers, PyTorch

6. Data Storage
- MongoDB:
  * Patient metadata
  * Analysis results
  * Model metadata
  * System logs
- Local DICOM storage:
  * Raw imaging data
  * Segmentation masks
  * Analysis outputs

API ENDPOINTS

1. Main API (port 4000)
- /api/patients: Patient management
- /api/analysis: Analysis routing
- /api/icp: ICP monitoring

2. AI Service (port 5000)
- /api/analysis/tumor: Tumor analysis
- /api/analysis/icp/predict: ICP prediction

3. Training Service (port 5001)
- /api/training/tumor: Model training
- /api/training/icp: ICP model training

4. Clinical Coding (port 5002)
- /api/coding/icd: ICD code suggestions
- /api/coding/procedure: Procedure coding

DEVELOPMENT SETUP

1. Frontend:
cd frontend
npm install
npm start

2. Backend:
cd backend
npm install
npm run dev

3. Services:
cd services/ai_analysis
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py

DEPENDENCIES

1. Frontend:
- React 18.2
- TypeScript 4.9
- Three.js 0.150
- Chart.js 4.3

2. Backend:
- Node.js 16+
- Express 4.18
- Mongoose 7.0

3. AI Services:
- Python 3.9+
- TensorFlow 2.15
- Flask 2.0
- PyDICOM 2.2

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
│   │   ├── context/         # Context providers
│   │   ├── styles/          # CSS styles
│   │   └── types/          # TypeScript definitions
│   └── public/              # Static assets
├── backend/                 # Node.js main API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── models/         # Mongoose models
├── services/               # Flask microservices
│   ├── ai_analysis/       # Service A
│   ├── model_training/    # Service B
│   └── clinical_coding/   # Service C
└── docker/                # Docker configurations
