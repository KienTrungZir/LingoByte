"""
Multi-Provider AI System for LingoByte
Inspired by HanVira's IAiChatProvider architecture.

Supports 4 providers:
  - Google Gemini (direct API)
  - Anthropic Claude
  - OpenAI ChatGPT
  - OpenRouter (multi-model gateway)

Provider settings are stored in the database (AiProviderSettings table)
and can be managed at runtime via the admin panel.
"""
import base64
from abc import ABC, abstractmethod
import httpx
from sqlalchemy.orm import Session
from .. import models


# ─── Abstract Base Class ──────────────────────────────────────────

class AiChatProvider(ABC):
    """Abstract base for all AI chat providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def send_message(self, messages: list, system_prompt: str) -> str:
        """
        Send a chat message with conversation history.
        
        Args:
            messages: List of dicts with 'role' and 'content' keys.
                      Roles: 'user', 'assistant'
            system_prompt: The system/instruction prompt.
            
        Returns:
            AI response text.
        """
        pass

    async def analyze(self, prompt: str) -> str:
        """Send an analysis prompt (convenience wrapper)."""
        return await self.send_message(
            [{"role": "user", "content": prompt}],
            "You are an expert language learning analyst. Return only valid JSON, no markdown."
        )


# ─── Google Gemini Provider ──────────────────────────────────────

class GeminiProvider(AiChatProvider):
    """Google Gemini API (direct, no OpenRouter)."""

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def send_message(self, messages: list, system_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self._model}:generateContent?key={self._api_key}"
        )

        # Gemini uses 'model' role instead of 'assistant'
        # If messages is empty, add a seed message
        if messages:
            contents = [
                {
                    "role": "user" if m["role"] == "user" else "model",
                    "parts": [{"text": m["content"]}]
                }
                for m in messages
            ]
        else:
            contents = [
                {"role": "user", "parts": [{"text": "Bắt đầu cuộc hội thoại."}]}
            ]

        body = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": 4000,
                "temperature": 0.7
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=body, timeout=30.0)

                if response.status_code == 200:
                    data = response.json()
                    return (
                        data["candidates"][0]["content"]["parts"][0]["text"]
                    )
                else:
                    print(f"[Gemini] Error {response.status_code}: {response.text[:200]}")
                    return None
        except Exception as e:
            print(f"[Gemini] Connection Error: {e}")
            return None


# ─── Anthropic Claude Provider ────────────────────────────────────

class ClaudeProvider(AiChatProvider):
    """Anthropic Claude API."""

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    @property
    def provider_name(self) -> str:
        return "claude"

    async def send_message(self, messages: list, system_prompt: str) -> str:
        url = "https://api.anthropic.com/v1/messages"

        # Claude requires at least one user message
        if not messages:
            messages = [{"role": "user", "content": "Bắt đầu cuộc hội thoại."}]

        body = {
            "model": self._model,
            "max_tokens": 4000,
            "system": system_prompt,
            "messages": [
                {"role": m["role"], "content": m["content"]}
                for m in messages
            ]
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "x-api-key": self._api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=body,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"]
                else:
                    print(f"[Claude] Error {response.status_code}: {response.text[:200]}")
                    return None
        except Exception as e:
            print(f"[Claude] Connection Error: {e}")
            return None


# ─── OpenAI ChatGPT Provider ─────────────────────────────────────

class OpenAiProvider(AiChatProvider):
    """OpenAI ChatGPT API."""

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    @property
    def provider_name(self) -> str:
        return "openai"

    async def send_message(self, messages: list, system_prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"

        # Build OpenAI message format: system + history
        payload_messages = [{"role": "system", "content": system_prompt}]
        payload_messages.extend(
            {"role": m["role"], "content": m["content"]}
            for m in messages
        )

        body = {
            "model": self._model,
            "messages": payload_messages,
            "max_tokens": 4000,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"[OpenAI] Error {response.status_code}: {response.text[:200]}")
                    return None
        except Exception as e:
            print(f"[OpenAI] Connection Error: {e}")
            return None


# ─── OpenRouter Provider (backward compatible) ───────────────────

class OpenRouterProvider(AiChatProvider):
    """OpenRouter multi-model gateway (legacy/backward compatible)."""

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    @property
    def provider_name(self) -> str:
        return "openrouter"

    async def send_message(self, messages: list, system_prompt: str) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"

        # OpenRouter uses OpenAI-compatible format
        payload_messages = [{"role": "system", "content": system_prompt}]
        payload_messages.extend(
            {"role": m["role"], "content": m["content"]}
            for m in messages
        )

        body = {
            "model": self._model,
            "messages": payload_messages,
            "max_tokens": 4000,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "LingoByte",
                    },
                    json=body,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"[OpenRouter] Error {response.status_code}: {response.text[:200]}")
                    return None
        except Exception as e:
            print(f"[OpenRouter] Connection Error: {e}")
            return None


# ─── Provider Factory ─────────────────────────────────────────────

class AiProviderFactory:
    """
    Factory that reads the active AI provider from the database
    and creates the appropriate provider instance.
    
    Inspired by HanVira's AiProviderFactory pattern.
    """

    @staticmethod
    def encrypt(raw: str) -> str:
        """Encode API key to base64 for database storage."""
        return base64.b64encode(raw.encode("utf-8")).decode("utf-8")

    @staticmethod
    def decrypt(enc: str) -> str:
        """Decode API key from base64."""
        return base64.b64decode(enc.encode("utf-8")).decode("utf-8")

    @staticmethod
    async def get_active(db: Session) -> AiChatProvider:
        """
        Get the currently active AI provider from the database.
        
        Returns:
            An AiChatProvider instance ready to use.
            
        Raises:
            ValueError: If no active provider is configured.
        """
        setting = db.query(models.AiProviderSetting).filter(
            models.AiProviderSetting.is_active == True
        ).first()

        if not setting:
            raise ValueError(
                "Chưa có AI provider nào được kích hoạt. "
                "Vui lòng vào Admin → AI Provider để cấu hình."
            )

        api_key = AiProviderFactory.decrypt(setting.api_key)

        provider_map = {
            "gemini": GeminiProvider,
            "claude": ClaudeProvider,
            "openai": OpenAiProvider,
            "openrouter": OpenRouterProvider,
        }

        provider_class = provider_map.get(setting.provider)
        if not provider_class:
            raise ValueError(f"Provider không hợp lệ: {setting.provider}")

        return provider_class(api_key, setting.model)
