from __future__ import annotations

import json
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from .config import Settings


class LLMConfigurationError(RuntimeError):
    """Raised when the LLM client cannot be configured."""


class LLMClient:
    """
    Thin wrapper around the OpenAI client providing text and structured outputs.
    """

    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key or not settings.openai_api_model:
            raise LLMConfigurationError("OpenAI API key and model must be provided.")

        client_kwargs = {
            "api_key": settings.openai_api_key,
            "model": settings.openai_api_model,
            "max_retries": 1,
        }
        if settings.openai_api_url:
            client_kwargs["base_url"] = settings.openai_api_url
        if settings.openai_timeout:
            client_kwargs["timeout"] = settings.openai_timeout

        self._chat = ChatOpenAI(**client_kwargs)

    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        chat = self._chat.bind(temperature=temperature, max_tokens=max_tokens)
        response = chat.invoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
        )
        content = getattr(response, "content", "") or ""
        return content.strip()

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float = 0.1,
    ) -> dict:
        chat = self._chat.bind(
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        response = chat.invoke(
            [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
        )
        content = getattr(response, "content", "") or ""
        content = content.strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Planner response is not valid JSON.") from exc

    def chat_model(self) -> ChatOpenAI:
        return self._chat
