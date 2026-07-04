"""LLM configuration and unified call wrapper (edge cases 2.1, 2.2)."""
from __future__ import annotations

import os


class LLMConfig:
    MODEL = os.getenv("LLM_MODEL", "claude-opus-4-8")
    API_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    TEMPERATURE = 0.7
    MAX_TOKENS = 60

    @classmethod
    def is_enabled(cls) -> bool:
        return bool(cls.API_KEY and cls.API_KEY.strip())


def has_api_key() -> bool:
    return LLMConfig.is_enabled()


def call_llm(prompt: str) -> str:
    """Unified LLM call. Raises if no key; callers must catch and fall back."""
    if not has_api_key():
        raise ValueError("No LLM API key configured.")
    # Provider call intentionally left as an integration point for the MVP.
    # Kept import-local so the module never hard-depends on an SDK.
    raise NotImplementedError("Wire up your LLM provider here.")
