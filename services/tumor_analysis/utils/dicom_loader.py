import pydicom
import numpy as np
import requests
from typing import Dict, List, Optional
from pathlib import Path

class DicomLoader:
    def __init__(self):
        self.imaging_service_url = "http://imaging_data:5003/api"
        
    def load_dicom_series(self, series_id: str) -> np.ndarray:
        """
        Load DICOM series through the imaging service
        
        Args:
            series_id: Unique identifier for the DICOM series
            
        Returns:
            np.ndarray: Preprocessed image data ready for analysis
        """
        try:
            # Request preprocessed data from imaging service
            response = requests.get(
                f"{self.imaging_service_url}/preprocess/series/{series_id}"
            )
            if not response.ok:
                raise Exception("Failed to get preprocessed data from imaging service")
                
            # Get numpy array from response
            data = response.json()
            return np.array(data['pixel_data'])
            
        except Exception as e:
            raise Exception(f"Error loading DICOM series: {str(e)}")

    def get_series_metadata(self, series_id: str) -> Dict:
        """
        Get metadata for a series from the imaging service
        
        Args:
            series_id: Series identifier
            
        Returns:
            dict: Series metadata including patient info, acquisition params etc
        """
        response = requests.get(
            f"{self.imaging_service_url}/series/{series_id}/metadata"
        )
        if not response.ok:
            raise Exception("Failed to get series metadata")
            
        return response.json()

    def load_multisequence_data(self, study_id: str) -> List[np.ndarray]:
        """
        Ladda alla relevanta MRI-sekvenser för MGMT-prediktion
        
        Args:
            study_id: Study identifier
            
        Returns:
            List[np.ndarray]: Lista med preprocessade sekvenser [T1, T1c, T2, FLAIR]
        """
        try:
            # Hämta alla serier för studien
            response = requests.get(
                f"{self.imaging_service_url}/study/{study_id}/series"
            )
            if not response.ok:
                raise Exception("Failed to get study series")
            
            series_list = response.json()
            
            # Identifiera och ladda varje sekvenstyp
            sequences = []
            required_types = ['T1', 'T1C', 'T2', 'FLAIR']
            
            for seq_type in required_types:
                series = self._find_sequence_series(series_list, seq_type)
                if not series:
                    raise Exception(f"Missing required sequence: {seq_type}")
                
                # Ladda och preprocessa sekvensen
                preprocessed = self.load_dicom_series(series['series_id'])
                sequences.append(preprocessed)
            
            return sequences
            
        except Exception as e:
            raise Exception(f"Error loading multisequence data: {str(e)}")

    def _find_sequence_series(self, series_list: List[Dict], seq_type: str) -> Optional[Dict]:
        """Hitta serie som matchar önskad sekvenstyp"""
        for series in series_list:
            if self._match_sequence_type(series['description'], seq_type):
                return series
        return None

    def _match_sequence_type(self, description: str, seq_type: str) -> bool:
        """Matcha seriesbeskrivning mot sekvenstyp"""
        description = description.lower()
        if seq_type == 'T1C':
            return 't1' in description and any(x in description for x in ['gd', 'contrast'])
        elif seq_type == 'FLAIR':
            return 'flair' in description
        else:
            return seq_type.lower() in description

# Create singleton instance
dicom_loader = DicomLoader()

def load_dicom_series(series_id: str) -> np.ndarray:
    """
    Convenience function to load DICOM series
    
    Args:
        series_id: Series identifier
        
    Returns:
        np.ndarray: Preprocessed image data
    """
    return dicom_loader.load_dicom_series(series_id) 