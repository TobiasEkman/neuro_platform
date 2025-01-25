import tensorflow as tf
from tensorflow import keras
import time

class TumorClassifier:
    def __init__(self):
        self.model = self._build_model()
    
    def _build_model(self):
        inputs = keras.layers.Input(shape=(256, 256, 1))
        
        # Encoder
        x = keras.layers.Conv2D(32, 3, activation='relu', padding='same')(inputs)
        x = keras.layers.MaxPooling2D()(x)
        x = keras.layers.Conv2D(64, 3, activation='relu', padding='same')(x)
        x = keras.layers.MaxPooling2D()(x)
        x = keras.layers.Conv2D(128, 3, activation='relu', padding='same')(x)
        x = keras.layers.MaxPooling2D()(x)
        
        # Decoder
        x = keras.layers.Conv2DTranspose(128, 3, activation='relu', padding='same')(x)
        x = keras.layers.UpSampling2D()(x)
        x = keras.layers.Conv2DTranspose(64, 3, activation='relu', padding='same')(x)
        x = keras.layers.UpSampling2D()(x)
        x = keras.layers.Conv2DTranspose(32, 3, activation='relu', padding='same')(x)
        x = keras.layers.UpSampling2D()(x)
        
        # Output
        outputs = keras.layers.Conv2D(1, 1, activation='sigmoid')(x)
        
        return keras.Model(inputs, outputs)
    
    def train(self, images, labels, epochs=10, batch_size=32):
        self.model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.Dice()]
        )
        
        return self.model.fit(
            images,
            labels,
            batch_size=batch_size,
            epochs=epochs,
            validation_split=0.2
        )
    
    def save(self):
        model_path = f'models/tumor_classifier_{int(time.time())}.h5'
        self.model.save(model_path)
        return model_path 