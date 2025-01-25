from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np

app = Flask(__name__)

# Load ICD-10 coding model
tokenizer = AutoTokenizer.from_pretrained('microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext')
model = AutoModelForSequenceClassification.from_pretrained('microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext')

@app.route('/api/coding/icd', methods=['POST'])
def code_diagnosis():
    try:
        text = request.json['text']
        
        # Tokenize and predict
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = model(**inputs)
        predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Map to ICD codes (simplified example)
        icd_codes = {
            'S06': 'Intracranial injury',
            'C71': 'Malignant neoplasm of brain',
            'I61': 'Intracerebral hemorrhage',
            'G91': 'Hydrocephalus'
        }
        
        # Get top 3 predictions
        top_preds = torch.topk(predictions[0], k=3)
        
        results = []
        for score, idx in zip(top_preds.values, top_preds.indices):
            code = list(icd_codes.keys())[idx]
            description = icd_codes[code]
            results.append({
                'code': code,
                'description': description,
                'confidence': float(score)
            })
        
        return jsonify({
            'suggestions': results,
            'text_analyzed': text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/coding/procedure', methods=['POST'])
def code_procedure():
    try:
        text = request.json['text']
        
        # Predefined neurosurgical procedures (example)
        procedures = {
            '01.24': 'Craniotomy',
            '01.59': 'Skull base surgery',
            '02.34': 'Ventricular shunt',
            '01.31': 'Incision of cerebral meninges'
        }
        
        # Simplified matching (in practice, would use a trained model)
        matches = []
        for code, desc in procedures.items():
            if any(keyword in text.lower() for keyword in desc.lower().split()):
                matches.append({
                    'code': code,
                    'description': desc,
                    'confidence': 0.9  # Simplified confidence score
                })
        
        return jsonify({
            'suggestions': matches,
            'text_analyzed': text
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002) 