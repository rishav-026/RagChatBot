import pytest
from app.rag.chunking.text_chunker import RecursiveTextChunker
from app.rag.ingestion.extractors import PageContent

def test_recursive_text_chunker_basic():
    chunker = RecursiveTextChunker(chunk_size_tokens=10, chunk_overlap_tokens=2, chars_per_token=4.0)
    # 10 tokens * 4 = 40 chars target chunk size
    sample_text = (
        "Paragraph 1 is here with some text. "
        "Paragraph 2 is right next to it with more text. "
        "Paragraph 3 concludes this test document."
    )
    pages = [PageContent(page_number=1, text=sample_text)]
    doc_metadata = {"filename": "test.pdf"}

    chunks = chunker.chunk_document(pages, doc_metadata)
    
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.page_number == 1
        assert "filename" in chunk.metadata
        assert chunk.metadata["filename"] == "test.pdf"
        assert len(chunk.content) > 0

def test_chunking_preserves_page_numbers():
    chunker = RecursiveTextChunker(chunk_size_tokens=100, chunk_overlap_tokens=10)
    pages = [
        PageContent(page_number=1, text="This is page one content."),
        PageContent(page_number=2, text="This is page two content.")
    ]
    chunks = chunker.chunk_document(pages, {"filename": "multi_page.pdf"})

    assert len(chunks) == 2
    assert chunks[0].page_number == 1
    assert chunks[1].page_number == 2
    assert chunks[0].chunk_index == 0
    assert chunks[1].chunk_index == 1
