from flask import Flask, request, jsonify
from models.simulation_session import SimulationSession
from models.performance_tracker import PerformanceTracker
from data.procedures import PROCEDURE_STEPS, MEDICATIONS

app = Flask(__name__)
session_manager = SimulationSession()
performance_tracker = PerformanceTracker()

@app.route('/api/simulator/session', methods=['POST'])
def create_session():
    try:
        data = request.json
        session = session_manager.create_session(
            user_id=data['userId'],
            scenario_type=data['scenarioType']
        )
        return jsonify(session)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulator/metrics', methods=['POST'])
def track_metrics():
    try:
        data = request.json
        metrics = performance_tracker.track_performance(
            session_id=data['sessionId'],
            metrics=data['metrics']
        )
        return jsonify(metrics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulator/procedures', methods=['GET'])
def get_procedures():
    return jsonify(PROCEDURE_STEPS)

@app.route('/api/simulator/medications', methods=['GET'])
def get_medications():
    return jsonify(MEDICATIONS)

@app.route('/api/simulator/crisis', methods=['POST'])
def handle_crisis():
    try:
        data = request.json
        # Handle crisis event
        return jsonify({
            'success': True,
            'message': 'Crisis handled'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulator/vital-signs', methods=['GET'])
def get_vital_signs():
    # Return mock vital signs
    return jsonify({
        'bp': {'systolic': 120, 'diastolic': 80},
        'heartRate': 75,
        'o2sat': 98,
        'icp': 10
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5007) 