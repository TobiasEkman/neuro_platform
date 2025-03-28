from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
import logging
from bson import ObjectId
from bson.errors import InvalidId

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

@app.route('/patients', methods=['GET'])
def get_patients():
    try:
        patients = list(db.patients.find())
        for patient in patients:
            patient['_id'] = str(patient['_id'])
        return jsonify(patients)
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/<id>', methods=['GET', 'PUT', 'DELETE'])
def handle_patient(id):
    try:
        if request.method == 'GET':
            patient = db.patients.find_one({'_id': ObjectId(id)})
            if patient:
                patient['_id'] = str(patient['_id'])
                return jsonify(patient)
            return jsonify({'error': 'Patient not found'}), 404

        elif request.method == 'PUT':
            data = request.json
            result = db.patients.update_one(
                {'_id': ObjectId(id)}, 
                {'$set': data}
            )
            if result.modified_count:
                return jsonify({'message': 'Patient updated'})
            return jsonify({'error': 'Patient not found'}), 404

        elif request.method == 'DELETE':
            result = db.patients.delete_one({'_id': ObjectId(id)})
            if result.deleted_count:
                return jsonify({'message': 'Patient deleted'})
            return jsonify({'error': 'Patient not found'}), 404

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/pid/<pid>', methods=['GET', 'PUT', 'DELETE'])
def handle_patient_by_pid(pid):
    try:
        if request.method == 'GET':
            patient = db.patients.find_one({'patient_id': pid})
            if patient:
                patient['_id'] = str(patient['_id'])
                return jsonify(patient)
            return jsonify({'error': 'Patient not found'}), 404

        elif request.method == 'PUT':
            data = request.json
            result = db.patients.update_one(
                {'patient_id': pid}, 
                {'$set': data}
            )
            if result.modified_count:
                return jsonify({'message': 'Patient updated'})
            return jsonify({'error': 'Patient not found'}), 404

        elif request.method == 'DELETE':
            result = db.patients.delete_one({'patient_id': pid})
            if result.deleted_count:
                return jsonify({'message': 'Patient deleted'})
            return jsonify({'error': 'Patient not found'}), 404

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/bulk', methods=['POST'])
def bulk_update():
    try:
        data = request.json
        patients = data.get('patients', [])
        
        results = []
        for patient_data in patients:
            pid = patient_data.get('pid')
            
            if not pid:
                # Skapa en ny patient
                result = db.patients.insert_one(patient_data)
                results.append({
                    'pid': pid,
                    'status': 'created',
                    '_id': str(result.inserted_id)
                })
            else:
                # Uppdatera en befintlig patient
                result = db.patients.update_one(
                    {'patient_id': pid},
                    {'$set': patient_data},
                    upsert=True
                )
                
                if result.matched_count:
                    results.append({
                        'pid': pid,
                        'status': 'updated'
                    })
                else:
                    results.append({
                        'pid': pid,
                        'status': 'created'
                    })
        
        return jsonify({
            'message': f'Processed {len(results)} patients',
            'results': results
        })
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Kontrollera att databasen är tillgänglig
        db.command('ping')
        return jsonify({
            'status': 'ok',
            'message': 'Patient Management Service is running',
            'database': 'connected'
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5008))
    logger.info(f"Starting Patient Management Service on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True) 