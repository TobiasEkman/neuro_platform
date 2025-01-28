import os
from collections import defaultdict
from ..preprocessors.mgmt_preprocessor import MGMTPreprocessor

class DatasetAnalyzer:
    def __init__(self, db):
        self.db = db
        self.mgmt_preprocessor = MGMTPreprocessor(db)
    
    def analyze_dataset(self):
        """Analyze entire dataset structure and composition"""
        stats = defaultdict(int)
        sequence_stats = defaultdict(int)
        
        # Analyze all studies
        studies = self.db.studies.find()
        for study in studies:
            stats['total_studies'] += 1
            
            # Check sequence availability
            if self.mgmt_preprocessor.validate_sequences(study['study_instance_uid']):
                stats['complete_studies'] += 1
            
            # Count sequence types
            series = self.db.series.find({'study_instance_uid': study['study_instance_uid']})
            for s in series:
                seq_type = self.mgmt_preprocessor._identify_sequence_type(s)
                if seq_type:
                    sequence_stats[seq_type] += 1
        
        return {
            'dataset_statistics': dict(stats),
            'sequence_counts': dict(sequence_stats)
        }
    
    def generate_report(self, output_file=None):
        """Generate detailed analysis report"""
        analysis = self.analyze_dataset()
        
        report = [
            "Dataset Analysis Report",
            "=====================\n",
            f"Total Studies: {analysis['dataset_statistics']['total_studies']}",
            f"Complete Studies (all sequences): {analysis['dataset_statistics']['complete_studies']}",
            "\nSequence Distribution:",
        ]
        
        for seq_type, count in analysis['sequence_counts'].items():
            report.append(f"- {seq_type}: {count}")
        
        report_text = '\n'.join(report)
        if output_file:
            with open(output_file, 'w') as f:
                f.write(report_text)
        
        return report_text 