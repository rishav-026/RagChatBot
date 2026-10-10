from typing import List, Dict, Any

def compute_retrieval_metrics(retrieved_sources: List[str], expected_source: str) -> Dict[str, float]:
    """
    Computes precision, recall, hit rate, and MRR for retrieved source documents.
    """
    if not expected_source:
        # Out of domain query: hit rate = 1 if empty or low relevance
        return {
            "hit_rate": 1.0 if not retrieved_sources else 0.0,
            "precision": 1.0,
            "recall": 1.0,
            "mrr": 1.0
        }

    hits = [1 if src == expected_source else 0 for src in retrieved_sources]
    hit_rate = 1.0 if any(hits) else 0.0
    precision = sum(hits) / max(1, len(retrieved_sources))
    recall = 1.0 if hit_rate > 0 else 0.0

    # Mean Reciprocal Rank (MRR)
    mrr = 0.0
    for idx, hit in enumerate(hits, start=1):
        if hit == 1:
            mrr = 1.0 / idx
            break

    return {
        "hit_rate": round(hit_rate, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "mrr": round(mrr, 4)
    }
