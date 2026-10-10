import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database.session import SessionLocal
from app.rag.query_processor import QueryProcessor
from app.rag.retrieval.service import RetrievalService
from app.rag.guardrails.retrieval_guardrail import RetrievalGuardrailService

def run_test_suite():
    db = SessionLocal()
    qp = QueryProcessor()
    retriever = RetrievalService()
    guardrail = RetrievalGuardrailService()

    queries = [
        "What is RCA?",
        "What is Root Cause Analysis?",
        "RCA",
        "Explain RCA.",
        "What is CAPA?",
        "What is RCA and CAPA?",
        "What is QMS?",
        "What is the population of Japan?"
    ]

    print("=========================================================================")
    print(f"{'QUERY':<35} | {'EXPANDED SEARCH QUERY':<40} | {'TOP SCORE':<9} | {'ALLOWED':<7} | {'CHUNKS':<6}")
    print("=========================================================================")

    for q in queries:
        processed = qp.process(q)
        chunks = retriever.retrieve(db=db, query=processed.search_query, initial_k=10, top_k=5)
        rg_result = guardrail.validate(chunks)

        top_score = round(rg_result.top_score, 4)
        allowed_str = "YES" if rg_result.allowed else "NO"
        chunks_ret = len(chunks) if rg_result.allowed else 0

        print(f"{q:<35} | {processed.search_query[:40]:<40} | {top_score:<9} | {allowed_str:<7} | {chunks_ret:<6}")

    db.close()

if __name__ == "__main__":
    run_test_suite()
