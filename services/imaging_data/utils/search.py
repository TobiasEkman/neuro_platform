from fuzzywuzzy import fuzz
from typing import List, Dict, Any

def fuzzy_search(query: str, documents: List[Dict[str, Any]], fields: List[str], threshold: int = 60) -> List[Dict[str, Any]]:
    """
    Perform fuzzy search on documents.
    
    Args:
        query: Search query string
        documents: List of documents to search
        fields: List of fields to search in
        threshold: Minimum similarity score (0-100)
    
    Returns:
        List of matching documents with scores
    """
    results = []
    
    for doc in documents:
        max_score = 0
        for field in fields:
            if field in doc and doc[field]:
                # Get best score from token set ratio or partial ratio
                score = max(
                    fuzz.token_set_ratio(query.lower(), str(doc[field]).lower()),
                    fuzz.partial_ratio(query.lower(), str(doc[field]).lower())
                )
                max_score = max(max_score, score)
        
        if max_score >= threshold:
            results.append({
                'document': doc,
                'score': max_score
            })
    
    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return results 