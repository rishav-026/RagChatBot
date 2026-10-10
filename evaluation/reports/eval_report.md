# Production RAG System Evaluation & Benchmark Report

**Execution Timestamp**: 2026-10-08 00:30:24
**Total Test Cases Evaluated**: 30

## 1. Retrieval Strategy Comparison

| Retrieval Pipeline | Hit Rate @ 5 | MRR | Precision @ 5 | Avg Latency |
| --- | --- | --- | --- | --- |
| **Vector-Only** | 73.3% | 0.650 | 0.420 | 45.2ms |
| **Hybrid (Vector+BM25)** | 86.7% | 0.810 | 0.580 | 68.5ms |
| **Hybrid + CrossEncoder Reranking** | 96.7% | 0.933 | 0.740 | 112.4ms |

## 2. Generation Quality & Groundedness Metrics

- **Faithfulness Score**: 94.5%
- **Answer Relevance Score**: 96.0%
- **Refusal Correctness (Out-of-Domain / No Context)**: 100.0%
