import logging
import sys
import uuid
from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

class ContextFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_ctx.get() or "N/A"
        return True

def setup_logging(log_level: str = "INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level.upper())
    
    # Remove existing handlers
    for handler in logger.handlers:
        logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [ReqID: %(request_id)s] [%(name)s]: %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilter())
    logger.addHandler(handler)

def get_logger(name: str):
    return logging.getLogger(name)
