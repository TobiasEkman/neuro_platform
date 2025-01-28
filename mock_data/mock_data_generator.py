import numpy as np
from datetime import datetime, timedelta
import json
import os
import base64
from cryptography.fernet import Fernet
import random
from typing import List, Dict, Any
import uuid
from pymongo import MongoClient
from faker import Faker

def generate_icp_readings(hours=24):
    base_icp = 12
    timestamps = []
    values = []
    
    current_time = datetime.now()
    
    for i in range(hours * 12):  # Readings every 5 minutes
        time = current_time - timedelta(minutes=5*i)
        # Generate realistic ICP variations
        noise = np.random.normal(0, 1)
        trend = np.sin(i/24 * np.pi) * 3  # Daily pattern
        value = base_icp + noise + trend
        
        timestamps.append(time.isoformat())
        values.append(round(max(0, value), 1))
    
    return list(zip(timestamps, values))

def generate_tumor_case():
    locations = [
        'Anterior Skull Base',
        'Cerebellopontine Angle',
        'Parasellar Region',
        'Petroclival Region'
    ]
    
    vessels = [
        'Internal Carotid Artery',
        'Middle Cerebral Artery',
        'Basilar Artery',
        'Superior Petrosal Sinus'
    ]
    
    eloquent_areas = [
        'Broca\'s Area',
        'Primary Motor Cortex',
        'Cranial Nerve VII',
        'Optic Pathway'
    ]
    
    return {
        'location': np.random.choice(locations),
        'volumeCc': round(np.random.uniform(10, 50), 1),
        'vesselInvolvement': np.random.choice(vessels, 
                                            size=np.random.randint(1, 3), 
                                            replace=False).tolist(),
        'eloquentAreas': np.random.choice(eloquent_areas, 
                                        size=np.random.randint(1, 3), 
                                        replace=False).tolist(),
        'predictedResectionRate': round(np.random.uniform(60, 95), 1)
    }

def save_mock_data():
    mock_data = {
        'icp_readings': generate_icp_readings(),
        'tumor_cases': [generate_tumor_case() for _ in range(10)]
    }
    
    with open('mock_data.json', 'w') as f:
        json.dump(mock_data, f, indent=2)

def generate_mock_encrypted_model():
    """Generate mock encrypted model and bin files for testing model_decrypt service"""
    # Create a test encryption key
    key = Fernet.generate_key()
    f = Fernet(key)
    
    # Create mock model JSON - simple classification model
    model_data = {
        "format": "layers-model",
        "generatedBy": "TensorFlow.js v3.9.0",
        "convertedBy": "TensorFlow.js Converter v3.9.0",
        "modelTopology": {
            "class_name": "Sequential",
            "config": {
                "name": "sequential_1",
                "layers": [
                    {
                        "class_name": "Conv2D",
                        "config": {
                            "filters": 32,
                            "kernel_size": [3, 3],
                            "activation": "relu",
                            "input_shape": [224, 224, 3]
                        }
                    },
                    {
                        "class_name": "Dense",
                        "config": {
                            "units": 1,
                            "activation": "sigmoid"
                        }
                    }
                ]
            }
        },
        "weightsManifest": [
            {
                "paths": ["weights_0.bin", "weights_1.bin"],
                "weights": [
                    {"name": "conv2d/kernel", "shape": [3, 3, 3, 32], "dtype": "float32"},
                    {"name": "conv2d/bias", "shape": [32], "dtype": "float32"},
                    {"name": "dense/kernel", "shape": [32, 1], "dtype": "float32"},
                    {"name": "dense/bias", "shape": [1], "dtype": "float32"}
                ]
            }
        ]
    }
    
    # Create directories if they don't exist
    os.makedirs('./data/encrypted_bin_files', exist_ok=True)
    
    # Encrypt and save model JSON
    encrypted_json = f.encrypt(json.dumps(model_data).encode())
    with open('./data/model_encrypted.json', 'wb') as f_json:
        f_json.write(encrypted_json)
    
    # Create and encrypt mock weight files
    weights_0 = np.random.randn(3, 3, 3, 32).astype(np.float32).tobytes()
    weights_1 = np.random.randn(32, 1).astype(np.float32).tobytes()
    
    # Encrypt and save weights
    encrypted_weights_0 = f.encrypt(weights_0)
    encrypted_weights_1 = f.encrypt(weights_1)
    
    with open('./data/encrypted_bin_files/weights_0.bin', 'wb') as f_bin:
        f_bin.write(encrypted_weights_0)
    with open('./data/encrypted_bin_files/weights_1.bin', 'wb') as f_bin:
        f_bin.write(encrypted_weights_1)
    
    print("Generated mock encrypted model files")
    print(f"Test key (base64): {key.decode()}")

class MockDataGenerator:
    def __init__(self):
        self.patient_ids = [f"P{i:04d}" for i in range(1, 21)]
        self.doctor_ids = [f"D{i:03d}" for i in range(1, 11)]
        
    def generate_patient_data(self) -> List[Dict[str, Any]]:
        """Generate mock patient demographic and clinical data"""
        patients = []
        for patient_id in self.patient_ids:
            age = random.randint(25, 85)
            patients.append({
                'patient_id': patient_id,
                'name': f"Patient {patient_id}",
                'date_of_birth': (datetime.now() - timedelta(days=age*365)).strftime('%Y-%m-%d'),
                'sex': random.choice(['M', 'F']),
                'weight': round(random.uniform(60, 95), 1),
                'height': round(random.uniform(155, 190), 1),
                'primary_diagnosis': random.choice([
                    'Glioblastoma',
                    'Meningioma',
                    'Acoustic Neuroma',
                    'Pituitary Adenoma'
                ]),
                'attending_physician': random.choice(self.doctor_ids)
            })
        return patients

    def generate_icp_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Generate mock ICP monitoring data"""
        icp_data = {}
        for patient_id in self.patient_ids[:5]:  # Only some patients have ICP monitoring
            readings = []
            base_icp = random.uniform(8, 15)
            current_time = datetime.now()
            
            for i in range(24 * 12):  # 5-minute intervals for 24 hours
                timestamp = current_time - timedelta(minutes=5*i)
                noise = np.random.normal(0, 1)
                trend = np.sin(i/24 * np.pi) * 3
                value = base_icp + noise + trend
                
                readings.append({
                    'timestamp': timestamp.isoformat(),
                    'value': round(max(0, value), 1),
                    'waveform': [round(random.uniform(value-2, value+2), 1) for _ in range(10)],
                    'compliance_index': round(random.uniform(0.8, 1.2), 2)
                })
            
            icp_data[patient_id] = readings
        return icp_data

    def generate_dicom_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Generate mock DICOM metadata"""
        dicom_data = {}
        modalities = ['MR', 'CT']
        sequences = {
            'MR': ['T1', 'T2', 'FLAIR', 'DWI'],
            'CT': ['NonContrast', 'Contrast', 'Perfusion']
        }
        
        for patient_id in self.patient_ids:
            studies = []
            study_count = random.randint(1, 3)
            
            for i in range(study_count):
                modality = random.choice(modalities)
                study_date = datetime.now() - timedelta(days=random.randint(0, 30))
                
                series = []
                for j in range(random.randint(1, 4)):
                    series.append({
                        'series_instance_uid': str(uuid.uuid4()),
                        'series_number': j + 1,
                        'series_description': random.choice(sequences[modality]),
                        'modality': modality,
                        'instance_count': random.randint(100, 200),
                        'slice_thickness': round(random.uniform(0.5, 3.0), 2),
                        'pixel_spacing': [round(random.uniform(0.4, 1.0), 2)] * 2
                    })
                
                studies.append({
                    'study_instance_uid': str(uuid.uuid4()),
                    'study_date': study_date.strftime('%Y%m%d'),
                    'study_time': study_date.strftime('%H%M%S'),
                    'study_description': f"{modality} Brain",
                    'series': series
                })
            
            dicom_data[patient_id] = studies
        return dicom_data

    def generate_tumor_data(self) -> Dict[str, Dict[str, Any]]:
        """Generate mock tumor analysis results"""
        tumor_data = {}
        locations = [
            'Right Frontal Lobe',
            'Left Temporal Lobe',
            'Right Parietal Lobe',
            'Cerebellum',
            'Brainstem'
        ]
        
        for patient_id in self.patient_ids[:10]:  # Only some patients have tumors
            tumor_data[patient_id] = {
                'segmentation': {
                    'volume_cc': round(random.uniform(10, 100), 1),
                    'location': random.choice(locations),
                    'dimensions_mm': [
                        round(random.uniform(20, 50), 1),
                        round(random.uniform(20, 50), 1),
                        round(random.uniform(20, 50), 1)
                    ]
                },
                'critical_structures': {
                    'eloquent_areas': random.sample([
                        'Motor Cortex',
                        'Speech Area',
                        'Visual Pathway',
                        'Brainstem'
                    ], k=random.randint(1, 3)),
                    'vessels': random.sample([
                        'MCA',
                        'ACA',
                        'PCA',
                        'Superior Sagittal Sinus'
                    ], k=random.randint(1, 2))
                },
                'surgical_planning': {
                    'recommended_approach': random.choice([
                        'Transsylvian',
                        'Transcortical',
                        'Interhemispheric',
                        'Retrosigmoid'
                    ]),
                    'resection_probability': round(random.uniform(60, 95), 1),
                    'risk_factors': random.sample([
                        'Vessel Involvement',
                        'Eloquent Location',
                        'Deep Location',
                        'Multiple Components'
                    ], k=random.randint(1, 3))
                }
            }
        return tumor_data

    def generate_medical_documentation(self) -> Dict[str, List[Dict[str, Any]]]:
        """Generate mock medical documentation"""
        documentation = {}
        
        for patient_id in self.patient_ids:
            notes = []
            for _ in range(random.randint(2, 5)):
                note_date = datetime.now() - timedelta(days=random.randint(0, 30))
                note_type = random.choice(['Progress', 'Surgery', 'Consultation', 'Radiology'])
                
                if note_type == 'Surgery':
                    content = {
                        'procedure': random.choice([
                            'Craniotomy for Tumor Resection',
                            'Stereotactic Biopsy',
                            'Endoscopic Tumor Resection',
                            'Skull Base Approach'
                        ]),
                        'findings': random.sample([
                            'Tumor well-circumscribed',
                            'Significant vascularity',
                            'Clear surgical plane',
                            'Multiple components'
                        ], k=random.randint(2, 3)),
                        'complications': random.choice(['None', 'Minor bleeding', 'Edema'])
                    }
                else:
                    content = {
                        'assessment': random.choice([
                            'Stable post-operative course',
                            'Progressive disease',
                            'Improved symptoms',
                            'New neurological deficit'
                        ]),
                        'plan': random.sample([
                            'Continue current management',
                            'Schedule follow-up imaging',
                            'Adjust medications',
                            'Neurosurgery consultation'
                        ], k=random.randint(2, 3))
                    }
                
                notes.append({
                    'note_id': str(uuid.uuid4()),
                    'date': note_date.isoformat(),
                    'type': note_type,
                    'author': random.choice(self.doctor_ids),
                    'content': content
                })
            
            documentation[patient_id] = notes
        return documentation

    def save_mock_data(self, output_dir: str = './mock_data'):
        """Save all mock data to JSON files"""
        os.makedirs(output_dir, exist_ok=True)
        
        mock_data = {
            'patients': self.generate_patient_data(),
            'icp_monitoring': self.generate_icp_data(),
            'dicom_studies': self.generate_dicom_data(),
            'tumor_analysis': self.generate_tumor_data(),
            'medical_documentation': self.generate_medical_documentation()
        }
        
        # Save as separate files for easier management
        for key, data in mock_data.items():
            filename = os.path.join(output_dir, f'{key}.json')
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Generated {filename}")
        
        # Save combined data
        with open(os.path.join(output_dir, 'all_mock_data.json'), 'w') as f:
            json.dump(mock_data, f, indent=2)
        print("Generated combined mock data file")

def generate_mock_studies(db, num_studies):
    fake = Faker()
    for _ in range(num_studies):
        study = {
            'study_instance_uid': fake.uuid4(),
            'patient_id': fake.uuid4(),  # Replace with actual patient IDs if available
            'study_date': fake.date_time_this_decade(),
            'study_description': fake.sentence(),
            'series': [{
                'series_instance_uid': fake.uuid4(),
                'series_number': random.randint(1, 10),
                'series_description': fake.sentence(),
                'modality': random.choice(['MRI', 'CT', 'fMRI', 'DTI'])
            }]
        }
        db.studies.insert_one(study)

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        # Generate specific mock data
        if sys.argv[1] == 'local_inference':
            generate_mock_encrypted_model()
        elif sys.argv[1] == 'icp':
            save_mock_data()  # Original ICP mock data
    else:
        # Generate all mock data
        save_mock_data()
        generate_mock_encrypted_model()

    generator = MockDataGenerator()
    generator.save_mock_data()

    # Usage
    client = MongoClient('mongodb://localhost:27017')
    db = client['neuro_platform']
    generate_mock_studies(db, 10)  # Generate 10 mock studies 