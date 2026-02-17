"""
API Router for LangChain SQL Agent
Natural language database queries
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from celery import Celery
from celery.result import AsyncResult
from app.services.auth import get_current_active_user
from app.models.user import User
from app.services.langchain_sql_agent import LangChainSQLAgent
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()

# Redis connection for Celery
REDIS_URL = os.getenv("REDIS_URL")
CELERY_AVAILABLE = bool(REDIS_URL)

if CELERY_AVAILABLE:
    # Create Celery client to send tasks (not execute them)
    celery_app = Celery("flock_tracker_api", broker=REDIS_URL, backend=REDIS_URL)
    # Configure serialization to match worker
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        result_extended=True,  # Include more metadata in results
    )
    logger.info(f"Celery client initialized for agent router with broker: {REDIS_URL[:20]}...")
else:
    celery_app = None
    logger.warning(
        "REDIS_URL not set - Celery unavailable, agent tasks will fail"
    )


class AgentQueryRequest(BaseModel):
    """Request model for agent query"""
    question: str = Field(..., min_length=1, max_length=1000, description="Natural language question about the data")
    llm_url: Optional[str] = Field(default="http://localhost:8080", description="LLama.cpp server URL")


class AgentQueryResponse(BaseModel):
    """Response model for agent query"""
    task_id: str = Field(..., description="Celery task ID for status checking")
    status: str = Field(..., description="Task status (PENDING, PROCESSING, SUCCESS, FAILURE)")


class AgentTaskStatus(BaseModel):
    """Status model for agent task"""
    task_id: str
    status: str
    result: Optional[Dict] = None  # Result contains answer, sql, error, intermediate_steps
    meta: Optional[Dict] = None  # Progress information


@router.post("/query", response_model=AgentQueryResponse, tags=["Agent"])
def query_database(
    request: AgentQueryRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Query the database using natural language

    Submit a natural language question to be processed by the SQL agent.
    Returns a task ID that can be used to check the status and get the result.

    Example questions:
    - "How many sheep do we have?"
    - "What are the total expenses for feed this month?"
    - "Show me all animals born this year"
    - "What's the average expense per category?"
    """
    if not CELERY_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Celery worker not available. Please use the streaming endpoint (/query-stream) instead."
        )

    # Start the Celery task (sends to Redis for worker to pick up)
    task = celery_app.send_task(
        "query_database_with_agent",
        args=[request.question, request.llm_url]
    )

    return AgentQueryResponse(
        task_id=task.id,
        status="PENDING"
    )


@router.get("/query/{task_id}", response_model=AgentTaskStatus, tags=["Agent"])
def get_query_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the status of an agent query task

    Check the status of a previously submitted query.
    The result will contain:
    - answer: Natural language answer to the question
    - sql: SQL query that was executed (if available)
    - error: Error message if the query failed
    - intermediate_steps: Agent's reasoning process
    """
    task_result = AsyncResult(task_id, app=celery_app)

    response = AgentTaskStatus(
        task_id=task_id,
        status=task_result.state,
        meta=task_result.info if isinstance(task_result.info, dict) else None
    )

    # If task is complete, include the full result
    if task_result.state == "SUCCESS":
        response.result = task_result.result
    elif task_result.state == "FAILURE":
        response.result = {
            "success": False,
            "answer": None,
            "sql": None,
            "error": str(task_result.info),
            "intermediate_steps": []
        }

    return response


@router.get("/query-stream", tags=["Agent"])
async def query_database_stream(
    question: str,
    llm_url: str = "http://localhost:8080",
    current_user: User = Depends(get_current_active_user)
):
    """
    Query the database using natural language with streaming response

    This endpoint streams the agent's response in real-time using Server-Sent Events.
    The response includes status updates, SQL queries executed, and the final answer.

    Example questions:
    - "How many sheep do we have?"
    - "What are the total expenses for feed this month?"
    - "Show me all animals born this year"
    - "What's the average expense per category?"

    Returns:
        StreamingResponse with Server-Sent Events containing:
        - type: 'status' - Status updates (e.g., "Analyzing question...")
        - type: 'sql' - SQL query being executed
        - type: 'answer' - Natural language answer
        - type: 'steps' - Intermediate reasoning steps
        - type: 'complete' - Final completion signal with success status
        - type: 'error' - Error message if query fails
    """
    agent = LangChainSQLAgent(llm_url=llm_url)

    return StreamingResponse(
        agent.query_stream(question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
