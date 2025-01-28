from datetime import datetime
from temp.services.shared.db import get_db_client

class ModelRegistry:
    def __init__(self):
        self.db = get_db_client().neuro_platform
        
    def register_model(self, model_id, model_type, version):
        return self.db.models.insert_one({
            'model_id': model_id,
            'type': model_type,
            'version': version,
            'created_at': datetime.utcnow()
        }) 