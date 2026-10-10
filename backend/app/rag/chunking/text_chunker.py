from typing import List, Dict, Any, Optional
from app.rag.ingestion.extractors import PageContent
from app.rag.chunking.base import BaseChunker, DocumentChunk

class RecursiveTextChunker(BaseChunker):
    """
    Splits text recursively using primary separators (\\n\\n, \\n, . , space)
    to respect sentence and paragraph boundaries while adhering to target token limits.
    """

    def __init__(
        self,
        chunk_size_tokens: int = 500,
        chunk_overlap_tokens: int = 50,
        chars_per_token: float = 4.0
    ):
        self.chunk_size = int(chunk_size_tokens * chars_per_token)  # Target length in chars (~2000 chars)
        self.chunk_overlap = int(chunk_overlap_tokens * chars_per_token)  # Overlap in chars (~200 chars)
        self.separators = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]

    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text using hierarchy of separators."""
        if not text:
            return []
        
        if len(text) <= self.chunk_size:
            return [text]

        if not separators:
            # Hard character cut if no separators remain
            chunks = []
            start = 0
            while start < len(text):
                end = start + self.chunk_size
                chunks.append(text[start:end])
                start += self.chunk_size - self.chunk_overlap
            return chunks

        sep = separators[0]
        remaining_seps = separators[1:]
        splits = text.split(sep)

        result_chunks = []
        current_chunk = ""

        for part in splits:
            item = part if not current_chunk else sep + part
            
            if len(current_chunk) + len(item) <= self.chunk_size:
                current_chunk += item
            else:
                if current_chunk:
                    result_chunks.append(current_chunk.strip())
                
                # If individual part exceeds chunk size, split it with next separator
                if len(part) > self.chunk_size:
                    sub_chunks = self._split_text(part, remaining_seps)
                    result_chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = part

        if current_chunk.strip():
            result_chunks.append(current_chunk.strip())

        return result_chunks

    def _apply_overlap(self, raw_chunks: List[str]) -> List[str]:
        """Apply sliding window overlap across adjacent raw chunks."""
        if len(raw_chunks) <= 1 or self.chunk_overlap <= 0:
            return raw_chunks

        overlapped_chunks = []
        for i, chunk in enumerate(raw_chunks):
            if i == 0:
                overlapped_chunks.append(chunk)
            else:
                prev_chunk = raw_chunks[i - 1]
                overlap_text = prev_chunk[-self.chunk_overlap:]
                # Clean up leading broken word from overlap if possible
                if " " in overlap_text:
                    overlap_text = overlap_text[overlap_text.index(" ") + 1:]
                combined = f"{overlap_text} {chunk}".strip()
                overlapped_chunks.append(combined)

        return overlapped_chunks

    def chunk_document(
        self,
        pages: List[PageContent],
        document_metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """
        Chunks pages preserving page numbers and adding chunk indexes.
        """
        final_chunks: List[DocumentChunk] = []
        global_chunk_index = 0

        for page in pages:
            if not page.text or not page.text.strip():
                continue
                
            raw_chunks = self._split_text(page.text, self.separators)
            overlapped_chunks = self._apply_overlap(raw_chunks)

            for chunk_str in overlapped_chunks:
                clean_chunk = chunk_str.strip()
                if not clean_chunk:
                    continue

                chunk_meta = {
                    **document_metadata,
                    "page_number": page.page_number,
                    "chunk_index": global_chunk_index,
                    "character_length": len(clean_chunk)
                }

                final_chunks.append(
                    DocumentChunk(
                        content=clean_chunk,
                        page_number=page.page_number,
                        chunk_index=global_chunk_index,
                        metadata=chunk_meta
                    )
                )
                global_chunk_index += 1

        return final_chunks
