from pymongo import MongoClient

def get_db_client():
    return MongoClient('mongodb://mongodb:27017/') 