from flask import Flask, request, jsonify, send_file, Response
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from parsers.folder_parser import FolderParser
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
from preprocessors.mgmt_preprocessor import MGMTPreprocessor
import re
import json
from bson import json_util
from bson.objectid import ObjectId
from pathlib import Path

# Set logging level to DEBUG
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# At the top of your app.py, after the imports
print(f"Environment DICOM_BASE_DIR: {os.environ.get('DICOM_BASE_DIR')}")
DICOM_BASE_DIR = os.environ.get('DICOM_BASE_DIR', 'C:/Users/Tobias/development/test patients')
print(f"Using DICOM_BASE_DIR: {DICOM_BASE_DIR}")

app = Flask(__name__)
app.config['UPLOAD_DIR'] = os.environ.get('UPLOAD_DIR', DICOM_BASE_DIR)
CORS(app)

# Disable reloader when processing files
app.config['USE_RELOADER'] = False

# Add configuration
app.config['PATIENT_SERVICE_URL'] = os.getenv('PATIENT_SERVICE_URL', 'http://localhost:5008/api')

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

mgmt_preprocessor = MGMTPreprocessor(db)

# Print all registered routes at startup
print("Registered Routes:")
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule.rule}")

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
    data = request.get_json()
    folder_path = data.get('folderPath')
    if not folder_path:
        return jsonify({'error': 'Missing folderPath'}), 400
    
    def generate():
        try:
            full_path = os.path.join(DICOM_BASE_DIR, folder_path)
            full_path = os.path.normpath(full_path)
            
            if not os.path.exists(full_path):
                yield json.dumps({
                    'error': f'Folder not found: {full_path}'
                }) + '\n'
                return

            parser = FolderParser(db)
            for progress in parser.parse(full_path):
                # Ensure proper line formatting
                yield json.dumps(progress, ensure_ascii=False) + '\n'

        except Exception as e:
            logger.error(f'Error parsing DICOM data: {str(e)}', exc_info=True)
            yield json.dumps({'error': str(e)}) + '\n'

    return Response(
        generate(),
        mimetype='application/x-ndjson',
        headers={
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    )

@app.route('/search', methods=['GET'])
@app.route('/api/dicom/search', methods=['GET'])
def search_studies():
    try:
        query = request.args.get('q', '')
        logger.info(f'Searching with query: {query}')
        
        # Build MongoDB query
        mongo_query = {}
        
        # Parse query format "key:value"
        if query:
            query_parts = dict(part.split(':') for part in query.split() if ':' in part)
            
            if 'patient' in query_parts:
                mongo_query['patient_id'] = query_parts['patient']
            if 'study' in query_parts:
                mongo_query['study_instance_uid'] = query_parts['study']
        
        # Execute search
        studies = list(db.studies.find(mongo_query))
        
        # Format response
        formatted_studies = []
        for study in studies:
            study['_id'] = str(study['_id'])
            formatted_studies.append(study)
            
        return json_util.dumps(formatted_studies), 200, {'Content-Type': 'application/json'}
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

@app.route('/api/dicom/image', methods=['GET'])
def get_dicom_image():
    try:
        path = request.args.get('path')
        app.logger.info(f"Incoming path: {path}")
        
        if not path:
            return jsonify({'error': 'No path provided'}), 400

        # Handle spaces in path
        normalized_path = os.path.normpath(
            path.replace('\\', '/')
            .replace('%20', ' ')  # Handle URL-encoded spaces
        ).lstrip('/')
        
        app.logger.info(f"Normalized path: {normalized_path}")
        
        # Try relative to DICOM_BASE_DIR
        full_path = os.path.join(DICOM_BASE_DIR, normalized_path)
        app.logger.info(f"Full path: {full_path}")
        app.logger.info(f"Path exists? {os.path.exists(full_path)}")
        
        if not os.path.isfile(full_path):
            app.logger.error(f"File not found at: {full_path}")
            return jsonify({
                'error': 'File not found',
                'attempted_path': full_path,
                'base_dir': DICOM_BASE_DIR,
                'normalized_path': normalized_path
            }), 404

        app.logger.info(f"Serving file from: {full_path}")
        return send_file(full_path, mimetype='application/dicom')
    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
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
        
        # Log patient ID formats
        for patient in patients:
            logger.info('Imaging service patient ID check', {
                'patient_id': patient.get('patient_id'),
                'has_valid_pid_format': bool(re.match(r'^PID_\d{4}$', str(patient.get('patient_id'))))
            })
        
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
            f'{app.config["PATIENT_SERVICE_URL"]}/patients/pid/{pid}/dicom',
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

@app.route('/api/preprocess/mgmt/<study_id>', methods=['GET'])
def preprocess_mgmt(study_id):
    """Preprocess MRI sequences for MGMT prediction"""
    try:
        # Validate required sequences exist
        if not mgmt_preprocessor.validate_sequences(study_id):
            return jsonify({
                'error': 'Missing required sequences (T1, T1c, T2, FLAIR)'
            }), 400
            
        # Prepare normalized sequences
        sequences = mgmt_preprocessor.prepare_sequences(study_id)
        
        return jsonify({
            'preprocessed_data': sequences.tolist(),
            'study_id': study_id,
            'sequence_types': ['T1', 'T1c', 'T2', 'FLAIR']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'mongodb_connected': True
    })

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

@app.route('/api/config/dicom-path', methods=['GET', 'POST'])
def configure_dicom_path():
    if request.method == 'POST':
        data = request.json
        new_path = data.get('path')
        
        if not new_path:
            return jsonify({'error': 'No path provided'}), 400
            
        # Validate the path exists
        if not os.path.exists(new_path):
            return jsonify({'error': 'Path does not exist'}), 400
            
        # Store in environment variable
        os.environ['DICOM_BASE_DIR'] = new_path
        app.config['DICOM_BASE_DIR'] = new_path
        
        return jsonify({
            'message': 'DICOM path updated',
            'path': new_path
        })
    
    # GET request returns current path
    return jsonify({
        'path': os.environ.get('DICOM_BASE_DIR', 'C:/Users/Tobias/development/test patients')
    })

@app.route('/api/dicom/debug', methods=['GET'])
def debug_dicom():
    """Debug endpoint to check DICOM configuration"""
    try:
        test_path = request.args.get('path')
        return jsonify({
            'DICOM_BASE_DIR': DICOM_BASE_DIR,
            'DICOM_BASE_DIR_from_env': os.environ.get('DICOM_BASE_DIR'),
            'UPLOAD_DIR': app.config['UPLOAD_DIR'],
            'base_dir_exists': os.path.exists(DICOM_BASE_DIR),
            'base_dir_is_dir': os.path.isdir(DICOM_BASE_DIR),
            'base_dir_contents': os.listdir(DICOM_BASE_DIR) if os.path.exists(DICOM_BASE_DIR) else [],
            'env_vars': dict(os.environ),  # Add this to see all environment variables
            'test_path': {
                'raw': test_path,
                'normalized': os.path.normpath(test_path) if test_path else None,
                'full_path': os.path.join(DICOM_BASE_DIR, test_path) if test_path else None,
                'exists': os.path.exists(os.path.join(DICOM_BASE_DIR, test_path)) if test_path else None
            } if test_path else None
        })
    except Exception as e:
        app.logger.error(f"Debug endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'status': 'ok', 'message': 'Flask server is running'})

if __name__ == '__main__':
    print("\nStarting Flask server...")
    print("\nRegistered Routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule.rule}")
    
    # Run with debug mode and no reloader
    app.run(
        host='0.0.0.0', 
        port=5003, 
        debug=True,
        use_reloader=False  # Disable reloader to prevent double registration
    ) 