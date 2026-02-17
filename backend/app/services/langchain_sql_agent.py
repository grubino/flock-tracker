"""
LangChain SQL Agent Service
Natural language database query agent using local LLM via llama.cpp server
"""

import logging
from typing import Dict, Optional, AsyncIterator
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Engine
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_community.chat_models import ChatOpenAI
from langchain.agents import AgentType, AgentExecutor
from langchain.callbacks.base import AsyncCallbackHandler
from langchain.schema import LLMResult
import json

from app.config import settings

logger = logging.getLogger(__name__)


class StreamingCallbackHandler(AsyncCallbackHandler):
    """Custom callback handler for streaming agent responses"""

    def __init__(self):
        self.tokens = []
        self.current_step = ""

    async def on_llm_start(self, serialized: Dict, prompts: list, **kwargs):
        """Run when LLM starts running"""
        self.current_step = "thinking"

    async def on_llm_new_token(self, token: str, **kwargs):
        """Run on new LLM token (for streaming)"""
        self.tokens.append(token)

    async def on_llm_end(self, response: LLMResult, **kwargs):
        """Run when LLM ends running"""
        self.current_step = "complete"

    async def on_chain_start(self, serialized: Dict, inputs: Dict, **kwargs):
        """Run when chain starts"""
        pass

    async def on_chain_end(self, outputs: Dict, **kwargs):
        """Run when chain ends"""
        pass

    async def on_agent_action(self, action, **kwargs):
        """Run on agent action (e.g., executing SQL)"""
        self.current_step = "executing_sql"

    async def on_tool_start(self, serialized: Dict, input_str: str, **kwargs):
        """Run when tool starts"""
        pass


class LangChainSQLAgent:
    """Service to query database using natural language via LangChain SQL Agent"""

    def __init__(
        self,
        llm_url: str = "http://localhost:8080",
        database_url: Optional[str] = None,
        temperature: float = 0.1,  # Low temperature for factual responses
        max_tokens: int = 2048,
    ):
        """
        Initialize the SQL agent

        Args:
            llm_url: Base URL of the llama.cpp server (OpenAI-compatible)
            database_url: PostgreSQL database URL (uses settings if not provided)
            temperature: Sampling temperature (0.0-1.0, lower = more factual)
            max_tokens: Maximum tokens to generate
        """
        self.llm_url = llm_url
        self.database_url = database_url or settings.database_url
        self.temperature = temperature
        self.max_tokens = max_tokens

        # Initialize components
        self._engine: Optional[Engine] = None
        self._db: Optional[SQLDatabase] = None
        self._llm = None
        self._agent = None

    def _initialize_engine(self):
        """Initialize SQLAlchemy engine"""
        if not self._engine:
            self._engine = create_engine(self.database_url)
            logger.info("Database engine initialized")

    def _initialize_database(self):
        """Initialize LangChain SQLDatabase wrapper"""
        if not self._db:
            self._initialize_engine()
            self._db = SQLDatabase(self._engine)
            logger.info(f"SQLDatabase initialized with tables: {self._db.get_usable_table_names()}")

    def _initialize_llm(self, streaming: bool = False):
        """
        Initialize ChatOpenAI pointing to llama.cpp server

        Args:
            streaming: Enable streaming mode
        """
        if not self._llm or (streaming and not getattr(self._llm, 'streaming', False)):
            # Use ChatOpenAI which is compatible with llama.cpp server's OpenAI API
            self._llm = ChatOpenAI(
                base_url=f"{self.llm_url}/v1",
                api_key="not-needed",  # llama.cpp doesn't require API key
                model="local-model",  # llama.cpp ignores this
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                streaming=streaming,
                request_timeout=120,  # 2 minute timeout
            )
            logger.info(f"ChatOpenAI LLM initialized (streaming={streaming})")

    def _initialize_agent(self, streaming: bool = False):
        """Initialize SQL agent"""
        if not self._agent or (streaming and not getattr(self._llm, 'streaming', False)):
            self._initialize_database()
            self._initialize_llm(streaming=streaming)

            # Create SQL agent with zero-shot react description
            self._agent = create_sql_agent(
                llm=self._llm,
                db=self._db,
                agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
                verbose=True,
                handle_parsing_errors=True,  # Handle LLM parsing errors gracefully
                max_iterations=10,  # Limit iterations to prevent infinite loops
                max_execution_time=120,  # Timeout after 2 minutes
                return_intermediate_steps=True,
            )
            logger.info("SQL Agent initialized")

    def query(self, question: str) -> Dict:
        """
        Query the database using natural language

        Args:
            question: Natural language question about the data

        Returns:
            Dict with structure:
            {
                "success": bool,
                "answer": str | None,  # Natural language answer
                "sql": str | None,  # SQL query executed (if available)
                "error": str | None,  # Error message if failed
                "intermediate_steps": list  # Agent's reasoning steps
            }
        """
        try:
            # Initialize agent if not already done
            self._initialize_agent(streaming=False)

            logger.info(f"Processing query: {question}")

            # Run the agent
            result = self._agent.invoke({"input": question})

            # Extract answer and intermediate steps
            answer = result.get("output", "")
            intermediate_steps = result.get("intermediate_steps", [])

            # Try to extract SQL from intermediate steps
            sql_queries = []
            for step in intermediate_steps:
                if len(step) >= 2:
                    action, observation = step[0], step[1]
                    if hasattr(action, "tool_input"):
                        sql_queries.append(action.tool_input)

            return {
                "success": True,
                "answer": answer,
                "sql": sql_queries[-1] if sql_queries else None,  # Return last SQL query
                "error": None,
                "intermediate_steps": [
                    {
                        "action": str(step[0]) if len(step) > 0 else "",
                        "observation": str(step[1]) if len(step) > 1 else "",
                    }
                    for step in intermediate_steps
                ],
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error processing query: {error_msg}")
            return {
                "success": False,
                "answer": None,
                "sql": None,
                "error": error_msg,
                "intermediate_steps": [],
            }

    async def query_stream(self, question: str) -> AsyncIterator[str]:
        """
        Query the database using natural language with streaming response

        Args:
            question: Natural language question about the data

        Yields:
            Server-Sent Events formatted strings with streaming updates
        """
        try:
            # Initialize agent with streaming
            self._initialize_agent(streaming=True)

            logger.info(f"Processing streaming query: {question}")

            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Analyzing question...'})}\n\n"

            # Create custom callback for streaming
            callback = StreamingCallbackHandler()

            # Run the agent with streaming
            result = await self._agent.ainvoke(
                {"input": question},
                config={"callbacks": [callback]}
            )

            # Extract results
            answer = result.get("output", "")
            intermediate_steps = result.get("intermediate_steps", [])

            # Extract SQL from intermediate steps
            sql_queries = []
            for step in intermediate_steps:
                if len(step) >= 2:
                    action, observation = step[0], step[1]
                    if hasattr(action, "tool_input"):
                        sql_queries.append(action.tool_input)
                        # Stream SQL execution
                        yield f"data: {json.dumps({'type': 'sql', 'query': action.tool_input})}\n\n"

            # Stream final answer
            yield f"data: {json.dumps({'type': 'answer', 'text': answer})}\n\n"

            # Stream intermediate steps
            yield f"data: {json.dumps({'type': 'steps', 'steps': [{'action': str(step[0]) if len(step) > 0 else '', 'observation': str(step[1]) if len(step) > 1 else ''} for step in intermediate_steps]})}\n\n"

            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'success': True, 'sql': sql_queries[-1] if sql_queries else None})}\n\n"

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in streaming query: {error_msg}")
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    def get_schema_info(self) -> Dict:
        """
        Get database schema information

        Returns:
            Dict with table names and their columns
        """
        try:
            self._initialize_database()

            schema_info = {}
            inspector = inspect(self._engine)

            for table_name in inspector.get_table_names():
                columns = inspector.get_columns(table_name)
                schema_info[table_name] = [
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                    }
                    for col in columns
                ]

            return {
                "success": True,
                "schema": schema_info,
                "error": None,
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error getting schema info: {error_msg}")
            return {
                "success": False,
                "schema": None,
                "error": error_msg,
            }

    def close(self):
        """Clean up resources"""
        if self._engine:
            self._engine.dispose()
            logger.info("Database engine disposed")
