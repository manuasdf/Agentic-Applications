from abc import ABC, abstractmethod
import os
from mistralai import Mistral

class AIProvider(ABC):
    @abstractmethod
    def generate_response(self, system_prompt: str, user_prompt: str, model: str = "mistral-large-latest") -> str:
        """Generates a response from the AI model."""
        pass

class MistralProvider(AIProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY is not set.")
        self.client = Mistral(api_key=self.api_key)

    def generate_response(self, system_prompt: str, user_prompt: str, model: str = "mistral-large-latest") -> str:
        try:
            chat_response = self.client.chat.complete(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            return chat_response.choices[0].message.content
        except Exception as e:
            print(f"Error generating response from Mistral: {e}")
            raise
