import os
import base64
import json
import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template
from cryptography.fernet import Fernet
from pymongo import MongoClient
from datetime import datetime

app = Flask(__name__)

# Paths for the encrypted and decrypted model files
ENCRYPTED_MODEL_JSON_PATH = './data/model_encrypted.json'
ENCRYPTED_BIN_DIR = './data/encrypted_bin_files'

# Set the base directory for decrypted files
MODEL_DIR = os.path.join(os.path.abspath('.'), 'data')

# Paths for decrypted files
DECRYPTED_MODEL_JSON_PATH = os.path.join(MODEL_DIR, 'model_decrypted.json')
DECRYPTED_BIN_DIR = os.path.join(MODEL_DIR, 'decrypted_bin_files')
key_expiration_time = None  # Global variable to store the key expiration time

# MongoDB connection
client = MongoClient('mongodb://mongodb:27017/')
db = client.neuro_platform

# Add new collection for tracking model usage
model_usage = db.model_usage

def validate_encryption_key(encoded_key_payload):
    try:
        print(f"Encoded Key Payload: {encoded_key_payload}")  # Debugging
        
        # Ensure correct padding for the base64 encoded string
        padding_needed = 4 - (len(encoded_key_payload) % 4)
        if padding_needed != 4:
            encoded_key_payload += "=" * padding_needed

        # First base64 decoding
        first_decoded_data = base64.urlsafe_b64decode(encoded_key_payload).decode('utf-8')
        print(f"First Decoded Payload: {first_decoded_data}")  # Debugging

        # Check if the result is still base64 encoded
        try:
            decoded_data = base64.urlsafe_b64decode(first_decoded_data).decode('utf-8')
            print(f"Second Decoded Payload (JSON): {decoded_data}")  # Debugging
        except (ValueError, TypeError):
            decoded_data = first_decoded_data
            print(f"Single Decoded Payload (JSON): {decoded_data}")  # Debugging
        
        # Parse the decoded data as JSON
        key_data = json.loads(decoded_data)
        print(f"Key Data: {key_data}")  # Debugging
        
        # Extract the key and expiration timestamp
        encryption_key = key_data["key"]
        global key_expiration_time
        key_expiration_time = datetime.datetime.utcfromtimestamp(key_data["expires_at"])
        
        return encryption_key.encode('utf-8')
    except (ValueError, TypeError, json.JSONDecodeError) as e:
        print(f"Error during key validation: {e}")  # Debugging
        return None  # Invalid key format

def decrypt_and_prepare_model(encryption_key):
    try:
        print(f"Starting model decryption with key: {encryption_key}")  # Debugging

        # Check if the model_decrypted.json already exists, and if so, skip decryption
        if not os.path.exists(DECRYPTED_MODEL_JSON_PATH):
            cipher_suite = Fernet(encryption_key)
            
            # Decrypt the model_encrypted.json file
            print(f"Decrypting model.json from {ENCRYPTED_MODEL_JSON_PATH}")  # Debugging
            with open(ENCRYPTED_MODEL_JSON_PATH, 'rb') as file:
                encrypted_json_data = file.read()
            decrypted_json_data = cipher_suite.decrypt(encrypted_json_data)
            
            # Save the decrypted model.json as model_decrypted.json
            os.makedirs(MODEL_DIR, exist_ok=True)
            with open(DECRYPTED_MODEL_JSON_PATH, 'wb') as json_file:
                json_file.write(decrypted_json_data)
            print(f"Decrypted model.json saved to {DECRYPTED_MODEL_JSON_PATH}")  # Debugging
            
            # Decrypt all .bin files
            os.makedirs(DECRYPTED_BIN_DIR, exist_ok=True)
            for bin_file in os.listdir(ENCRYPTED_BIN_DIR):
                if bin_file.endswith('.bin'):
                    print(f"Decrypting {bin_file}")  # Debugging
                    with open(os.path.join(ENCRYPTED_BIN_DIR, bin_file), 'rb') as file:
                        encrypted_bin_data = file.read()
                    decrypted_bin_data = cipher_suite.decrypt(encrypted_bin_data)
                    
                    # Save the decrypted .bin file
                    decrypted_bin_file_path = os.path.join(DECRYPTED_BIN_DIR, bin_file)
                    with open(decrypted_bin_file_path, 'wb') as bin_file_out:
                        bin_file_out.write(decrypted_bin_data)
                    print(f"Decrypted {bin_file} saved to {decrypted_bin_file_path}")  # Debugging
                
            print("Model and weights decrypted successfully.")
        else:
            print("Decrypted model already exists. Skipping decryption.")
    except Exception as e:
        print(f"Error during model decryption: {str(e)}")  # Debugging
        raise

@app.route('/get_decryption_key', methods=['POST'])
def get_decryption_key():
    try:
        print("Received decryption request")  # Debugging
        data = request.json
        encoded_key_payload = data.get('key')
        print(f"Key Payload: {encoded_key_payload}")  # Debugging

        # Validate the key and generate a response
        encryption_key = validate_encryption_key(encoded_key_payload)
        if encryption_key is None:
            return jsonify({'error': 'Invalid encryption key.'}), 400

        # Decrypt and prepare the model
        decrypt_and_prepare_model(encryption_key)

        # Track model decryption
        model_usage.insert_one({
            'action': 'decrypt',
            'timestamp': datetime.utcnow(),
            'expires_at': key_expiration_time
        })

        # Return success and the expiration time
        return jsonify({
            'expires_at': key_expiration_time.isoformat() + 'Z'
        })
    except Exception as e:
        print(f"Error during decryption: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

@app.route('/get_decrypted_model/<path:filename>', methods=['GET'])
def get_decrypted_model(filename):
    try:
        print(f"Serving file: {filename}")  # Debugging
        return send_from_directory(DECRYPTED_BIN_DIR if filename.endswith('.bin') else MODEL_DIR, filename)
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")  # Debugging
        return jsonify({'error': 'File not found', 'message': str(e)}), 404

@app.route('/')
def home():
    print("Serving index.html")  # Debugging
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/track', methods=['POST'])
def track_usage():
    try:
        data = request.json
        model_usage.insert_one({
            **data,
            'timestamp': datetime.utcnow()
        })
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    print("Starting Flask app")  # Debugging
    app.run(host='0.0.0.0', port=5004, debug=True) 