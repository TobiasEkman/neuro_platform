from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class DicomTagConfig:
    name: str
    tag: str
    description: str
    required: bool = False
    default: str = ''

class DicomConfig:
    DEFAULT_TAGS = {
        'patient': {
            'id': DicomTagConfig('PatientID', '0010,0020', 'Patient ID', True),
            'name': DicomTagConfig('PatientName', '0010,0010', 'Patient Name'),
            'birth_date': DicomTagConfig('PatientBirthDate', '0010,0030', 'Birth Date'),
            'sex': DicomTagConfig('PatientSex', '0010,0040', 'Patient Sex'),
            'weight': DicomTagConfig('PatientWeight', '0010,1030', 'Weight'),
            'age': DicomTagConfig('PatientAge', '0010,1010', 'Age'),
        },
        'study': {
            'uid': DicomTagConfig('StudyInstanceUID', '0020,000D', 'Study Instance UID', True),
            'date': DicomTagConfig('StudyDate', '0008,0020', 'Study Date'),
            'time': DicomTagConfig('StudyTime', '0008,0030', 'Study Time'),
            'description': DicomTagConfig('StudyDescription', '0008,1030', 'Study Description'),
        },
        'series': {
            'uid': DicomTagConfig('SeriesInstanceUID', '0020,000E', 'Series Instance UID', True),
            'number': DicomTagConfig('SeriesNumber', '0020,0011', 'Series Number'),
            'description': DicomTagConfig('SeriesDescription', '0008,103E', 'Series Description'),
            'modality': DicomTagConfig('Modality', '0008,0060', 'Modality'),
            'body_part': DicomTagConfig('BodyPartExamined', '0018,0015', 'Body Part'),
            'protocol_name': DicomTagConfig('ProtocolName', '0018,1030', 'Protocol Name'),
        },
        'instance': {
            'uid': DicomTagConfig('SOPInstanceUID', '0008,0018', 'SOP Instance UID', True),
            'number': DicomTagConfig('InstanceNumber', '0020,0013', 'Instance Number', True),
            'position': DicomTagConfig('SliceLocation', '0020,1041', 'Slice Location'),
            'thickness': DicomTagConfig('SliceThickness', '0018,0050', 'Slice Thickness'),
            'rows': DicomTagConfig('Rows', '0028,0010', 'Rows'),
            'columns': DicomTagConfig('Columns', '0028,0011', 'Columns'),
            'pixel_spacing': DicomTagConfig('PixelSpacing', '0028,0030', 'Pixel Spacing'),
        }
    }

    def __init__(self, custom_config: Optional[Dict] = None):
        self.config = self.DEFAULT_TAGS.copy()
        if custom_config:
            self._update_config(custom_config)

    def _update_config(self, custom_config: Dict):
        for level, tags in custom_config.items():
            if level in self.config:
                self.config[level].update(tags)

    def get_tag(self, level: str, tag_name: str) -> DicomTagConfig:
        return self.config[level].get(tag_name)

    def get_required_tags(self, level: str) -> List[DicomTagConfig]:
        return [tag for tag in self.config[level].values() if tag.required] 