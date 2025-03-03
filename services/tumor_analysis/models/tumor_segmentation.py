import tensorflow as tf
import numpy as np
from typing import Dict, Any
import torch
from brats_toolkit import (
    load_model, 
    preprocess_image, 
    fuse_segmentations,
    BraTSSegmentation
)

class TumorSegmentationModel:
    def __init__(self):
        # Initiera BraTS modeller
        self.models = {
            'nnunet': load_model('nnunet'),
            'hdglio': load_model('hdglio')
        }
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def preprocess_image(self, image_data: np.ndarray, mode: str = 'gpu') -> np.ndarray:
        """Förbehandla bilddata för segmentering"""
        return preprocess_image(
            image_data,
            mode=mode,
            device=self.device
        )
        
    def segment(self, image_data: np.ndarray, 
                model_names: list = ['nnunet', 'hdglio'],
                fusion_method: str = 'simple') -> np.ndarray:
        """Segmentera tumör med valda modeller och fusionsmetod"""
        
        # Preprocessa bilden
        preprocessed = self.preprocess_image(image_data)
        
        # Kör segmentering med varje vald modell
        segmentations = []
        for model_name in model_names:
            if model_name not in self.models:
                raise ValueError(f"Model {model_name} not found")
                
            model = self.models[model_name]
            seg = model.predict(preprocessed)
            segmentations.append(seg)
            
        # Fusionera segmenteringar om det finns flera
        if len(segmentations) > 1:
            final_seg = fuse_segmentations(
                segmentations,
                method=fusion_method
            )
        else:
            final_seg = segmentations[0]
            
        return final_seg

    def identify_critical_structures(self, image_data: np.ndarray, 
                                   tumor_mask: np.ndarray) -> Dict[str, Any]:
        """Identifiera kritiska strukturer nära tumören"""
        # Implementera atlas-baserad identifiering
        structures = {
            'location': self._determine_location(tumor_mask),
            'eloquent_areas': self._find_eloquent_areas(image_data, tumor_mask),
            'vessels': self._detect_vessels(image_data, tumor_mask)
        }
        return structures

    def calculate_approach_risks(self, tumor_mask: np.ndarray, 
                               structures: Dict[str, Any], 
                               approach: str) -> Dict[str, float]:
        """Beräkna risker för olika kirurgiska approacher"""
        risk_score = self._calculate_risk_score(tumor_mask, structures, approach)
        return {
            'resection_probability': risk_score
        }

    # Helper methods...
    def _determine_location(self, tumor_mask: np.ndarray) -> str:
        # Implementera lokaliseringslogik
        return "Right frontal lobe"

    def _find_eloquent_areas(self, image_data: np.ndarray, 
                            tumor_mask: np.ndarray) -> list:
        return ["Motor cortex", "Speech area"]

    def _detect_vessels(self, image_data: np.ndarray, 
                       tumor_mask: np.ndarray) -> list:
        return ["M3 branch of MCA"]

    def _calculate_risk_score(self, tumor_mask: np.ndarray,
                            structures: Dict[str, Any],
                            approach: str) -> float:
        return 0.85 