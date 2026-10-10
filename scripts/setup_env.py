"""
Helper script to verify environment variables and database connection for Production RAG Knowledge Assistant.
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

def check_env():
    print("Checking environment setup...")
    from app.config import settings
    print(f"DATABASE_URL: {settings.DATABASE_URL.split('@')[-1]}")
    print(f"EMBEDDING_MODEL: {settings.EMBEDDING_MODEL}")
    print(f"EMBEDDING_DIMENSION: {settings.EMBEDDING_DIMENSION}")
    print(f"GEMINI_MODEL: {settings.GEMINI_MODEL}")
    print(f"GEMINI_API_KEY set: {bool(settings.GEMINI_API_KEY)}")
    print("Environment configuration loaded successfully.")

if __name__ == "__main__":
    check_env()
