import re
from typing import List
from pydantic import BaseModel

class ProcessedQuery(BaseModel):
    original_query: str
    normalized_query: str
    search_query: str
    expanded_terms: List[str] = []

# Domain Acronym Glossary for Retrieval Query Expansion
# Used for expand search terms without altering the original user prompt sent to LLM
DOMAIN_ACRONYMS = {
    "RCA": "Root Cause Analysis",
    "CAPA": "Corrective and Preventive Action",
    "QMS": "Quality Management System",
    "SOP": "Standard Operating Procedure",
    "GMP": "Good Manufacturing Practice",
    "OOS": "Out of Specification",
    "OOT": "Out of Trend",
    "QA": "Quality Assurance",
    "QC": "Quality Control",
    "SLA": "Service Level Agreement",
    "API": "Active Pharmaceutical Ingredient",
    "COA": "Certificate of Analysis",
    "LIMS": "Laboratory Information Management System",
    "RAG": "Retrieval Augmented Generation",
}

class QueryProcessor:
    """
    Normalizes user input and prepares clean, expanded queries for keyword/vector search
    while strictly preserving the original user question for final answer generation.
    """

    def process(self, raw_query: str) -> ProcessedQuery:
        if not raw_query:
            return ProcessedQuery(original_query="", normalized_query="", search_query="")

        # 1. Normalize spaces, line breaks, control chars
        clean = re.sub(r'[\r\n\t]+', ' ', raw_query).strip()
        clean = re.sub(r'\s+', ' ', clean)

        # 2. Extract words and check for domain acronyms
        words = re.findall(r'\b[A-Za-z0-9]+\b', clean)
        expanded_terms: List[str] = []

        for word in words:
            upper_w = word.upper()
            if upper_w in DOMAIN_ACRONYMS:
                expansion = DOMAIN_ACRONYMS[upper_w]
                if expansion.lower() not in clean.lower():
                    expanded_terms.append(expansion)

        # 3. Construct search query combining original clean query + acronym expansions
        if expanded_terms:
            search_query = f"{clean} {' '.join(expanded_terms)}"
        else:
            search_query = clean

        # Clean punctuation from search query for tokenized BM25 matching
        search_terms = re.sub(r'[^\w\s]', '', search_query).strip()

        return ProcessedQuery(
            original_query=raw_query.strip(),
            normalized_query=clean,
            search_query=search_terms if search_terms else clean,
            expanded_terms=expanded_terms
        )

