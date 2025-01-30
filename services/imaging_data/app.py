from flask import Flask, request, jsonify, send_file
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from parsers.folder_parser import FolderParser
from parsers.dicomdir_parser import DicomdirParser
from utils.mongo_utils import init_mongo_indexes
from utils.search import fuzzy_search
from utils.dataset_analyzer import DatasetAnalyzer
import pydicom
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize MongoDB connection with error handling
try:
    # For Windows, use this connection string
    client = MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=5000)
    # Verify connection
    client.server_info()
    db = client["neuro_platform"]
    print("Successfully connected to MongoDB")
except ServerSelectionTimeoutError as e:
    print(f"Failed to connect to MongoDB: {e}")
    db = None

@app.before_request
def check_db_connection():
    if db is None:
        return jsonify({
            'error': 'Database connection not available',
            'message': 'Please ensure MongoDB is running'
        }), 503

# Initialize indexes on startup
init_mongo_indexes(db)

@app.route('/api/dicom/parse/folder', methods=['POST'])
def parse_folder():
    try:
        folder_path = request.json.get('folderPath')
        if not folder_path:
            return jsonify({'error': 'folderPath is required'}), 400

        parser = FolderParser(db)
        result = parser.parse(folder_path)
        
        return jsonify({
            'message': 'DICOM folder parsed successfully',
            'studies': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/parse/dicomdir', methods=['POST'])
def parse_dicomdir():
    try:
        dicomdir_path = request.json.get('dicomdirPath')
        if not dicomdir_path:
            return jsonify({'error': 'dicomdirPath is required'}), 400

        parser = DicomdirParser(db)
        result = parser.parse(dicomdir_path)
        
        return jsonify({
            'message': 'DICOMDIR parsed successfully',
            'studies': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    # Search in patients collection
    patient_results = fuzzy_search(
        query,
        list(db.patients.find()),
        ['patient_name', 'patient_id']
    )

    # Search in studies collection
    study_results = fuzzy_search(
        query,
        list(db.studies.find()),
        ['study_description', 'study_date']
    )

    # Search in series collection
    series_results = fuzzy_search(
        query,
        list(db.series.find()),
        ['series_description', 'modality']
    )

    # Combine and format results
    results = []
    
    for pr in patient_results:
        results.append({
            'type': 'Patient',
            'id': str(pr['document']['_id']),
            'text': f"{pr['document']['patient_name']} ({pr['document']['patient_id']})",
            'score': pr['score']
        })

    for sr in study_results:
        results.append({
            'type': 'Study',
            'id': str(sr['document']['_id']),
            'text': f"{sr['document']['study_description']} ({sr['document']['study_date']})",
            'score': sr['score']
        })

    for sr in series_results:
        results.append({
            'type': 'Series',
            'id': str(sr['document']['_id']),
            'text': f"{sr['document']['modality']}: {sr['document']['series_description']}",
            'score': sr['score']
        })

    # Sort by score and return top 10
    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(results[:10])

@app.route('/api/dataset/analyze', methods=['GET'])
def analyze_dataset():
    try:
        analyzer = DatasetAnalyzer(db)
        analysis = analyzer.analyze_dataset()
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/image/<instance_uid>', methods=['GET'])
def get_image(instance_uid):
    try:
        # Get file path from MongoDB
        instance = db.instances.find_one({'sop_instance_uid': instance_uid})
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404

        # Read DICOM file
        ds = pydicom.dcmread(instance['file_path'])
        
        # Set CORS headers
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/dicom'
        }
        
        # Return the file with proper headers
        return send_file(
            instance['file_path'],
            mimetype='application/dicom',
            as_attachment=True,
            download_name=f"{instance_uid}.dcm",
            headers=headers
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/test', methods=['GET'])
def test_connection():
    if db is None:
        return jsonify({
            'status': 'error',
            'message': 'MongoDB not connected'
        }), 503
    
    try:
        # Test MongoDB connection
        db.command('ping')
        return jsonify({
            'status': 'success',
            'message': 'Connected to MongoDB',
            'database': db.name
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/dicom/series/<series_id>', methods=['GET'])
def get_series(series_id):
    try:
        # Get series from MongoDB
        series = db.series.find_one({'series_instance_uid': series_id})
        if not series:
            return jsonify({'error': 'Series not found'}), 404
            
        return jsonify(series)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/stats', methods=['GET'])
def get_stats():
    try:
        stats = {
            'patients': db.patients.count_documents({}),
            'studies': db.studies.count_documents({}),
            'series': db.series.count_documents({}),
            'instances': db.instances.count_documents({})
        }
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/list', methods=['GET'])
def list_data():
    try:
        patients = list(db.patients.find({}, {'_id': 0}))
        
        # Get studies for each patient
        for patient in patients:
            patient['studies'] = list(db.studies.find(
                {'patient_id': patient['patient_id']}, 
                {'_id': 0}
            ))
            
            # Get series for each study
            for study in patient['studies']:
                study['series'] = list(db.series.find(
                    {'study_instance_uid': study['study_instance_uid']},
                    {'_id': 0}
                ))

        return jsonify({
            'patients': patients,
            'stats': {
                'patients': len(patients),
                'studies': db.studies.count_documents({}),
                'series': db.series.count_documents({}),
                'instances': db.instances.count_documents({})
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/volume/<series_id>', methods=['GET'])
def get_volume(series_id):
    try:
        series = db.series.find_one({'series_instance_uid': series_id})
        if not series:
            return jsonify({'error': 'Series not found'}), 404
            
        # Get all instances for this series
        instances = list(db.instances.find({'series_instance_uid': series_id}))
        
        # Process volume data
        volume_data = {
            'volume': [], # Process DICOM data into volume array
            'dimensions': {
                'width': instances[0]['columns'],
                'height': instances[0]['rows'],
                'depth': len(instances)
            }
        }
        
        return jsonify(volume_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003) 