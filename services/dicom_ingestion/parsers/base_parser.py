from ..utils.mongo_utils import get_or_create_document
import pydicom

class BaseParser:
    def __init__(self, db):
        self.db = db
    
    def _get_or_create_patient(self, dataset):
        patient_data = {
            'patient_id': dataset.PatientID,
            'patient_name': str(dataset.PatientName),
            'patient_birth_date': dataset.get('PatientBirthDate', None),
            'patient_sex': dataset.get('PatientSex', None)
        }
        return get_or_create_document(
            self.db.patients,
            {'patient_id': dataset.PatientID},
            patient_data
        )

    def _get_or_create_study(self, dataset, patient_id):
        study_data = {
            'study_instance_uid': dataset.StudyInstanceUID,
            'patient_id': patient_id,
            'study_date': dataset.get('StudyDate', None),
            'study_time': dataset.get('StudyTime', None),
            'study_description': dataset.get('StudyDescription', None)
        }
        return get_or_create_document(
            self.db.studies,
            {'study_instance_uid': dataset.StudyInstanceUID},
            study_data
        )

    def _get_or_create_series(self, dataset, study_instance_uid):
        series_data = {
            'series_instance_uid': dataset.SeriesInstanceUID,
            'study_instance_uid': study_instance_uid,
            'series_number': dataset.get('SeriesNumber', None),
            'series_description': dataset.get('SeriesDescription', None),
            'modality': dataset.get('Modality', None)
        }
        return get_or_create_document(
            self.db.series,
            {'series_instance_uid': dataset.SeriesInstanceUID},
            series_data
        )

    def _get_or_create_instance(self, dataset, series_instance_uid, file_path):
        instance_data = {
            'sop_instance_uid': dataset.SOPInstanceUID,
            'series_instance_uid': series_instance_uid,
            'instance_number': dataset.get('InstanceNumber', None),
            'file_path': file_path
        }
        return get_or_create_document(
            self.db.instances,
            {'sop_instance_uid': dataset.SOPInstanceUID},
            instance_data
        ) 