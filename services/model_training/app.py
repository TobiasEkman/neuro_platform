from flask import Flask, request, jsonify
from models.tumor_classifier import TumorClassifier
from models.icp_predictor import ICPPredictor
import numpy as np

app = Flask(__name__)

@app.route('/api/training/tumor', methods=['POST'])
def train_tumor_model():
    try:
        data = request.json
        model = TumorClassifier()
        
        # Train model with provided data
        history = model.train(
            data['training_images'],
            data['labels'],
            epochs=data.get('epochs', 10),
            batch_size=data.get('batch_size', 32)
        )
        
        return jsonify({
            'status': 'success',
            'metrics': history.history,
            'model_id': model.save()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/training/icp', methods=['POST'])
def train_icp_model():
    try:
        data = request.json
        model = ICPPredictor()
        
        # Train model with provided data
        history = model.train(
            data['icp_readings'],
            data['patient_features'],
            epochs=data.get('epochs', 10)
        )
        
        return jsonify({
            'status': 'success',
            'metrics': history.history,
            'model_id': model.save()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 