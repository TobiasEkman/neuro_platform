import os
import pydicom
from parsers.base_parser import BaseParser

class FolderParser(BaseParser):
    def __init__(self, db):
        super().__init__(db)
        self.progress_callback = None

    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback

    def parse(self, folder_path):
        results = []
        
        # Count total files first
        total_files = sum(1 for root, _, files in os.walk(folder_path) 
                         for f in files if f.lower().endswith('.dcm'))
        processed = 0
        
        for root, _, files in os.walk(folder_path):
            for file in files:
                if file.lower().endswith('.dcm'):
                    file_path = os.path.join(root, file)
                    try:
                        dataset = pydicom.dcmread(file_path)
                        result = self._process_dataset(dataset, file_path)
                        if result:
                            results.append(result)
                    except Exception as e:
                        print(f"Error reading file {file_path}: {str(e)}")
                    
                    processed += 1
                    if self.progress_callback:
                        progress = int((processed / total_files) * 100)
                        self.progress_callback(progress, f"Processing file {processed}/{total_files}")
        
        return results

    def _process_dataset(self, dataset, file_path):
        try:
            # Create or get patient
            patient, _ = self._get_or_create_patient(dataset)
            
            # Create or get study
            study, _ = self._get_or_create_study(dataset, patient['patient_id'])
            
            # Create or get series
            series, _ = self._get_or_create_series(dataset, study['study_instance_uid'])
            
            # Create or get instance
            instance, _ = self._get_or_create_instance(
                dataset, 
                series['series_instance_uid'],
                file_path
            )
            
            return {
                'patient_id': patient['patient_id'],
                'study_instance_uid': study['study_instance_uid'],
                'series_instance_uid': series['series_instance_uid'],
                'sop_instance_uid': instance['sop_instance_uid']
            }
        except Exception as e:
            print(f"Error processing dataset: {str(e)}")
            return None 