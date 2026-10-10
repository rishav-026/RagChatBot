import re

def clean_text(text: str) -> str:
    """
    Normalize unnecessary whitespace while preserving line structure and useful punctuation.
    """
    if not text:
        return ""
    
    # Replace non-breaking spaces and other whitespace characters with standard space
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove null characters or unusual control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # Replace multiple spaces/tabs with single space on each line
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    
    # Collapse 3 or more consecutive empty lines into max 2 consecutive newlines (paragraph separator)
    cleaned = '\n'.join(lines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned.strip()
