from typing import List, Dict, Any, Optional

def compute_generation_metrics(
    actual_answer: str,
    expected_answer: str,
    expected_keywords: List[str],
    is_refusal_expected: bool = False
) -> Dict[str, float]:
    """
    Computes faithfulness, answer relevance, keyword match score, and refusal correctness.
    """
    if is_refusal_expected:
        refusal_phrases = ["couldn't find enough", "insufficient information", "not found", "cannot answer"]
        correct_refusal = any(p in actual_answer.lower() for p in refusal_phrases)
        return {
            "faithfulness": 1.0 if correct_refusal else 0.0,
            "answer_relevance": 1.0 if correct_refusal else 0.0,
            "keyword_match_score": 1.0 if correct_refusal else 0.0,
            "refusal_correctness": 1.0 if correct_refusal else 0.0
        }

    # Keyword match calculation
    matched_kw = sum(1 for kw in expected_keywords if kw.lower() in actual_answer.lower())
    keyword_score = matched_kw / max(1, len(expected_keywords))

    # General relevance score based on keyword match & length
    relevance_score = min(1.0, keyword_score + (0.2 if len(actual_answer) > 10 else 0.0))

    return {
        "faithfulness": round(keyword_score, 4),
        "answer_relevance": round(relevance_score, 4),
        "keyword_match_score": round(keyword_score, 4),
        "refusal_correctness": 1.0
    }
