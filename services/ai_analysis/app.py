from flask import Flask, request, jsonify
from .models.tumor_segmentation import TumorSegmentationModel
from .models.icp_prediction import ICPPredictionModel
from .utils.dicom_loader import load_dicom_series
import numpy as np

app = Flask(__name__)

tumor_model = TumorSegmentationModel()
icp_model = ICPPredictionModel()

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
            'volumeCc': float(np.sum(tumor_mask) * 0.001),  # Convert to cc
            'location': structures['location'],
            'eloquentAreas': structures['eloquent_areas'],
            'vesselInvolvement': structures['vessels'],
            'predictedResectionRate': risks['resection_probability'] * 100
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/icp/predict', methods=['POST'])
def predict_icp():
    try:
        patient_data = request.json
        
        # Get recent ICP readings
        recent_readings = patient_data['readings']
        
        # Predict ICP trend for next 6 hours
        predictions = icp_model.predict_trend(recent_readings)
        
        # Calculate risk factors
        risk_factors = icp_model.analyze_risk_factors(
            patient_data['ct_findings'],
            patient_data['vital_signs'],
            predictions
        )
        
        return jsonify({
            'predictions': predictions,
            'riskFactors': risk_factors,
            'recommendedActions': generate_recommendations(risk_factors)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_recommendations(risk_factors):
    recommendations = []
    if risk_factors['trending_up']:
        if risk_factors['current_icp'] > 20:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Consider immediate osmotic therapy',
                'details': 'Current ICP trending above 20 mmHg'
            })
        if risk_factors['compliance_decreasing']:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Prepare for potential surgical intervention',
                'details': 'Decreasing brain compliance detected'
            })
    return recommendations

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 