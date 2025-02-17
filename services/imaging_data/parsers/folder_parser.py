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
            # Get basic patient info
            patient_data = {
                'patient_id': self._get_tag_value(dataset, self.config.get_tag('patient', 'id')),
                'images': [{
                    'type': dataset.Modality,
                    'date': self._get_tag_value(dataset, self.config.get_tag('study', 'date')),
                    'dicomPath': file_path,
                    'sequences': [{
                        'name': self._get_tag_value(dataset, self.config.get_tag('series', 'description')),
                        'parameters': {
                            'seriesNumber': self._get_tag_value(dataset, self.config.get_tag('series', 'number'))
                        }
                    }]
                }]
            }

            # Get detailed DICOM metadata
            dicom_metadata = {
                'study_instance_uid': self._get_tag_value(dataset, self.config.get_tag('study', 'uid')),
                'series_instance_uid': self._get_tag_value(dataset, self.config.get_tag('series', 'uid')),
                'modality': dataset.Modality,
                'study_date': self._get_tag_value(dataset, self.config.get_tag('study', 'date')),
                'series_description': self._get_tag_value(dataset, self.config.get_tag('series', 'description')),
                'filePath': file_path,
                'metadata': {
                    # Store additional DICOM tags here
                    'protocol': self._get_tag_value(dataset, self.config.get_tag('series', 'protocol_name')),
                    'bodyPart': self._get_tag_value(dataset, self.config.get_tag('series', 'body_part'))
                }
            }

            return {
                'patient': patient_data,
                'dicom': dicom_metadata
            }
        except Exception as e:
            print(f"Error processing dataset: {str(e)}")
            return None 