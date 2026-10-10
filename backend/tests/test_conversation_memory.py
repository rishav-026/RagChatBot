import pytest
import uuid
from unittest.mock import MagicMock
from app.services.conversation_service import ConversationService
from app.models.db import MessageModel

def test_conversation_service_format_history():
    service = ConversationService()
    
    msg1 = MessageModel(role="user", content="What is company policy?")
    msg2 = MessageModel(role="assistant", content="Employees receive 25 days leave.")
    
    formatted = service.format_history_for_prompt([msg1, msg2])
    assert "User: What is company policy?" in formatted
    assert "Assistant: Employees receive 25 days leave." in formatted
