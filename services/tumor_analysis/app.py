from flask import Flask, request, jsonify
from .models.tumor_segmentation import TumorSegmentationModel
from .utils.dicom_loader import load_dicom_series
from shared.models.registry import ModelRegistry
import numpy as np
from .models.mgmt_prediction import MGMTPredictionModel
import requests

app = Flask(__name__)
tumor_model = TumorSegmentationModel()
model_registry = ModelRegistry()
mgmt_model = MGMTPredictionModel()

@app.route('/api/analysis/tumor/<image_id>', methods=['POST'])
def analyze_tumor(image_id):
    try:
        approach = request.json.get('approach')
        image_data = load_dicom_series(image_id)
        
        # Perform tumor segmentation
        tumor_mask = tumor_model.segment(image_data)
        
        # Analyze critical structures
        structures = tumor_model.identify_critical_structures(image_data, tumor_mask)
        
        # Calculate surgical approach risks
        risks = tumor_model.calculate_approach_risks(
            tumor_mask,
            structures,
            approach
        )
        
        return jsonify({
            'volumeCc': float(np.sum(tumor_mask) * 0.001),
            'location': structures['location'],
            'eloquentAreas': structures['eloquent_areas'],
            'vesselInvolvement': structures['vessels'],
            'predictedResectionRate': risks['resection_probability'] * 100
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/mgmt/<study_id>', methods=['POST'])
def predict_mgmt(study_id):
    try:
        # Get preprocessed sequences from imaging service
        response = requests.get(
            f'http://imaging_data:5003/api/preprocess/mgmt/{study_id}'
        )
        if not response.ok:
            return jsonify({'error': 'Failed to get preprocessed sequences'}), 500
            
        sequences = response.json()['sequences']
        
        # Make MGMT prediction
        prediction = mgmt_model.predict(sequences)
        
        return jsonify({
            'study_id': study_id,
            'mgmt_status': prediction
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005) 