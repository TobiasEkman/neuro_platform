import argparse
from pathlib import Path
import os
from pymongo import MongoClient
from parsers.folder_parser import FolderParser
from parsers.dicomdir_parser import DicomdirParser
from utils.mongo_utils import init_mongo_indexes
from utils.dataset_analyzer import DatasetAnalyzer

def main():
    parser = argparse.ArgumentParser(description='Process DICOM files and populate MongoDB database')
    parser.add_argument('path', help='Path to either a DICOMDIR file, a single patient folder, or a root folder containing multiple patients')
    parser.add_argument('--mongo-uri', default='mongodb://mongodb:27017', help='MongoDB connection URI')
    parser.add_argument('--db-name', default='neuro_platform', help='MongoDB database name')
    parser.add_argument('--analyze', action='store_true', help='Analyze dataset structure')
    parser.add_argument('--report', type=str, help='Output path for analysis report')
    args = parser.parse_args()

    # Initialize MongoDB connection
    client = MongoClient(args.mongo_uri)
    db = client[args.db_name]

    # Initialize indexes
    init_mongo_indexes(db)

    path = Path(args.path)
    if path.is_file() and path.name.upper() == 'DICOMDIR':
        print(f"Processing single DICOMDIR file: {path}")
        parser = DicomdirParser(db)
        parser.parse(path)
    else:
        print(f"Processing directory: {path}")
        parser = FolderParser(db)
        parser.parse(path)

    if args.analyze:
        analyzer = DatasetAnalyzer(db)
        if args.report:
            analyzer.generate_report(args.report)
        else:
            print(analyzer.generate_report())

    print("Database population complete!")

if __name__ == "__main__":
    main() 