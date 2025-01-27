from flask import Flask, request, jsonify
from pymongo import MongoClient
from .parsers.folder_parser import FolderParser
from .parsers.dicomdir_parser import DicomdirParser
from .utils.mongo_utils import init_mongo_indexes

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003) 