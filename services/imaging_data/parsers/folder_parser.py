import os
import pydicom
from parsers.base_parser import BaseParser
from parsers.dicomdir_parser import DicomdirParser

class FolderParser(BaseParser):
    def __init__(self, db):
        super().__init__(db)
        self.progress_callback = None
        self.dicomdir_parser = DicomdirParser(db)

    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback

    def parse(self, folder_path):
        results = []
        
        # First, look for DICOMDIR file
        dicomdir_path = os.path.join(folder_path, 'DICOMDIR')
        if os.path.exists(dicomdir_path):
            print(f"Found DICOMDIR at {dicomdir_path}")
            return self.dicomdir_parser.parse(dicomdir_path)

        # If no DICOMDIR, scan all files recursively
        for root, _, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    # Try to read as DICOM regardless of extension
                    dataset = pydicom.dcmread(file_path, force=True)
                    
                    # Verify it's actually a DICOM file by checking for mandatory elements
                    if hasattr(dataset, 'SOPClassUID'):
                        result = self._process_dataset(dataset, file_path)
                        if result:
                            results.append(result)
                            if self.progress_callback:
                                self.progress_callback(len(results), f"Processed {len(results)} files")
                except Exception as e:
                    print(f"Skipping non-DICOM file {file_path}: {str(e)}")
                    continue
        
        return results

    def _process_dataset(self, dataset, file_path):
        """Process a single DICOM dataset"""
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