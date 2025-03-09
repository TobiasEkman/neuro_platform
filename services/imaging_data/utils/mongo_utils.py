import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_mongo_indexes(db):
    """Initialize required MongoDB indexes"""
    try:
        # Patient collection indexes
        db.patients.create_index('patient_id', unique=True)
        
        # Studies collection indexes
        db.studies.create_index('study_instance_uid', unique=True)
        db.studies.create_index('patient_id')
        
        # Create compound index for series
        db.studies.create_index([
            ('series.series_uid', 1),
            ('study_instance_uid', 1)
        ])
        
        logger.info("MongoDB indexes initialized successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

def get_or_create_document(collection, query, data):
    """
    Get an existing document or create it if it doesn't exist.
    Returns (document, created) tuple.
    """
    document = collection.find_one(query)
    if document:
        return document, False
    
    result = collection.insert_one(data)
    return collection.find_one({'_id': result.inserted_id}), True 