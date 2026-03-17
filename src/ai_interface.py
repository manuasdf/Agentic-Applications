from abc import ABC, abstractmethod
import os
from typing import Optional, Dict, Any

# Provider Imports
try:
    from mistralai.client.sdk import Mistral
except ImportError:
    Mistral = None

try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    from huggingface_hub import InferenceClient
except ImportError:
    InferenceClient = None


class AIProvider(ABC):
    @abstractmethod
    def generate_response(
        self, system_prompt: str, user_prompt: str, model: Optional[str] = None
    ) -> str:
        """Generates a response from the AI model."""
        pass


class MistralProvider(AIProvider):
    def __init__(self, api_key: str = None):
        if Mistral is None:
            raise ImportError("mistralai package is not installed.")
        self.api_key = api_key or os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY is not set.")
        self.client = Mistral(api_key=self.api_key)
        self.default_model = "mistral-large-latest"

    def generate_response(
        self, system_prompt: str, user_prompt: str, model: Optional[str] = None
    ) -> str:
        try:
            chat_response = self.client.chat.complete(
                model=model or self.default_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return chat_response.choices[0].message.content
        except Exception as e:
            print(f"Error generating response from Mistral: {e}")
            raise


class BaseOpenAIProvider(AIProvider):
    """Base class for OpenAI-compatible APIs (OpenAI, xAI, DeepSeek, Local/Ollama)."""

    def __init__(
        self, api_key: str = None, base_url: str = None, default_model: str = "gpt-4o"
    ):
        if openai is None:
            raise ImportError("openai package is not installed.")

        # Determine API Key
        # If specific env var is not set, fallback to default OPENAI_API_KEY or empty for local
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY") or "cannot_be_empty"

        self.client = openai.OpenAI(api_key=self.api_key, base_url=base_url)
        self.default_model = default_model

    def generate_response(
        self, system_prompt: str, user_prompt: str, model: Optional[str] = None
    ) -> str:
        try:
            response = self.client.chat.completions.create(
                model=model or self.default_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error generating response from Provider: {e}")
            raise


class OpenAIProvider(BaseOpenAIProvider):
    def __init__(self, api_key: str = None):
        super().__init__(api_key=api_key, base_url=None, default_model="gpt-4o")


class XAIProvider(BaseOpenAIProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("XAI_API_KEY")
        if not key:
            raise ValueError("XAI_API_KEY is not set.")
        super().__init__(
            api_key=key, base_url="https://api.x.ai/v1", default_model="grok-beta"
        )


class DeepSeekProvider(BaseOpenAIProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not key:
            raise ValueError("DEEPSEEK_API_KEY is not set.")
        super().__init__(
            api_key=key,
            base_url="https://api.deepseek.com",
            default_model="deepseek-chat",
        )


class LocalProvider(BaseOpenAIProvider):
    def __init__(
        self,
        api_key: str = "ollama",
        base_url: str = None,
        default_model: str = "llama3",
    ):
        # Use default if not provided or None
        base_url = base_url or "http://localhost:11434/v1"
        # For local providers like Ollama, API key often doesn't matter but cannot be empty
        super().__init__(
            api_key=api_key, base_url=base_url, default_model=default_model
        )


class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str = None):
        if anthropic is None:
            raise ImportError("anthropic package is not installed.")
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set.")
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.default_model = "claude-3-opus-20240229"

    def generate_response(
        self, system_prompt: str, user_prompt: str, model: Optional[str] = None
    ) -> str:
        try:
            target_model = model or self.default_model
            # System prompt is a separate parameter in Anthropic API
            response = self.client.messages.create(
                model=target_model,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                max_tokens=4096,
            )
            return response.content[0].text
        except Exception as e:
            print(f"Error generating response from Anthropic: {e}")
            raise


class HuggingFaceProvider(AIProvider):
    def __init__(self, api_key: str = None):
        if InferenceClient is None:
            raise ImportError("huggingface_hub package is not installed.")
        self.api_key = api_key or os.environ.get("HF_TOKEN")
        # HF_TOKEN is optional for some public models, but usually required for higher limits/gated models
        self.client = InferenceClient(token=self.api_key)
        self.default_model = "meta-llama/Llama-2-70b-chat-hf"  # Example default

    def generate_response(
        self, system_prompt: str, user_prompt: str, model: Optional[str] = None
    ) -> str:
        try:
            # Mistral/Llama style prompting often needed for raw generation,
            # but InferenceClient has chat_completion for some models?
            # Let's try chat_completion if available, or text_generation.
            # Newer HF client supports chat_completion.

            target_model = model or self.default_model

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            response = self.client.chat_completion(
                model=target_model, messages=messages, max_tokens=2048
            )
            return response.choices[0].message.content
        except AttributeError:
            # Fallback for older client versions or models that don't support chat
            # This relies on the user constructing the prompt correctly, but we can try basic concatenation
            full_prompt = f"{system_prompt}\n\nUser: {user_prompt}\nAssistant:"
            response = self.client.text_generation(
                prompt=full_prompt,
                model=model or self.default_model,
                max_new_tokens=2048,
            )
            return response
        except Exception as e:
            print(f"Error generating response from HuggingFace: {e}")
            raise


class ProviderFactory:
    @staticmethod
    def get_provider(provider_name: str, **kwargs) -> AIProvider:
        provider_name = provider_name.lower()
        if provider_name == "mistral":
            return MistralProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "openai":
            return OpenAIProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "anthropic":
            return AnthropicProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "xai":
            return XAIProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "deepseek":
            return DeepSeekProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "huggingface":
            return HuggingFaceProvider(api_key=kwargs.get("api_key"))
        elif provider_name == "local":
            return LocalProvider(
                api_key=kwargs.get("api_key"),
                base_url=kwargs.get("api_base"),
                default_model=kwargs.get("model_name") or "llama3",
            )
        else:
            raise ValueError(f"Unknown provider: {provider_name}")
