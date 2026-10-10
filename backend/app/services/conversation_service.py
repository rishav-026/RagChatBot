import uuid
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.db import ConversationModel, MessageModel
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class ConversationService:
    def get_or_create_conversation(self, db: Session, conversation_id: Optional[str] = None) -> ConversationModel:
        if conversation_id:
            try:
                conv_uuid = uuid.UUID(conversation_id)
                conv = db.query(ConversationModel).filter(ConversationModel.id == conv_uuid).first()
                if conv:
                    return conv
            except ValueError:
                pass

        # Create new conversation
        new_conv = ConversationModel(title="New Conversation")
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        return new_conv

    def get_history(self, db: Session, conversation_id: uuid.UUID, limit: int = settings.MAX_CONVERSATION_HISTORY) -> List[MessageModel]:
        """
        Fetches bounded recent messages for conversation.
        """
        messages = (
            db.query(MessageModel)
            .filter(MessageModel.conversation_id == conversation_id)
            .order_by(MessageModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return list(reversed(messages))

    def save_message(
        self,
        db: Session,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MessageModel:
        """
        Saves a user or assistant message to conversation memory.
        """
        msg = MessageModel(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
            metadata_=metadata or {}
        )
        db.add(msg)
        
        # Update conversation title from first user query if still default
        conv = db.query(ConversationModel).filter(ConversationModel.id == conversation_id).first()
        if conv and role == "user" and conv.title == "New Conversation":
            conv.title = content[:35] + ("..." if len(content) > 35 else "")
            
        db.commit()
        db.refresh(msg)
        return msg

    def format_history_for_prompt(self, messages: List[MessageModel]) -> str:
        """
        Formats bounded recent messages into text string for prompt inclusion.
        Excludes current message if already present.
        """
        if not messages:
            return "No previous conversation history."

        history_lines = []
        for msg in messages:
            role_label = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{role_label}: {msg.content}")

        return "\n".join(history_lines)
