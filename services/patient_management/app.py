from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.neuro_platform

@app.before_request
def log_request_info():
    logger.info(f"Received {request.method} request to {request.path}")
    logger.info(f"Headers: {dict(request.headers)}")

@app.route('/api/patients', methods=['GET'])
def get_patients():
    logger.info("GET /api/patients called")
    try:
        patients = list(db.patients.find())
        for patient in patients:
            patient['_id'] = str(patient['_id'])
        logger.info(f"Returning {len(patients)} patients")
        return jsonify(patients)
    except Exception as e:
        logger.error(f"Error fetching patients: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5008))
    logger.info(f"Starting Patient Management Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True) 