from __future__ import annotations

from typing import Any

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain_core.language_models import BaseLanguageModel

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover - optional dependency
    ChatOpenAI = None  # type: ignore

from ..config import get_settings


class QAService:
    def __init__(self) -> None:
        settings = get_settings()
        self.prompt = PromptTemplate.from_template(
            "你是一名专业的A股投研助手，需要根据上下文提供简明的回答。上下文: {context}\n问题: {question}"
        )
        llm: BaseLanguageModel
        if settings.openai_api_key and ChatOpenAI is not None:
            llm = ChatOpenAI(openai_api_key=settings.openai_api_key, model_name="gpt-4o-mini")
        else:
            from langchain_community.llms import FakeListLLM

            llm = FakeListLLM(responses=["这是一个示例回答，待接入真实大模型后可获得更佳体验。"])
        self.chain = LLMChain(prompt=self.prompt, llm=llm, output_parser=StrOutputParser())

    async def run(self, question: str, context: list[dict[str, Any]] | None = None) -> str:
        context_str = "\n".join([f"- {item.get('role', 'info')}: {item.get('content')}" for item in context or []])
        return await self.chain.apredict(question=question, context=context_str)


qa_service = QAService()
