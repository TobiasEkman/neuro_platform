from flask import Flask, request, jsonify
from pymongo import MongoClient
from .parsers.folder_parser import FolderParser
from .parsers.dicomdir_parser import DicomdirParser
from .utils.mongo_utils import init_mongo_indexes
from utils.search import fuzzy_search
from .utils.dataset_analyzer import DatasetAnalyzer

app = Flask(__name__)

# Initialize MongoDB connection
client = MongoClient("mongodb://mongodb:27017")
db = client["neuro_platform"]

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003) 