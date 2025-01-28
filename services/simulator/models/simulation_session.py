from datetime import datetime
from typing import Dict, Any

class SimulationSession:
    def __init__(self):
        self.sessions = {}  # In-memory store, would be DB in production
        
    def create_session(self, user_id: str, scenario_type: str) -> Dict[str, Any]:
        session_id = f"sim_{datetime.now().timestamp()}"
        session = {
            'id': session_id,
            'userId': user_id,
            'scenarioType': scenario_type,
            'startTime': datetime.now().isoformat(),
            'status': 'active',
            'currentStep': 1,
            'metrics': {
                'score': 0,
                'timeElapsed': 0,
                'criticalDecisions': []
            }
        }
        self.sessions[session_id] = session
        return session 