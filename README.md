*NEUROSURGERY PLATFORM*
====================

To do:

- Fixa cornerston3D, kanske ta bort hela dicom viewer
- Uppdatera @imaging_data att skicka rätt data
- Currently working on implementing cornerstone3D in the dicom viewer
- Improve tumor analysis service
- Better dicom viewer, for example through batch up 
- Implement docker compose for all services

A comprehensive platform for neurosurgical planning, monitoring, and analysis.

A. CORE COMPONENTS
------------------

**1. Frontend (React + TypeScript)**
- Modern SPA architecture with real-time monitoring
- Key features:
  * Patient dashboard with vital metrics
  * Patient Explorer with advanced filtering and sorting
  * Real-time ICP monitoring with alerts
  * 3D tumor visualization using Three.js
  * Surgical approach planning interface
  * ICD coding assistance
- DICOM Management:
  * Advanced DICOM viewer with MPR support (using Cornerstone3D libraries)
  * Window/level presets and controls
  * Measurement tools (distance, angle, area)
  * DICOM import from folders and DICOMDIR
  * Series organization and metadata display
  * Real-time volume rendering
  * Debug and validation tools
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
  * Styled-components integration
  * Global theme system with CSS variables
- Technologies: React 18, TypeScript, Chart.js, Three.js

**2. Main API (Node.js + Express)**
- Central orchestration layer
- Handles:
  * Patient data management
  * Authentication/Authorization
  * Request routing to microservices
  * Data aggregation
  * DICOM import coordination
- Technologies: Node.js, Express, TypeScript, Mongoose

**3. Tumor Analysis Service (Flask)**
- Specialized Python microservice for:
  * Tumor segmentation
  * Critical structure identification
  * Surgical approach risk analysis
  * MGMT methylation status prediction
  * Molecular marker analysis
- Technologies: Flask, TensorFlow, NumPy, PyDICOM

**4. ICP Monitoring Service (Flask)**
- Dedicated service for:
  * Real-time ICP trend analysis
  * ICP prediction and alerting
  * Risk factor analysis
- Technologies: Flask, TensorFlow, NumPy

**5. Model Training Service (Flask)**
- Dedicated service for:
  * Training tumor classification models
  * ICP prediction model training
  * Model versioning and storage
- Technologies: Flask, TensorFlow, Keras

**6. Medical Documentation Service (Flask)**
- Natural language processing for:
  * ICD-10 code suggestions
  * Procedure coding
  * Clinical text analysis
  * Journal generation
  * Voice transcription
  * Real-time audio transcription with WebRTC
  * Streaming journal generation
  * Interactive coding suggestions
- Technologies: Flask, Transformers, PyTorch, Whisper

**7. Imaging Data Service (Flask)**
- DICOM data management:
  * Folder-based DICOM import
  * DICOMDIR parsing
  * Study/Series organization
  * DICOM metadata extraction
  * Advanced search functionality
  * Image data organization
  * MPR (Multiplanar Reconstruction) support
  * Volume data extraction and processing
  * Window/level presets management
  * DICOM validation and debugging tools
  * Measurement calibration support
- Technologies: Flask, PyDICOM, PyMongo

**8. Simulator Service (Flask)**
- Neurosurgical simulation features:
  * Session management and tracking
  * Performance metrics collection
  * Crisis scenario management
  * Real-time vital sign monitoring
  * Procedure step tracking
  * Medication management
- Technologies: Flask, PyMongo

**9. Local Inference Service (Flask)**
- Secure local model execution:
  * Encrypted AI models
  * Time-limited decryption keys
  * Secure key distribution
  * Local inference with TensorFlow.js
  * Data integrity and privacy
  * Secure MongoDB integration for tracking model usage
  * No patient data stored in the database
  * Only metadata and usage statistics tracked
- Technologies: Flask, TensorFlow, Cryptography

**10. Data Storage**
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

B. API ENDPOINTS
----------------

**1. Patient Management Service (port 5008)**
- /patients: Get all patients with filtering
- /patients/<id>: Get, update, delete single patient
- /patients/pid/<pid>: Get, update, delete single patient by PID
- /bulk-upload: Bulk patient data upload
- /health: Service health check

**2. Tumor Analysis Service (port 5005)**
- /api/analysis/tumor: Tumor analysis
- /api/analysis/mgmt/{study_id}: MGMT methylation status prediction

**3. ICP Monitoring Service (port 5006)**
- /api/analysis/icp/predict: ICP prediction

**4. Training Service (port 5001)**
- /api/training/tumor: Model training
- /api/training/icp: ICP model training

**5. Clinical Coding (port 5002)**
- /api/coding/icd: ICD code suggestions
- /api/coding/procedure: Procedure coding
- /api/journal/generate: AI-powered journal generation
- /api/transcribe: Voice transcription service

**6. DICOM Service (port 5003)**
- /api/dicom/parse/folder: Parse DICOM folder
- /api/dicom/parse/dicomdir: Parse DICOMDIR file
- /api/search: Fuzzy search across DICOM data
- /api/dicom/list: List all DICOM studies/series
- /api/dicom/series/{seriesId}: Get series metadata
- /api/dicom/volume/{seriesId}: Get volume data for MPR
- /api/dicom/image/{imageId}: Get individual DICOM image
- /api/dicom/metadata/{seriesId}: Get detailed series metadata
- /api/dicom/window-presets: Get window/level presets
- /api/dicom/validate/{seriesId}: Validate DICOM data

**7. Simulator Service (port 5007)**
- /api/simulator/*: Simulator endpoints
  - /session: Create and manage simulation sessions
  - /metrics: Track performance metrics
  - /procedures: Get surgical procedures
  - /medications: Get available medications
  - /crisis: Handle crisis events
  - /vital-signs: Get patient vital signs

**8. Local Inference Service (port 5004)**
- /api/inference/decrypt: Decrypt model
- /api/inference/model/{filename}: Get decrypted model
- /api/inference/track: Track model usage

C. DEVELOPMENT SETUP
--------------------

**1. Frontend:**
```bash
cd frontend
npm install
npm start
```

**2. Backend:**
```bash
cd backend
npm install
npm run dev
```

**3. Individual Service Development (Dicom parsing, Tumor analysis, ICP monitoring, etc.)**

Each service can be tested independently using either Docker or local development.

Local Development (recommended in the beginning):
```bash
cd services/local_inference  # or other service
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

Using Docker:
```bash
# Start a specific service in development mode
cd docker
docker-compose -f docker-compose.dev.yml up patient_management mongodb

# Start multiple services if needed
docker-compose -f docker-compose.dev.yml up patient_management mongodb imaging_data
```

**4. Database Setup**

Start MongoDB, for example through MongoDB Compass.

DB has adress localhost:27017

Collections:
- patients
- studies




D. DEPENDENCIES
---------------

**1. Frontend:**
- React 18.2
- TypeScript 4.9
- Three.js 0.150
- Chart.js 4.3
- TensorFlow.js 4.2
- Styled-components 6.1
- React Router DOM 6.10
- React Icons 5.4

**2. Backend:**
- Node.js 16+
- Express 4.18
- Mongoose 7.0

**3. AI Services:**
- Python 3.9+
- TensorFlow 2.15
- Flask 2.0
- PyDICOM 2.2
- Whisper 1.0
- FuzzyWuzzy 0.18

**4. DICOM Service:**
- Python 3.9+
- Flask 2.0
- PyDICOM 2.2
- PyMongo 4.3

E. DOCKER SUPPORT
-----------------

All components are containerized with Docker:
- Frontend: Node 16 Alpine
- Backend: Node 16 Alpine
- Services: Python 3.9 Slim
- MongoDB: Latest official image

Docker Compose handles orchestration with proper networking and volume management.

DICOM Data Management:
- All services access DICOM files through a shared read-only volume
- Directory structure:
  ```
  /data/dicom/           # Shared Docker volume
  ├── patient_001/       # Patient directories
  │   ├── study_1/      # Study directories
  │   │   ├── series_1/ # Series directories
  │   │   └── ...
  │   └── ...
  └── ...
  ```
- Docker configuration example:
  ```yaml
  services:
    frontend:
      volumes:
        - ../dicom_data:/data/dicom:ro
    
    backend:
      volumes:
        - ../dicom_data:/data/dicom:ro
    
    imaging_data:
      volumes:
        - ../dicom_data:/data/dicom:ro
  ```

F. SECURITY FEATURES
--------------------

- HTTPS for all external communication
- JWT-based authentication
- CORS protection
- Encrypted data storage
- Sanitized API inputs
- Audit logging
- Read-only volume mounting prevents accidental file modifications
- Access control through Node.js backend
- Validation of file paths to prevent directory traversal
- Proper error handling for missing or invalid files

G. PROJECT STRUCTURE
--------------------

neuro-platform/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── PatientExplorer/  # Patient management UI
│   │   │   │   ├── PatientExplorer.tsx  # Main patient list view
│   │   │   │   └── index.tsx     # Component exports
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
│   ├── patient_management/ # Patient management service
│   │   ├── app.py         # Flask application
│   │   └── requirements.txt # Python dependencies
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


H. SPECIFIC SERVICE INFORMATION
-----------------------------

**1. MGMT Analysis Pipeline**

Integrated workflow for MGMT methylation status prediction:

***Data Processing:***
   - Validation of required MRI sequences (T1, T1c, T2, FLAIR)
   - Automated sequence type identification
   - Standardized preprocessing pipeline

***Model Architecture:***
   - Deep learning model for MGMT status prediction
   - Multi-sequence input (4 channel)
   - Binary classification output
   - Confidence scoring

***Integration Points:***
   - Preprocessing in imaging_data service
   - Model training in model_training service
   - Inference endpoints in tumor_analysis service
   - Sequence validation and normalization

***Workflow:***
   - Study validation → Sequence preprocessing → MGMT prediction
   - Automated sequence identification
   - Standardized data normalization
   - Confidence-scored predictions


**2. Patient and Imaging Data Management**

***Patient Management Service (@patient_management) - Port 5008***  
   - Manages patient records in MongoDB.  
   - Main routes:
     - `GET /patients` – Retrieve patients (with optional filtering).  
     - `GET /patients/<patient_id>` – Retrieve by MongoDB ObjectId.  
     - `GET /patients/pid/<pid>` – Retrieve by Business ID (PID_XXXX).  
     - `POST /patients` – Create a new patient.  
     - `POST /bulk-upload` – Bulk patient upload.  
     - `PUT /patients/<patient_id>` – Update by MongoDB ObjectId.  
     - `DELETE /patients/<patient_id>` – Delete by MongoDB ObjectId.  
     - `POST /patients/pid/<pid>/dicom` – Add DICOM data for an existing PID.

***Imaging Data Service (@imaging_data) - Port 5003***  
   - Handles DICOM file uploads and parsing.  
   - Main routes:
     - `POST /dicom/upload` – Upload DICOM files.  
       1. Validates that a `pid` was included.  
       2. Saves all uploaded files.  
       3. Parses them into `study_data`.  
       4. Calls `@patient_management /patients/pid/<pid>/dicom` to attach new images/studies to that patient's record.

***Front-End***  
   - DicomManager (@DicomManager)
     - Components like `DicomUploader.tsx` handle file selection, validate the PID (by calling `/patients/pid/<pid>`), then upload to `@imaging_data`.  
     - If upload is successful, the imaging service updates the patient in `@patient_management`.
   - PatientExplorer (@PatientExplorer) 
     - Displays patient details, allows selection or creation of a patient, and obtains the PID for use in `@DicomManager`.

Example DICOM Upload Flow

1. User enters a PID in the DicomUploader UI (front-end).  
2. DicomUploader calls `GET /patients/pid/<pid>` to confirm the patient exists.  
3. DicomUploader sends the selected DICOM files, along with `pid`, to the Imaging Data service (`POST /dicom/upload`).  
4. The Imaging Data service parses those files into study data (using local DICOM parsing logic).  
5. The Imaging Data service calls the Patient Management service's `POST /patients/pid/<pid>/dicom` endpoint with the parsed study data.  
6. The Patient Management service updates the patient record in MongoDB, appending the newly uploaded images and creating corresponding study entries.  
7. User sees confirmation on the front-end that the images are now tied to that PID.

**3. Local Inference Service**

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

I. DATA FLOW DIAGRAMS
---------------------
**1. DICOM Upload Flow**

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (DicomManager)
    participant BE as Backend (Node)
    participant IS as Imaging Service
    participant PM as Patient Management
    participant DB as MongoDB
    participant FS as File System

    User->>FE: 1. Select DICOM files
    Note over FE: FormData with DICOM files
    FE->>BE: 2. POST /api/dicom/upload
    BE->>IS: 3. Forward to imaging service
    IS->>FS: 4. Save files to mounted volume
    IS->>IS: 5. Parse DICOM metadata
    Note over IS: Extracts:<br/>- PatientID<br/>- StudyInstanceUID<br/>- SeriesInstanceUID
    
    alt Patient exists
        IS->>PM: 6. POST /patients/pid/{PatientID}/dicom
        PM->>DB: 7. db.patients.updateOne()
        PM-->>IS: 8. 200 OK
        IS-->>BE: 9. { message: "Upload successful", studies: [...] }
        BE-->>FE: 10. Forward response
        FE-->>User: 11. Display study information
    else Patient not found
        IS->>PM: 6. POST /patients
        PM->>DB: 7. db.patients.insertOne()
        PM-->>IS: 8. 201 Created
        IS-->>BE: 9. { message: "New patient created", studies: [...] }
        BE-->>FE: 10. Forward response
        FE-->>User: 11. Display study information
    end
```

**2. Patient Data Upload Flow**
```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (PatientExplorer)
    participant PM as Patient Management
    participant DB as MongoDB

    User->>FE: 1. Choose CSV/Excel file
    Note over FE: Validates format:<br/>- Required fields<br/>- Data types<br/>- Date formats
    FE->>PM: 2. POST /bulk-upload
    Note over FE,PM: [<br/>  {<br/>    name: "John Doe",<br/>    age: 45,<br/>    diagnosis: "GBM",<br/>    studyDate: "2024-03-20"<br/>  },<br/>  ...<br/>]
    PM->>PM: 3. Validates each patient
    Note over PM: Checks:<br/>- Required fields<br/>- Age range<br/>- Valid diagnosis<br/>- Date format
    
    alt Valid data
        PM->>DB: 4. db.patients.insertMany()
        PM-->>FE: 5. { 
        Note over PM,FE: message: "Success",<br/>patient_ids: ["PID_0001", ...]<br/>}
        FE-->>User: 6. Displays confirmation + new PIDs
    else Invalid data
        PM-->>FE: Error: { 
        Note over PM,FE: errors: {<br/>  0: ["Invalid age"],<br/>  2: ["Missing diagnosis"]<br/>}<br/>}
        FE-->>User: Displays validation errors per row
    end
```
