import os
import pydicom
from .base_parser import BaseParser

class FolderParser(BaseParser):
    def parse(self, folder_path):
        results = []
        
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