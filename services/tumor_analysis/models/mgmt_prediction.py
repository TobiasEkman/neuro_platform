import tensorflow as tf
import numpy as np

class MGMTPredictionModel:
    def __init__(self):
        self.model = tf.keras.models.load_model('models/mgmt_classifier.h5')
    
    def predict(self, mri_sequences):
        """Predict MGMT methylation status"""
        prediction = self.model.predict(np.expand_dims(mri_sequences, 0))[0][0]
        return {
            'mgmt_methylated': bool(prediction > 0.5),
            'confidence': float(prediction),
            'methylation_score': float(prediction)
        } 