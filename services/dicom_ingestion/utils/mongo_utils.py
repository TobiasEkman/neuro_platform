from pymongo import ASCENDING, IndexModel

def init_mongo_indexes(db):
    # Create indexes for patients collection
    db.patients.create_indexes([
        IndexModel([("patient_id", ASCENDING)], unique=True),
        IndexModel([("patient_name", ASCENDING)])
    ])

    # Create indexes for studies collection
    db.studies.create_indexes([
        IndexModel([("study_instance_uid", ASCENDING)], unique=True),
        IndexModel([("patient_id", ASCENDING)])
    ])

    # Create indexes for series collection
    db.series.create_indexes([
        IndexModel([("series_instance_uid", ASCENDING)], unique=True),
        IndexModel([("study_instance_uid", ASCENDING)])
    ])

    # Create indexes for instances collection
    db.instances.create_indexes([
        IndexModel([("sop_instance_uid", ASCENDING)], unique=True),
        IndexModel([("series_instance_uid", ASCENDING)])
    ])

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