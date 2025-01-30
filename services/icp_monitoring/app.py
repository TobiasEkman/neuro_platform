from flask import Flask, request, jsonify
from .models.icp_prediction import ICPPredictionModel
from shared.models.registry import ModelRegistry
from dataclasses import dataclass
from typing import List, Optional

app = Flask(__name__)
icp_model = ICPPredictionModel()
model_registry = ModelRegistry()

@dataclass
class CTFindings:
    edema_level: str
    midline_shift: float
    ventricle_compression: bool
    hemorrhage_present: bool
    hemorrhage_volume: Optional[float] = None

@dataclass
class VitalSigns:
    blood_pressure_systolic: float
    blood_pressure_diastolic: float
    heart_rate: float
    respiratory_rate: float
    oxygen_saturation: float
    temperature: float

@app.route('/api/monitoring/icp/predict', methods=['POST'])
def predict_icp():
    try:
        data = request.json
        
        # Validate required fields
        if not all(key in data for key in ['readings', 'ct_findings', 'vital_signs']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Validate CT findings
        ct_findings = CTFindings(**data['ct_findings'])
        vital_signs = VitalSigns(**data['vital_signs'])
        
        # Get predictions using validated data
        predictions = icp_model.predict_trend(data['readings'])
        risk_factors = icp_model.analyze_risk_factors(
            ct_findings,
            vital_signs,
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
    app.run(host='0.0.0.0', port=5006) 