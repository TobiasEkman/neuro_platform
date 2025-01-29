import os
import pydicom
from parsers.base_parser import BaseParser

class DicomdirParser(BaseParser):
    def parse(self, dicomdir_path):
        results = []
        try:
            dicomdir = pydicom.dcmread(dicomdir_path)
            base_path = os.path.dirname(dicomdir_path)

            # Process each patient record
            for patient_record in dicomdir.patient_records:
                patient_id = str(getattr(patient_record, 'PatientID', ''))
                
                # Process each study under the patient
                for study_record in patient_record.children:
                    study_uid = str(getattr(study_record, 'StudyInstanceUID', ''))
                    
                    # Process each series under the study
                    for series_record in study_record.children:
                        series_uid = str(getattr(series_record, 'SeriesInstanceUID', ''))
                        
                        # Process each instance (slice) under the series
                        for instance_record in series_record.children:
                            try:
                                # Build file path from ReferencedFileID components
                                file_components = [str(x) for x in instance_record.ReferencedFileID]
                                file_path = os.path.join(base_path, *file_components)
                                
                                # Read and process the DICOM file
                                dataset = pydicom.dcmread(file_path)
                                result = self._process_dataset(dataset, file_path)
                                if result:
                                    results.append(result)
                                    
                            except Exception as e:
                                print(f"Error processing instance in DICOMDIR: {str(e)}")
                                continue
                                
        except Exception as e:
            print(f"Error parsing DICOMDIR {dicomdir_path}: {str(e)}")
            raise
            
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