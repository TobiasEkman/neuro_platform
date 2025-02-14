import numpy as np
from utils.dicom_config import DicomConfig
from parsers.base_parser import BaseParser

class MGMTPreprocessor(BaseParser):
    """Preprocesses MRI sequences specifically for MGMT prediction"""
    
    def __init__(self, db):
        super().__init__(db)
        self.required_sequences = ['T1', 'T1c', 'T2', 'FLAIR']
    
    def validate_sequences(self, study_uid):
        """Verify all required sequences exist"""
        series = self.db.series.find({
            'study_instance_uid': study_uid
        })
        
        found_sequences = set()
        for s in series:
            seq_type = self._identify_sequence_type(s)
            if seq_type in self.required_sequences:
                found_sequences.add(seq_type)
        
        return found_sequences == set(self.required_sequences)
    
    def _identify_sequence_type(self, series_doc):
        """Identify MRI sequence type from series description"""
        desc = series_doc.get('series_description', '').lower()
        
        if 't1' in desc:
            return 'T1c' if any(x in desc for x in ['gd', 'contrast']) else 'T1'
        elif 't2' in desc:
            return 'FLAIR' if 'flair' in desc else 'T2'
        return None
    
    def prepare_sequences(self, study_uid):
        """Prepare normalized sequences for MGMT prediction"""
        if not self.validate_sequences(study_uid):
            raise ValueError("Missing required sequences")
            
        sequences = []
        for seq_type in self.required_sequences:
            series = self._get_sequence_series(study_uid, seq_type)
            normalized = self._normalize_sequence(series)
            sequences.append(normalized)
            
        return np.stack(sequences, axis=-1)  # Stack as channels
    
    def _normalize_sequence(self, series):
        """Normalize a single MRI sequence"""
        try:
            # Load pixel data from DICOM files
            pixel_data = self._load_pixel_data(series)
            
            # Apply standard preprocessing steps
            normalized = (pixel_data - np.mean(pixel_data)) / np.std(pixel_data)
            
            # Resize to standard dimensions if needed
            if normalized.shape != (256, 256):
                normalized = self._resize_to_standard(normalized)
                
            return normalized
            
        except Exception as e:
            raise ValueError(f"Failed to normalize sequence: {str(e)}")
    
    def _load_pixel_data(self, series):
        """Load and combine pixel data from series"""
        instances = self.db.instances.find({
            'series_instance_uid': series['series_instance_uid']
        }).sort('instance_number', 1)
        
        # Load middle slice for 2D analysis
        total_instances = instances.count()
        middle_instance = instances[total_instances // 2]
        
        return self._read_pixel_data(middle_instance['file_path']) 