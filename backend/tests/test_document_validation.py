import pytest
from app.rag.ingestion.extractors import (
    DocumentExtractorFactory,
    UnsupportedFileTypeError,
    EmptyDocumentError
)

def test_unsupported_file_type():
    with pytest.raises(UnsupportedFileTypeError):
        DocumentExtractorFactory.extract(b"some content", "file.xlsx")

def test_txt_extractor_success():
    content = b"Hello world! This is a simple test document."
    extracted = DocumentExtractorFactory.extract(content, "sample.txt")
    assert extracted.file_type == "txt"
    assert extracted.full_text == "Hello world! This is a simple test document."
    assert len(extracted.pages) == 1
    assert extracted.pages[0].page_number == 1

def test_empty_txt_document():
    content = b"   \n\n  \t  "
    with pytest.raises(EmptyDocumentError):
        DocumentExtractorFactory.extract(content, "empty.txt")
