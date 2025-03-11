import os
import logging
from utils.dicom_config import DicomConfig
from utils.mongo_utils import get_or_create_document

logger = logging.getLogger(__name__)

class BaseParser:
    def __init__(self, db):
        self.db = db
        self.config = DicomConfig()
    
    def _get_tag_value(self, dataset, tag_config):
        """Get DICOM tag value with proper error handling"""
        try:
            # First try direct attribute access
            if hasattr(dataset, tag_config.name):
                value = getattr(dataset, tag_config.name)
                if value is not None:
                    # Handle special DICOM value types
                    if hasattr(value, 'original_string'):
                        return value.original_string
                    return str(value)
                
            # If that fails, try the tag directly
            if tag_config.tag in dataset:
                return str(dataset[tag_config.tag].value)
            
            return None
        except Exception as e:
            logger.error(f"Error getting tag {tag_config.name}: {str(e)}")
            return None

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
        
        logger.debug(f"[_get_or_create_patient] Creating/updating patient with data: {patient_data}")
        
        # Validate required fields
        required_tags = self.config.get_required_tags('patient')
        for tag in required_tags:
            if not patient_data[tag.name.lower()]:
                raise ValueError(f"Required patient tag {tag.name} is missing")
        
        patient_doc = get_or_create_document(
            self.db.patients,
            {'patient_id': patient_data['patient_id']},
            patient_data
        )
        logger.debug(f"[_get_or_create_patient] Patient document returned: {patient_doc}")
        return patient_doc

    def _get_or_create_study(self, dataset, patient_id):
        """Create or update study document"""
        study_data = {
            'study_instance_uid': self._get_tag_value(dataset, self.config.get_tag('study', 'uid')),
            'patient_id': patient_id,
            'study_date': self._get_tag_value(dataset, self.config.get_tag('study', 'date')),
            'study_time': self._get_tag_value(dataset, self.config.get_tag('study', 'time')),
            'study_description': self._get_tag_value(dataset, self.config.get_tag('study', 'description'))
        }

        logger.debug(f"[_get_or_create_study] Creating/updating study with data: {study_data}")

        # Validate required fields
        required_tags = self.config.get_required_tags('study')
        for tag in required_tags:
            if not study_data[tag.name.lower()]:
                raise ValueError(f"Required study tag {tag.name} is missing")

        study_doc = get_or_create_document(
            self.db.studies,
            {'study_instance_uid': study_data['study_instance_uid']},
            study_data
        )
        logger.debug(f"[_get_or_create_study] Study document returned: {study_doc}")
        return study_doc

    def _get_or_create_series(self, dataset, study_instance_uid):
        """Create or update series document"""
        series_data = {
            'series_uid': self._get_tag_value(dataset, self.config.get_tag('series', 'uid')),
            'study_instance_uid': study_instance_uid,
            'series_number': self._get_tag_value(dataset, self.config.get_tag('series', 'number')),
            'series_description': self._get_tag_value(dataset, self.config.get_tag('series', 'description')),
            'modality': self._get_tag_value(dataset, self.config.get_tag('series', 'modality')),
            'body_part': self._get_tag_value(dataset, self.config.get_tag('series', 'body_part')),
            'protocol_name': self._get_tag_value(dataset, self.config.get_tag('series', 'protocol_name'))
        }

        logger.debug(f"[_get_or_create_series] Creating/updating series with data: {series_data}")

        # Validate required fields
        required_tags = self.config.get_required_tags('series')
        for tag in required_tags:
            if not series_data[tag.name.lower()]:
                raise ValueError(f"Required series tag {tag.name} is missing")

        series_doc = get_or_create_document(
            self.db.series,
            {'series_uid': series_data['series_uid']},
            series_data
        )
        logger.debug(f"[_get_or_create_series] Series document returned: {series_doc}")
        return series_doc

    def _get_relative_path(self, full_path: str) -> str:
        """Convert absolute path to relative path from DICOM_BASE_DIR"""
        base_dir = os.environ.get('DICOM_BASE_DIR', '/data/dicom')
        try:
            # Normalize paths for comparison
            full_path = os.path.normpath(full_path)
            base_dir = os.path.normpath(base_dir)
            
            # If it's a Windows path, handle it
            if '\\' in full_path:
                # Remove drive letter if present
                if ':' in full_path:
                    full_path = full_path.split(':', 1)[1]
                full_path = full_path.replace('\\', '/')
            
            # Remove base directory prefix
            if full_path.startswith(base_dir):
                return full_path[len(base_dir):].lstrip('/')
            
            # If path doesn't start with base_dir, assume it's already relative
            return full_path.lstrip('/')
        except Exception as e:
            logger.error(f"Error converting path {full_path}: {str(e)}")
            return full_path

    def _get_or_create_instance(self, dataset, series_uid, file_path):
        """Create or update instance document with both paths"""
        try:
            # Store both absolute and relative paths
            absolute_path = os.path.abspath(file_path)
            relative_path = os.path.relpath(
                absolute_path, 
                os.environ.get('DICOM_BASE_DIR', '/data/dicom')
            )

            instance_data = {
                'sop_instance_uid': self._get_tag_value(dataset, self.config.get_tag('instance', 'uid')),
                'series_uid': series_uid,
                'instance_number': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'number')) or 0),
                'file_path': absolute_path,  # Store absolute path
                'relative_path': relative_path,  # Store relative path
                'rows': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'rows')) or 0),
                'columns': int(self._get_tag_value(dataset, self.config.get_tag('instance', 'columns')) or 0),
                'pixel_spacing': self._get_tag_value(dataset, self.config.get_tag('instance', 'pixel_spacing'))
            }

            return get_or_create_document(
                self.db.instances,
                {'sop_instance_uid': instance_data['sop_instance_uid']},
                instance_data
            )
        except Exception as e:
            logger.error(f"Error creating instance document: {str(e)}")
            raise 