import tensorflow as tf
from tensorflow import keras

class MGMTClassifier:
    def __init__(self):
        self.model = self._build_model()
    
    def _build_model(self):
        # Model architecture for MGMT status prediction
        model = keras.Sequential([
            keras.layers.Input(shape=(256, 256, 4)),  # 4 channels for T1, T1c, T2, FLAIR
            keras.layers.Conv2D(32, 3, activation='relu'),
            keras.layers.MaxPooling2D(),
            keras.layers.Conv2D(64, 3, activation='relu'),
            keras.layers.MaxPooling2D(),
            keras.layers.Conv2D(64, 3, activation='relu'),
            keras.layers.Flatten(),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', 'AUC']
        )
        return model
    
    def train(self, mri_sequences, mgmt_status, validation_split=0.2):
        return self.model.fit(
            mri_sequences,
            mgmt_status,
            validation_split=validation_split,
            epochs=50,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=5),
                keras.callbacks.ModelCheckpoint('best_mgmt_model.h5')
            ]
        ) 