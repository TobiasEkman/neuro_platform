from flask import Flask, request, jsonify
from .models.tumor_segmentation import TumorSegmentationModel
from .utils.dicom_loader import load_dicom_series
from shared.models.registry import ModelRegistry
import numpy as np
from .models.mgmt_prediction import MGMTPredictionModel
import requests
from brats_toolkit import (
    Preprocessor, 
    Segmentor, 
    Fusionator,
    load_model
)
import pydicom
import os

app = Flask(__name__)
tumor_model = TumorSegmentationModel()
model_registry = ModelRegistry()
mgmt_model = MGMTPredictionModel()

# Initiera BraTS komponenter
preprocessor = Preprocessor()
segmentor = Segmentor()
fusionator = Fusionator()

@app.route('/api/analysis/tumor/<image_id>', methods=['POST'])
def analyze_tumor(image_id):
    try:
        approach = request.json.get('approach')
        image_data = load_dicom_series(image_id)
        
        # Perform tumor segmentation
        tumor_mask = tumor_model.segment(image_data)
        
        # Analyze critical structures
        structures = tumor_model.identify_critical_structures(image_data, tumor_mask)
        
        # Calculate surgical approach risks
        risks = tumor_model.calculate_approach_risks(
            tumor_mask,
            structures,
            approach
        )
        
        return jsonify({
            'volumeCc': float(np.sum(tumor_mask) * 0.001),
            'location': structures['location'],
            'eloquentAreas': structures['eloquent_areas'],
            'vesselInvolvement': structures['vessels'],
            'predictedResectionRate': risks['resection_probability'] * 100
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/mgmt/<image_id>', methods=['POST'])
def predict_mgmt_status(image_id):
    try:
        # Hämta preprocessade MRI-sekvenser
        loader = DicomLoader()
        sequences = loader.load_multisequence_data(image_id)
        
        # Normalisera sekvenser
        normalized_sequences = []
        for seq in sequences:
            norm_seq = (seq - seq.min()) / (seq.max() - seq.min())
            normalized_sequences.append(norm_seq)
            
        # Stacka sekvenser till 4D array (T1, T1c, T2, FLAIR)
        input_data = np.stack(normalized_sequences, axis=-1)
        
        # Gör MGMT-prediktion
        prediction = mgmt_model.predict(input_data)
        
        return jsonify(prediction)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/segment/<image_id>', methods=['POST'])
def segment_tumor(image_id):
    try:
        options = request.json
        selected_models = options.get('models', ['nnunet'])
        
        input_path = f"/data/processed/{image_id}"
        output_path = f"/data/segmentations/{image_id}"
        
        # Kör segmentering med valda modeller
        results = []
        for model_name in selected_models:
            segmentor.model = model_name
            result = segmentor.run(
                input_path=input_path,
                output_path=f"{output_path}/{model_name}"
            )
            results.append(result)
            
        return jsonify({
            'success': True,
            'segmentations': [r.tolist() for r in results]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/preprocess/<image_id>', methods=['POST'])
def preprocess_images(image_id):
    try:
        options = request.json
        
        # Konfigurera preprocessor
        preprocessor.mode = options.get('mode', 'gpu')
        preprocessor.enable_defacing = options.get('defacing', False)
        preprocessor.batch_mode = options.get('batchProcessing', True)
        
        # Ladda DICOM-data
        input_path = f"/data/dicom/{image_id}"
        output_path = f"/data/processed/{image_id}"
        
        # Kör preprocessingen
        preprocessor.run(
            input_path=input_path,
            output_path=output_path
        )
        
        return jsonify({
            'success': True,
            'preprocessed_path': output_path
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/fuse/<image_id>', methods=['POST'])
def fuse_segmentations(image_id):
    try:
        data = request.json
        method = data.get('method', 'simple')
        
        # Initiera BraTS Fusionator
        fusionator = Fusionator(method=method)
        
        # Hämta tidigare segmenteringar
        segmentations = data.get('segmentations', [])
        
        # Fusionera segmenteringar
        fused = fusionator.run(segmentations)
        
        return jsonify({
            'success': True,
            'fusedSegmentation': fused.tolist()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005) 