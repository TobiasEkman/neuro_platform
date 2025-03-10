from flask import Flask, request, jsonify, Response
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from parsers.folder_parser import FolderParser
from utils.mongo_utils import init_mongo_indexes
import pydicom
from flask_cors import CORS
import os
import logging
import json
from flask import Response
from datetime import datetime

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
def get_series_by_series_id(series_id):
    try:
        # Hämta specifik serie
        series = db.series.find_one({'series_instance_uid': series_id})
        if not series:
            return jsonify({'error': 'Series not found'}), 404
        return jsonify(series)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/series', methods=['GET'])
def get_series_by_study_id():
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

@app.route('/api/dicom/volume/<series_id>', methods=['GET'])
def get_volume_by_series_id(series_id):
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

@app.route('/api/dicom/study/<study_id>', methods=['GET'])
def get_study_by_study_id(study_id):
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
def get_studies_by_patient_id():
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

@app.route('/api/dicom/imageIds', methods=['GET'])
def get_image_ids():
    try:
        study_id = request.args.get('studyId')
        series_id = request.args.get('seriesId')
        
        if not study_id and not series_id:
            return jsonify({'error': 'studyId eller seriesId krävs'}), 400
            
        query = {}
        if study_id:
            query['study_instance_uid'] = study_id
        if series_id:
            query['series_instance_uid'] = series_id
            
        instances = list(db.instances.find(query, {'_id': 0}))
        
        # Skapa imageIds för Cornerstone (wado-uri format)
        base_url = request.host_url.rstrip('/')
        image_ids = []
        
        for instance in instances:
            image_path = instance.get('file_path', '').replace('\\', '/')
            # Skapa en wadors:// imageId (Cornerstone DICOM Image Loader format)
            image_id = f"wadouri:{base_url}/api/dicom/instance/{instance['sop_instance_uid']}"
            
            image_ids.append({
                'imageId': image_id,
                'sopInstanceUid': instance['sop_instance_uid'],
                'seriesInstanceUid': instance.get('series_instance_uid', ''),
                'studyInstanceUid': instance.get('study_instance_uid', ''),
                'instanceNumber': instance.get('instance_number', 0),
                'filePath': image_path
            })
            
        # Sortera efter instanceNumber
        image_ids.sort(key=lambda x: x['instanceNumber'])
        
        return jsonify(image_ids)
    except Exception as e:
        logger.error(f"Error getting image IDs: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/instance/<sop_instance_uid>', methods=['GET'])
def get_instance(sop_instance_uid):
    try:
        instance = db.instances.find_one({'sop_instance_uid': sop_instance_uid})
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
            
        file_path = instance.get('file_path')
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'DICOM file not found'}), 404
        
        headers = {
            'Content-Type': 'application/dicom',
            'Content-Disposition': f'attachment; filename={sop_instance_uid}.dcm'
        }
        return Response(open(file_path, 'rb').read(), headers=headers)
        
    except Exception as e:
        logger.error(f"Error getting instance: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dicom/metadata/<sop_instance_uid>', methods=['GET'])
def get_instance_metadata(sop_instance_uid):
    try:
        instance = db.instances.find_one({'sop_instance_uid': sop_instance_uid})
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
            
        file_path = instance.get('file_path')
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'DICOM file not found'}), 404
            
        # Läs DICOM-filen för metadata
        ds = pydicom.dcmread(file_path, force=True, stop_before_pixels=True)
        
        # Extrahera relevant metadata för Cornerstone
        metadata = {
            'sopInstanceUid': sop_instance_uid,
            'seriesInstanceUid': ds.SeriesInstanceUID if hasattr(ds, 'SeriesInstanceUID') else '',
            'studyInstanceUid': ds.StudyInstanceUID if hasattr(ds, 'StudyInstanceUID') else '',
            'rows': int(ds.Rows) if hasattr(ds, 'Rows') else 0,
            'columns': int(ds.Columns) if hasattr(ds, 'Columns') else 0,
            'instanceNumber': int(ds.InstanceNumber) if hasattr(ds, 'InstanceNumber') else 0,
            'sliceLocation': float(ds.SliceLocation) if hasattr(ds, 'SliceLocation') else 0,
            'sliceThickness': float(ds.SliceThickness) if hasattr(ds, 'SliceThickness') else 0,
            'pixelSpacing': list(map(float, ds.PixelSpacing)) if hasattr(ds, 'PixelSpacing') else [1, 1],
            'windowCenter': float(ds.WindowCenter[0] if isinstance(ds.WindowCenter, pydicom.multival.MultiValue) else ds.WindowCenter) if hasattr(ds, 'WindowCenter') else 127,
            'windowWidth': float(ds.WindowWidth[0] if isinstance(ds.WindowWidth, pydicom.multival.MultiValue) else ds.WindowWidth) if hasattr(ds, 'WindowWidth') else 255,
            'rescaleIntercept': float(ds.RescaleIntercept) if hasattr(ds, 'RescaleIntercept') else 0,
            'rescaleSlope': float(ds.RescaleSlope) if hasattr(ds, 'RescaleSlope') else 1,
        }
        
        return jsonify(metadata)
        
    except Exception as e:
        logger.error(f"Error getting metadata: {str(e)}")
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