import numpy as np
from datetime import datetime, timedelta
import json

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

if __name__ == '__main__':
    save_mock_data() 