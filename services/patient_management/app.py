from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.neuro_platform

def validate_patient(patient):
    errors = []
    # Required fields
    if not patient.get('name'):
        errors.append("Name is required")
    if not isinstance(patient.get('age'), int):
        errors.append("Age must be a number")
    if not patient.get('diagnosis'):
        errors.append("Diagnosis is required")
    
    # Optional field validation
    if 'mgmtStatus' in patient and patient['mgmtStatus'] not in ['Methylated', 'Unmethylated', 'Unknown']:
        errors.append("Invalid MGMT status")
    if 'operativeDate' in patient:
        try:
            datetime.strptime(patient['operativeDate'], '%Y-%m-%d')
        except:
            errors.append("Invalid operative date format (use YYYY-MM-DD)")
    
    return errors

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test MongoDB connection
        db.command('ping')
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/patients', methods=['GET'])
def get_patients():
    try:
        query = {}
        # Add filtering options
        if request.args.get('diagnosis'):
            query['diagnosis'] = request.args.get('diagnosis')
        if request.args.get('mgmtStatus'):
            query['mgmtStatus'] = request.args.get('mgmtStatus')

        patients = list(db.patients.find(query))
        for patient in patients:
            patient['_id'] = str(patient['_id'])
        logger.info(f"Retrieved {len(patients)} patients")
        return jsonify(patients)
    except Exception as e:
        logger.error(f"Error getting patients: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    try:
        patient = db.patients.find_one({'_id': ObjectId(patient_id)})
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        patient['_id'] = str(patient['_id'])
        return jsonify(patient)
    except Exception as e:
        logger.error(f"Error getting patient {patient_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/<patient_id>', methods=['PUT'])
def update_patient(patient_id):
    try:
        data = request.json
        errors = validate_patient(data)
        if errors:
            return jsonify({'errors': errors}), 400

        result = db.patients.update_one(
            {'_id': ObjectId(patient_id)},
            {'$set': data}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Patient not found'}), 404
        
        logger.info(f"Updated patient {patient_id}")
        return jsonify({'message': 'Patient updated successfully'})
    except Exception as e:
        logger.error(f"Error updating patient {patient_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        result = db.patients.delete_one({'_id': ObjectId(patient_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Patient not found'}), 404
        
        logger.info(f"Deleted patient {patient_id}")
        return jsonify({'message': 'Patient deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting patient {patient_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/bulk-upload', methods=['POST'])
def bulk_upload():
    try:
        patients_data = request.json
        
        # Validate all patients before inserting
        all_errors = {}
        for i, patient in enumerate(patients_data):
            errors = validate_patient(patient)
            if errors:
                all_errors[i] = errors

        if all_errors:
            return jsonify({
                'error': 'Validation failed',
                'details': all_errors
            }), 400

        result = db.patients.insert_many(patients_data)
        logger.info(f"Bulk uploaded {len(result.inserted_ids)} patients")
        return jsonify({
            'message': f'Successfully uploaded {len(result.inserted_ids)} patients',
            'patient_ids': [str(id) for id in result.inserted_ids]
        })
    except Exception as e:
        logger.error(f"Error in bulk upload: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/patients/pid/<pid>/dicom', methods=['POST'])
def add_dicom_data(pid):
    try:
        patient = db.patients.find_one({'id': pid})
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        study_data = request.json
        
        # Update patient's images array
        result = db.patients.update_one(
            {'id': pid},
            {'$push': {'images': {'$each': study_data['images']}}}
        )

        # Create study records
        for study in study_data['studies']:
            study['patient_id'] = patient['_id']
            db.studies.insert_one(study)

        return jsonify({'message': 'DICOM data added successfully'})

    except Exception as e:
        logger.error(f"Error adding DICOM data: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004, debug=True) 