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