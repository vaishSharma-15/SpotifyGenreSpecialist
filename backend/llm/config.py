"""LLM configuration and unified call wrapper (edge cases 2.1, 2.2).

Provider-flexible and key-optional. Resolution order by which key is present:
  1. ANTHROPIC_API_KEY -> Anthropic Messages API (default; model claude-*)
  2. GROQ_API_KEY      -> Groq (OpenAI-compatible chat/completions)
  3. OPENAI_API_KEY    -> OpenAI (or any OpenAI-compatible base via LLM_BASE_URL)

No key -> has_api_key() is False and callers use their deterministic fallback, so
the app is fully functional with zero setup (problem statement success criteria).
Any network/parse error propagates to the caller, which also falls back.
"""
from __future__ import annotations

import os
from typing import Optional

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"

_TIMEOUT = 8.0


class LLMConfig:
    MODEL = os.getenv("LLM_MODEL", "claude-opus-4-8")
    ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
    GROQ_KEY = os.getenv("GROQ_API_KEY")
    OPENAI_KEY = os.getenv("OPENAI_API_KEY")
    BASE_URL = os.getenv("LLM_BASE_URL")  # override for OpenAI-compatible hosts
    TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
    MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "60"))

    @classmethod
    def provider(cls) -> Optional[str]:
        if cls.ANTHROPIC_KEY and cls.ANTHROPIC_KEY.strip():
            return "anthropic"
        if cls.GROQ_KEY and cls.GROQ_KEY.strip():
            return "groq"
        if cls.OPENAI_KEY and cls.OPENAI_KEY.strip():
            return "openai"
        return None

    @classmethod
    def is_enabled(cls) -> bool:
        return cls.provider() is not None


def has_api_key() -> bool:
    return LLMConfig.is_enabled()


def _post(url: str, headers: dict, payload: dict) -> dict:
    import httpx  # local import so the module never hard-depends on the SDK

    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


def _call_anthropic(prompt: str) -> str:
    data = _post(
        _ANTHROPIC_URL,
        {
            "x-api-key": LLMConfig.ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        {
            "model": LLMConfig.MODEL,
            "max_tokens": LLMConfig.MAX_TOKENS,
            "temperature": LLMConfig.TEMPERATURE,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    parts = data.get("content", [])
    return "".join(p.get("text", "") for p in parts if p.get("type") == "text")


def _call_openai_compatible(url: str, key: str, default_model: str, prompt: str) -> str:
    model = LLMConfig.MODEL
    # The Anthropic default model id is meaningless to OpenAI/Groq; swap it out.
    if model.startswith("claude"):
        model = default_model
    data = _post(
        LLMConfig.BASE_URL or url,
        {"Authorization": f"Bearer {key}", "content-type": "application/json"},
        {
            "model": model,
            "max_tokens": LLMConfig.MAX_TOKENS,
            "temperature": LLMConfig.TEMPERATURE,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    return data["choices"][0]["message"]["content"]


def call_llm(prompt: str) -> str:
    """Unified LLM call. Raises if no key / on error; callers catch and fall back."""
    provider = LLMConfig.provider()
    if provider is None:
        raise ValueError("No LLM API key configured.")
    if provider == "anthropic":
        return _call_anthropic(prompt)
    if provider == "groq":
        return _call_openai_compatible(
            _GROQ_URL, LLMConfig.GROQ_KEY, "llama-3.3-70b-versatile", prompt)
    return _call_openai_compatible(
        _OPENAI_URL, LLMConfig.OPENAI_KEY, "gpt-4o-mini", prompt)
