from ..utils.mongo_utils import get_or_create_document
from ..utils.dicom_config import DicomConfig
import pydicom

class BaseParser:
    def __init__(self, db):
        self.db = db
        self.config = DicomConfig()
    
    def _get_tag_value(self, dataset, tag_config):
        """Get DICOM tag value with proper error handling"""
        try:
            if hasattr(dataset, tag_config.name):
                value = getattr(dataset, tag_config.name)
                if value is not None:
                    # Handle special DICOM value types
                    if hasattr(value, 'original_string'):
                        return value.original_string
                    return str(value)
            return tag_config.default
        except Exception as e:
            print(f"Error getting tag {tag_config.name}: {str(e)}")
            return tag_config.default

    def _get_or_create_patient(self, dataset):
        """Create or update patient document"""
        patient_data = {
            'patient_id': self._get_tag_value(dataset, self.config.get_tag('patient', 'id')),
            'patient_name': self._get_tag_value(dataset, self.config.get_tag('patient', 'name')),
            'birth_date': self._get_tag_value(dataset, self.config.get_tag('patient', 'birth_date')),
            'sex': self._get_tag_value(dataset, self.config.get_tag('patient', 'sex')),
            'weight': self._get_tag_value(dataset, self.config.get_tag('patient', 'weight')),
            'age': self._get_tag_value(dataset, self.config.get_tag('patient', 'age'))
        }
        
        # Validate required fields
        required_tags = self.config.get_required_tags('patient')
        for tag in required_tags:
            if not patient_data[tag.name.lower()]:
                raise ValueError(f"Required patient tag {tag.name} is missing")
        
        return get_or_create_document(
            self.db.patients,
            {'patient_id': patient_data['patient_id']},
            patient_data
        )

    def _get_or_create_study(self, dataset, patient_id):
        """Create or update study document"""
        study_data = {
            'study_instance_uid': self._get_tag_value(dataset, self.config.get_tag('study', 'uid')),
            'patient_id': patient_id,
            'study_date': self._get_tag_value(dataset, self.config.get_tag('study', 'date')),
            'study_time': self._get_tag_value(dataset, self.config.get_tag('study', 'time')),
            'study_description': self._get_tag_value(dataset, self.config.get_tag('study', 'description'))
        }
        
        # Validate required fields
        required_tags = self.config.get_required_tags('study')
        for tag in required_tags:
            if not study_data[tag.name.lower()]:
                raise ValueError(f"Required study tag {tag.name} is missing")
        
        return get_or_create_document(
            self.db.studies,
            {'study_instance_uid': study_data['study_instance_uid']},
            study_data
        )

    def _get_or_create_series(self, dataset, study_instance_uid):
        """Create or update series document"""
        series_data = {
            'series_instance_uid': self._get_tag_value(dataset, self.config.get_tag('series', 'uid')),
            'study_instance_uid': study_instance_uid,
            'series_number': self._get_tag_value(dataset, self.config.get_tag('series', 'number')),
            'series_description': self._get_tag_value(dataset, self.config.get_tag('series', 'description')),
            'modality': self._get_tag_value(dataset, self.config.get_tag('series', 'modality')),
            'body_part': self._get_tag_value(dataset, self.config.get_tag('series', 'body_part')),
            'protocol_name': self._get_tag_value(dataset, self.config.get_tag('series', 'protocol_name'))
        }
        
        # Validate required fields
        required_tags = self.config.get_required_tags('series')
        for tag in required_tags:
            if not series_data[tag.name.lower()]:
                raise ValueError(f"Required series tag {tag.name} is missing")
        
        return get_or_create_document(
            self.db.series,
            {'series_instance_uid': series_data['series_instance_uid']},
            series_data
        )

    def _get_or_create_instance(self, dataset, series_instance_uid, file_path):
        """Create or update instance document"""
        instance_data = {
            'sop_instance_uid': self._get_tag_value(dataset, self.config.get_tag('instance', 'uid')),
            'series_instance_uid': series_instance_uid,
            'instance_number': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'number')) or 0),
            'file_path': file_path,
            'position': float(self._get_tag_value(dataset, self.config.get_tag('instance', 'position')) or 0),
            'thickness': float(self._get_tag_value(dataset, self.config.get_tag('instance', 'thickness')) or 0),
            'rows': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'rows')) or 0),
            'columns': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'columns')) or 0),
            'pixel_spacing': self._get_tag_value(dataset, self.config.get_tag('instance', 'pixel_spacing'))
        }
        
        # Validate required fields
        required_tags = self.config.get_required_tags('instance')
        for tag in required_tags:
            if not instance_data[tag.name.lower()]:
                raise ValueError(f"Required instance tag {tag.name} is missing")
        
        return get_or_create_document(
            self.db.instances,
            {'sop_instance_uid': instance_data['sop_instance_uid']},
            instance_data
        ) 