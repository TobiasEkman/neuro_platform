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
import os
import requests
from werkzeug.utils import secure_filename
import logging

# Hårdkodad URL till patient service (port 5008)
PATIENT_SERVICE_URL = 'http://localhost:5008/api'

# Konfigurera logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Lägg till standard UPLOAD_DIR (använd gärna volymen /data/dicom i docker-compose)
app.config['UPLOAD_DIR'] = os.environ.get('UPLOAD_DIR', '/data/dicom')
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/search": {"origins": "*"}
})  # Enable CORS for all routes

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
    if db is None or not client:
        return jsonify({
            'error': 'Database connection not available',
            'message': 'Please ensure MongoDB is running'
        }), 503

@app.before_request
def log_request_info():
    logger.debug('Headers: %s', request.headers)
    logger.debug('Body: %s', request.get_data())
    logger.debug('URL: %s', request.url)
    logger.debug('Path: %s', request.path)
    logger.debug('Method: %s', request.method)

@app.before_request
def check_db():
    if db is None:
        logger.error("No database connection!")
        return jsonify({
            'error': 'Database Error',
            'message': 'No database connection available'
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

@app.route('/search', methods=['GET'])
@app.route('/api/dicom/search', methods=['GET'])
def search_studies():
    try:
        query = request.args.get('q', '')
        logger.info(f'Searching with query: {query}')
        
        # Om ingen query, returnera alla studier
        if not query:
            logger.debug('No query provided, returning all studies')
            studies = list(db.studies.find({}))
            logger.info(f'Found {len(studies)} studies')
            return jsonify(studies)
            
        # Parse query format "patient:default" etc
        query_parts = dict(part.split(':') for part in query.split() if ':' in part)
        logger.debug(f'Parsed query parts: {query_parts}')
        
        # Build MongoDB query
        mongo_query = {}
        if 'patient' in query_parts and query_parts['patient'] != 'default':
            mongo_query['patient_id'] = query_parts['patient']
        logger.debug(f'MongoDB query: {mongo_query}')
        
        # Execute search
        studies = list(db.studies.find(mongo_query))
        logger.info(f'Found {len(studies)} matching studies')
        return jsonify(studies)
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/dicom/upload', methods=['POST'])
def upload_dicom():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
            
        pid = request.form.get('pid')
        if not pid:
            return jsonify({'error': 'No patient ID provided'}), 400

        files = request.files.getlist('files')
        upload_dir = os.path.join(app.config['UPLOAD_DIR'], pid)
        os.makedirs(upload_dir, exist_ok=True)

        # Save files and parse DICOM data
        saved_files = []
        for file in files:
            filename = secure_filename(file.filename)
            filepath = os.path.join(upload_dir, filename)
            file.save(filepath)
            saved_files.append(filepath)

        # Parse the uploaded files
        parser = FolderParser(db)
        study_data = parser.parse(upload_dir)

        # Update patient record in patient management service
        response = requests.post(
            f'{PATIENT_SERVICE_URL}/patients/pid/{pid}/dicom',
            json=study_data
        )
        
        if not response.ok:
            raise Exception('Failed to update patient record')

        return jsonify({
            'message': 'Upload successful',
            'studies': study_data
        })

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found_error(error):
    logger.error(f"404 Error: {request.url}")
    return jsonify({
        'error': 'Not Found',
        'message': f'The requested URL {request.url} was not found on the server.',
        'path': request.path
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Error: {error}", exc_info=True)
    return jsonify({
        'error': 'Internal Server Error',
        'message': str(error)
    }), 500

if __name__ == '__main__':
    logger.info("Starting Imaging Service...")
    logger.info("Available routes:")
    for rule in app.url_map.iter_rules():
        logger.info(f"{rule.endpoint}: {rule.rule}")
    app.run(host='0.0.0.0', port=5003, debug=True) 