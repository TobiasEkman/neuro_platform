from flask import Flask, request, jsonify, Response
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from parsers.folder_parser import FolderParser
from utils.mongo_utils import init_mongo_indexes
import pydicom
import numpy as np
from flask_cors import CORS
import os
import requests
from werkzeug.utils import secure_filename
import logging
import re
import json
from flask import Response
from bson import json_util
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Set logging level to INFO
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
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

# Initialize indexes on startup
init_mongo_indexes(db)

@app.route('/api/dicom/parse/folder', methods=['POST'])
def parse_folder():
    try:
        data = request.get_json()
        folder_path = data.get('folderPath')
        
        if not folder_path:
            return jsonify({'error': 'Missing folderPath'}), 400
            
        if not os.path.exists(folder_path):
            return jsonify({'error': f'Directory not found: {folder_path}'}), 404
            
        logger.info(f"Parsing DICOM folder: {folder_path}")
        
        parser = FolderParser(db)
        
        def generate_response():
            for progress in parser.parse(folder_path):
                yield f"data: {json.dumps(progress)}\n\n"
        
        return Response(
            generate_response(),
            mimetype='text/event-stream'
        )
        
    except Exception as e:
        logger.error(f"Error parsing folder: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/dicom/search', methods=['GET'])
def search_studies():
    try:
        query = request.args.get('q', '')
        logger.info(f"Searching with query: {query}")
        
        # Build MongoDB query
        mongo_query = {}
        if query:
            query_parts = dict(part.split(':') for part in query.split() if ':' in part)
            if 'patient' in query_parts:
                mongo_query['patient_id'] = query_parts['patient']
            if 'study' in query_parts:
                mongo_query['study_instance_uid'] = query_parts['study']
        
        # Execute search
        studies = list(db.studies.find(mongo_query))
        
        # Använd json_util.dumps för att hantera MongoDB-specifika typer
        return Response(
            json_util.dumps(studies),
            mimetype='application/json'
        )
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/dicom/image', methods=['GET'])
def get_dicom_image():
    try:
        image_path = request.args.get('path')
        app.logger.info(f"\n[DICOM] Loading image: {image_path}")

        if not os.path.exists(image_path):
            app.logger.error(f"[DICOM] File not found: {image_path}")
            return jsonify({"error": "File not found"}), 404

        # Läs DICOM-filen med force=True
        ds = pydicom.dcmread(image_path, force=True)
        app.logger.info(f"\n[DICOM] File info:")
        app.logger.info(f"  Transfer Syntax: {ds.file_meta.TransferSyntaxUID}")
        app.logger.info(f"  SOP Class: {ds.SOPClassUID}")
        app.logger.info(f"  Modality: {ds.Modality}")

        # Kontrollera pixel data
        if not hasattr(ds, 'PixelData'):
            app.logger.error("[DICOM] No pixel data found!")
            raise ValueError("No pixel data found in DICOM file")

        # Extrahera pixel data
        try:
            pixel_array = ds.pixel_array
            app.logger.info(f"\n[DICOM] Pixel data info:")
            app.logger.info(f"  Shape: {pixel_array.shape}")
            app.logger.info(f"  Type: {pixel_array.dtype}")
            app.logger.info(f"  Range: {pixel_array.min()} to {pixel_array.max()}")
            app.logger.info(f"  Mean value: {pixel_array.mean():.2f}")
            app.logger.info(f"  Memory size: {pixel_array.nbytes / 1024:.2f} KB")

        except Exception as e:
            app.logger.error(f"[DICOM] Failed to get pixel array: {str(e)}")
            raise ValueError(f"Failed to extract pixel data: {str(e)}")

        # Skapa response
        response = {
            'rows': int(ds.Rows),
            'columns': int(ds.Columns),
            'windowCenter': float(getattr(ds, 'WindowCenter', [127])[0]),
            'windowWidth': float(getattr(ds, 'WindowWidth', [255])[0]),
            'bitsAllocated': int(ds.BitsAllocated),
            'rescaleIntercept': float(getattr(ds, 'RescaleIntercept', 0)),
            'rescaleSlope': float(getattr(ds, 'RescaleSlope', 1)),
            'pixelData': pixel_array.tolist()
        }

        app.logger.info(f"\n[DICOM] Sending response:")
        app.logger.info(f"  Image size: {response['rows']}x{response['columns']}")
        app.logger.info(f"  Window: C={response['windowCenter']}, W={response['windowWidth']}")
        app.logger.info(f"  Bits: {response['bitsAllocated']}")

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"[DICOM] Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

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

@app.route('/health', methods=['GET'])
def health_check():
    print("[Flask] Health check endpoint hit")
    try:
        response = {
            'status': 'ok',
            'message': 'Imaging service is running',
            'timestamp': datetime.now().isoformat(),
            'routes': [str(rule) for rule in app.url_map.iter_rules()]  # Lista alla registrerade rutter
        }
        print("[Flask] Sending response:", response)
        return jsonify(response)
    except Exception as e:
        print("[Flask] Error in health check:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/series/<series_id>', methods=['GET'])
def get_series_by_id(series_id):
    try:
        # Hämta specifik serie
        series = db.series.find_one({'series_instance_uid': series_id})
        if not series:
            return jsonify({'error': 'Series not found'}), 404
        return jsonify(series)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/series', methods=['GET'])
def get_series_for_study():
    try:
        study_id = request.args.get('studyId')
        if not study_id:
            return jsonify({'error': 'studyId is required'}), 400
            
        study = db.studies.find_one({'study_instance_uid': study_id})
        if not study:
            return jsonify({'error': 'Study not found'}), 404
            
        return jsonify(study.get('series', []))
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
              
        # Hämta alla instanser för denna serie
        instances = list(db.instances.find({'series_instance_uid': series_id}).sort('instance_number', 1))
        
        if not instances:
            return jsonify({'error': 'No instances found for series'}), 404
        
        # Skapa en tom volym med rätt dimensioner
        width = instances[0]['columns']
        height = instances[0]['rows']
        depth = len(instances)
        
        # Läs in pixeldata från varje instans
        volume_data = []
        for instance in instances:
            try:
                # Läs DICOM-filen
                file_path = instance['file_path']
                dataset = pydicom.dcmread(file_path)
                
                # Extrahera pixeldata och konvertera till float
                pixel_array = dataset.pixel_array.astype(float)
                
                # Normalisera till 0-255
                if pixel_array.max() > 0:
                    pixel_array = ((pixel_array / pixel_array.max()) * 255.0).astype(float)
                
                # Lägg till i volymdata
                volume_data.extend(pixel_array.flatten().tolist())
            except Exception as e:
                app.logger.error(f"Error reading instance {instance['instance_number']}: {str(e)}")
        
        # Returnera volymdata i rätt format för Cornerstone3D
        return jsonify({
            'volume': volume_data,
            'dimensions': [width, height, depth],
            'spacing': [1, 1, 1]  # Standard spacing om inte tillgängligt i DICOM
        })
    except Exception as e:
        app.logger.error(f"Error getting volume: {str(e)}")
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





@app.route('/api/dicom/study/<study_id>', methods=['GET'])
def get_study(study_id):
    try:
        print(f"[Flask] Received request for study: {study_id}")
        
        study = db.studies.find_one({'study_instance_uid': study_id})
        if not study:
            return jsonify({'error': 'Study not found'}), 404
            
        # Formatera datumet korrekt (från YYYYMMDD till YYYY-MM-DD)
        study_date = study.get('study_date', '')
        if study_date and len(study_date) == 8:
            formatted_date = f"{study_date[:4]}-{study_date[4:6]}-{study_date[6:]}"
        else:
            formatted_date = None
            
        formatted_study = {
            'study_instance_uid': study['study_instance_uid'],
            'patient_id': study['patient_id'],
            'study_date': formatted_date,  # Använd det formaterade datumet
            'series': [{
                'series_uid': series['series_uid'],
                'series_number': series['series_number'],
                'description': series['description'],
                'modality': series['modality'],
                'instances': [{
                    'sop_instance_uid': instance['sop_instance_uid'],
                    'instance_number': instance['instance_number'],
                    'file_path': instance['file_path'].replace('\\', '/')
                } for instance in series['instances']]
            } for series in study['series']]
        }
        
        return jsonify(formatted_study)
        
    except Exception as e:
        print(f"[Flask] Error getting study: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/dicom/studies', methods=['GET'])
def get_studies():
    try:
        patient_id = request.args.get('patientId')
        logger.info(f"Received request for studies with patientId: {patient_id}")
        
        query = {'patient_id': patient_id} if patient_id else {}
        logger.info(f"Using MongoDB query: {query}")
        
        studies = list(db.studies.find(query))
        logger.info(f"Found {len(studies)} studies matching query")
        
        # Visa första studien som exempel
        if studies and len(studies) > 0:
            logger.info(f"Example study fields: {list(studies[0].keys())}")
            logger.info(f"Example study patient_id: {studies[0].get('patient_id', 'No patient_id field!')}")
        
        return jsonify(studies)
    except Exception as e:
        logger.error(f"Error in get_studies: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/images/batch/<series_id>', methods=['GET'])
def get_image_batch(series_id):
    try:
        start = int(request.args.get('start', 0))
        batch_size = int(request.args.get('count', 10))
        
        # Hämta serien
        series = db.series.find_one({'series_instance_uid': series_id})
        if not series or not series.get('instances'):
            return jsonify({'error': 'Series not found'}), 404
            
        # Sortera instances efter nummer
        instances = sorted(
            series['instances'], 
            key=lambda x: int(x.get('instance_number', 0))
        )[start:start + batch_size]
        
        # Läs alla bilder i batchen parallellt
        def load_image(instance):
            ds = pydicom.dcmread(instance['file_path'], force=True)
            return {
                'instanceId': instance['sop_instance_uid'],
                'pixelData': ds.pixel_array.tolist(),
                'rows': ds.Rows,
                'columns': ds.Columns,
                'windowCenter': float(ds.WindowCenter),
                'windowWidth': float(ds.WindowWidth)
            }
            
        with ThreadPoolExecutor() as executor:
            batch_images = list(executor.map(load_image, instances))
            
        return jsonify({
            'images': batch_images,
            'total': len(series['instances']),
            'start': start,
            'count': len(batch_images)
        })
        
    except Exception as e:
        logger.error(f"Error loading image batch: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/cornerstone/<series_id>', methods=['GET'])
def get_cornerstone_image():
    try:
        file_path = request.args.get('path')
        if not file_path:
            return jsonify({'error': 'No file path provided'}), 400

        # Läs DICOM-filen
        ds = pydicom.dcmread(file_path, force=True)
        
        # Formatera data som Cornerstone förväntar sig
        response = {
            'imageId': f'dicom://{file_path}',
            'minPixelValue': float(ds.pixel_array.min()),
            'maxPixelValue': float(ds.pixel_array.max()),
            'slope': float(ds.get('RescaleSlope', 1.0)),
            'intercept': float(ds.get('RescaleIntercept', 0.0)),
            'windowCenter': float(ds.get('WindowCenter', ds.pixel_array.mean())),
            'windowWidth': float(ds.get('WindowWidth', ds.pixel_array.max() - ds.pixel_array.min())),
            'rows': int(ds.Rows),
            'columns': int(ds.Columns),
            'height': int(ds.Rows),
            'width': int(ds.Columns),
            'color': False,
            'columnPixelSpacing': float(ds.get('PixelSpacing', [1.0])[0]),
            'rowPixelSpacing': float(ds.get('PixelSpacing', [1.0, 1.0])[1]),
            'sizeInBytes': len(ds.pixel_array.tobytes()),
            'pixelData': ds.pixel_array.tobytes()
        }

        return Response(
            response=response['pixelData'],
            mimetype='application/octet-stream',
            headers={
                'X-Min-Pixel-Value': str(response['minPixelValue']),
                'X-Max-Pixel-Value': str(response['maxPixelValue']),
                'X-Window-Center': str(response['windowCenter']),
                'X-Window-Width': str(response['windowWidth']),
                'X-Rows': str(response['rows']),
                'X-Columns': str(response['columns']),
                'X-Intercept': str(response['intercept']),
                'X-Slope': str(response['slope'])
            }
        )

    except Exception as e:
        logger.error(f"Error loading Cornerstone image: {str(e)}")
        return jsonify({'error': str(e)}), 500



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