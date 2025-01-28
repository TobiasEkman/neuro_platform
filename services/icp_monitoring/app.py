from flask import Flask, request, jsonify
from .models.icp_prediction import ICPPredictionModel
from shared.models.registry import ModelRegistry

app = Flask(__name__)
icp_model = ICPPredictionModel()
model_registry = ModelRegistry()

@app.route('/api/monitoring/icp/predict', methods=['POST'])
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
    app.run(host='0.0.0.0', port=5006) 