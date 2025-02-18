import os
import pydicom
from parsers.base_parser import BaseParser
import logging
import requests
from flask import current_app

logger = logging.getLogger(__name__)

# Add this constant at the top of the file
PATIENT_SERVICE_URL = 'http://localhost:5008/api'

class FolderParser(BaseParser):
    def __init__(self, db):
        super().__init__(db)
        self.progress_callback = None

    def set_progress_callback(self, callback):
        """Set callback for progress updates"""
        self.progress_callback = callback

    def parse(self, folder_path):
        """Parse all DICOM files in a folder recursively."""
        results = []
        total_files = 0
        processed_files = 0

        logger.info(f"Starting folder parse at: {folder_path}")

        try:
            # Count total files
            for root, _, files in os.walk(folder_path):
                total_files += len(files)

            logger.info(f"Found {total_files} total files to process")
            
            # Initial progress
            yield {
                'current': 0,
                'total': total_files,
                'percentage': 0,
                'file': ''
            }

            # Process files
            for root, _, files in os.walk(folder_path):
                for file in files:
                    try:
                        file_path = os.path.join(root, file)
                        processed_files += 1

                        try:
                            dataset = pydicom.dcmread(file_path, force=True)
                            if hasattr(dataset, 'SOPClassUID'):
                                result = self._process_dataset(dataset, file_path)
                                if result:
                                    results.append(result)
                                    logger.debug(f"Successfully processed: {file_path}")

                        except Exception as e:
                            logger.debug(f"Skipping non-DICOM file {file_path}: {str(e)}")
                            continue
                        finally:
                            if processed_files % 10 == 0:
                                yield {
                                    'current': processed_files,
                                    'total': total_files,
                                    'percentage': (processed_files / total_files) * 100,
                                    'file': file_path
                                }
                    except Exception as e:
                        logger.error(f"Error processing file {file}: {str(e)}")
                        continue

            # Save results and return final response
            studies = self._save_to_database(results)
            
            yield {
                'complete': True,
                'studies': studies,
                'total_processed': processed_files,
                'total_succeeded': len(results)
            }

        except Exception as e:
            logger.error(f"Error parsing folder: {str(e)}", exc_info=True)
            yield {'error': str(e)}

    def _get_tag_value(self, dataset, tag_name):
        """Safely get a DICOM tag value"""
        try:
            if tag_name is None:
                return None
            
            if hasattr(dataset, tag_name):
                value = getattr(dataset, tag_name)
                # Log the extracted value for debugging
                logger.debug(f"Extracted {tag_name}: {value}")
                
                # Convert to string if it's a PersonName
                if hasattr(value, 'family_name'):
                    return f"{value.family_name}, {value.given_name}"
                return str(value)
            
            logger.debug(f"Tag {tag_name} not found in dataset")
            return None
        except Exception as e:
            logger.debug(f"Error getting tag {tag_name}: {str(e)}")
            return None

    def _process_dataset(self, dataset, file_path):
        """Process a single DICOM dataset and extract relevant metadata"""
        try:
            # Extract patient metadata with fallbacks
            patient_id = self._get_tag_value(dataset, 'PatientID')
            patient_name = self._get_tag_value(dataset, 'PatientName')
            
            # Add debug logging for birth date extraction
            birth_date = self._get_tag_value(dataset, 'PatientBirthDate')
            logger.debug(f"Extracted birth date from DICOM: {birth_date} for patient {patient_id}")
            
            # Format the birth date
            formatted_birth_date = self._format_date(birth_date)
            logger.debug(f"Formatted birth date: {formatted_birth_date}")

            # Generate patient ID if missing
            if not patient_id:
                patient_id = f"PID_{hash(file_path) % 10000:04d}"
                logger.warning(f"Missing PatientID in {file_path}, generated: {patient_id}")

            # Extract and format study metadata
            study_uid = self._get_tag_value(dataset, 'StudyInstanceUID')
            study_date = self._format_date(self._get_tag_value(dataset, 'StudyDate'))
            study_desc = self._get_tag_value(dataset, 'StudyDescription')
            study_time = self._format_time(self._get_tag_value(dataset, 'StudyTime'))
            accession_number = self._get_tag_value(dataset, 'AccessionNumber')
            
            # Extract series metadata
            series_uid = self._get_tag_value(dataset, 'SeriesInstanceUID')
            series_number = self._get_tag_value(dataset, 'SeriesNumber')
            series_desc = self._get_tag_value(dataset, 'SeriesDescription')
            modality = self._get_tag_value(dataset, 'Modality')
            
            # Extract instance metadata
            sop_instance_uid = self._get_tag_value(dataset, 'SOPInstanceUID')
            instance_number = self._get_tag_value(dataset, 'InstanceNumber')
            
            # Validate required fields
            if not all([study_uid, series_uid, sop_instance_uid]):
                logger.error(f"Missing required UIDs in {file_path}")
                return None

            # Create patient document
            patient_doc = {
                'patient_id': patient_id,
                'name': patient_name or 'Unknown',
                'dob': formatted_birth_date,  # Store the formatted birth date
                'studies': []
            }

            # Log the created patient document
            logger.debug(f"Created patient document: {patient_doc}")

            # Create study document with better defaults
            study_doc = {
                'study_instance_uid': study_uid,
                'study_date': study_date,
                'study_time': study_time,
                'accession_number': accession_number,
                'description': study_desc or 'MRI Study',
                'series': [],
                'patient_id': patient_id,
                'modalities': set(),
                'num_series': 0,
                'num_instances': 0
            }

            # Create series document
            series_doc = {
                'series_uid': series_uid,
                'series_number': int(series_number) if series_number and series_number.isdigit() else 0,
                'description': series_desc or 'No Series Description',
                'modality': modality or 'Unknown',
                'instances': []
            }

            # Create instance document
            instance_doc = {
                'sop_instance_uid': sop_instance_uid,
                'instance_number': int(instance_number) if instance_number and instance_number.isdigit() else 0,
                'file_path': file_path
            }

            return {
                'patient': patient_doc,
                'study': study_doc,
                'series': series_doc,
                'instance': instance_doc
            }

        except Exception as e:
            logger.error(f"Error processing dataset: {str(e)}")
            return None

    def _format_date(self, date_str):
        """Format DICOM date string to ISO format"""
        if not date_str:
            return None
        try:
            # DICOM date format is YYYYMMDD
            if len(date_str) >= 8:
                year = date_str[:4]
                month = date_str[4:6]
                day = date_str[6:8]
                formatted_date = f"{year}-{month}-{day}"
                logger.debug(f"Formatted date {date_str} to {formatted_date}")
                return formatted_date
            else:
                logger.warning(f"Invalid date format: {date_str}")
                return None
        except Exception as e:
            logger.error(f"Error formatting date {date_str}: {e}")
            return None

    def _format_time(self, time_str):
        """Format DICOM time string to HH:MM:SS"""
        if not time_str:
            return None
        try:
            # DICOM time format is HHMMSS.FFFFFF
            hour = time_str[:2]
            minute = time_str[2:4]
            second = time_str[4:6]
            return f"{hour}:{minute}:{second}"
        except Exception:
            return None

    def _update_patient_service(self, patient_data):
        """Update patient information in patient management service"""
        try:
            response = requests.post(
                f"{PATIENT_SERVICE_URL}/patients",
                json=patient_data
            )
            response.raise_for_status()
            logger.info(f"Updated patient {patient_data['patient_id']} in patient service")
        except Exception as e:
            logger.error(f"Failed to update patient service: {e}")

    def _save_to_database(self, results):
        """Save parsed results to database"""
        try:
            # Group results by patient and study
            patients = {}
            studies = {}
            
            for result in results:
                if not result:
                    continue
                    
                patient = result['patient']
                study = result['study']
                series = result['series']
                instance = result['instance']
                
                # Skip if missing required fields
                if not study.get('study_instance_uid'):
                    logger.warning(f"Skipping study with missing study_instance_uid for patient {patient['patient_id']}")
                    continue
                
                # Update patient document
                if patient['patient_id'] not in patients:
                    patients[patient['patient_id']] = patient
                
                # Update study document
                if study['study_instance_uid'] not in studies:
                    studies[study['study_instance_uid']] = study
                    if study['study_instance_uid'] not in patients[patient['patient_id']]['studies']:
                        patients[patient['patient_id']]['studies'].append(study['study_instance_uid'])
                
                current_study = studies[study['study_instance_uid']]
                
                # Update study modalities
                if isinstance(current_study['modalities'], set):
                    current_study['modalities'].add(series['modality'])
                else:
                    current_study['modalities'] = {series['modality']}
                
                # Update series
                series_list = current_study['series']
                existing_series = next(
                    (s for s in series_list if s['series_uid'] == series['series_uid']), 
                    None
                )
                
                if not existing_series:
                    series_list.append(series)
                    existing_series = series
                    current_study['num_series'] = len(series_list)
                
                # Add instance to series if not already present
                instance_exists = any(
                    i['sop_instance_uid'] == instance['sop_instance_uid'] 
                    for i in existing_series['instances']
                )
                if not instance_exists:
                    existing_series['instances'].append(instance)
                    current_study['num_instances'] += 1

            # Convert sets to lists before saving
            for study in studies.values():
                study['modalities'] = list(study['modalities'])

            # Update database
            for patient in patients.values():
                try:
                    # Update patient management service
                    self._update_patient_service(patient)
                    
                    # Update local database
                    self.db.patients.update_one(
                        {'patient_id': patient['patient_id']},
                        {'$set': patient},
                        upsert=True
                    )
                except Exception as e:
                    logger.error(f"Error updating patient {patient['patient_id']}: {e}")
            
            for study in studies.values():
                try:
                    self.db.studies.update_one(
                        {'study_instance_uid': study['study_instance_uid']},
                        {'$set': study},
                        upsert=True
                    )
                except Exception as e:
                    logger.error(f"Error updating study {study['study_instance_uid']}: {e}")
                
            logger.info(f"Saved {len(patients)} patients and {len(studies)} studies to database")
            return list(studies.values())
            
        except Exception as e:
            logger.error(f"Error saving to database: {str(e)}")
            return [] 