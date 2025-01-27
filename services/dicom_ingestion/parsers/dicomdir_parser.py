import os
import pydicom
from .base_parser import BaseParser

class DicomdirParser(BaseParser):
    def parse(self, dicomdir_path):
        results = []
        dicomdir = pydicom.dcmread(dicomdir_path)
        base_path = os.path.dirname(dicomdir_path)

        for patient_record in dicomdir.patient_records:
            for study_record in patient_record.children:
                for series_record in study_record.children:
                    for instance_record in series_record.children:
                        file_path = os.path.join(base_path, instance_record.ReferencedFileID)
                        try:
                            dataset = pydicom.dcmread(file_path)
                            result = self._process_dataset(dataset, file_path)
                            if result:
                                results.append(result)
                        except Exception as e:
                            print(f"Error reading file {file_path}: {str(e)}")

        return results 