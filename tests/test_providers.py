import unittest
from unittest.mock import MagicMock, patch
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.ai_interface import ProviderFactory, MistralProvider, OpenAIProvider, LocalProvider, AnthropicProvider

class TestProviderFactory(unittest.TestCase):
    
    @patch.dict(os.environ, {"MISTRAL_API_KEY": "fake_key"})
    def test_get_mistral_provider(self):
        # We need to mock mistralai package presence if it's not installed, 
        # but for this test we assume dependencies are installed or we might need to mock import
        with patch('src.ai_interface.Mistral') as MockMistral:
            provider = ProviderFactory.get_provider("mistral")
            self.assertIsInstance(provider, MistralProvider)
            
    @patch.dict(os.environ, {"OPENAI_API_KEY": "fake_key"})
    def test_get_openai_provider(self):
        with patch('src.ai_interface.openai') as MockOpenAI:
            provider = ProviderFactory.get_provider("openai")
            self.assertIsInstance(provider, OpenAIProvider)

    def test_get_local_provider(self):
        with patch('src.ai_interface.openai') as MockOpenAI:
            provider = ProviderFactory.get_provider("local")
            self.assertIsInstance(provider, LocalProvider)
            
            # Verify correct initialization arguments
            args, kwargs = MockOpenAI.OpenAI.call_args
            self.assertEqual(kwargs.get('base_url'), "http://localhost:11434/v1") 

    @patch.dict(os.environ, {"ANTHROPIC_API_KEY": "fake_key"})
    def test_get_anthropic_provider(self):
        with patch('src.ai_interface.anthropic') as MockAnthropic:
            provider = ProviderFactory.get_provider("anthropic")
            self.assertIsInstance(provider, AnthropicProvider)

    def test_unknown_provider(self):
        with self.assertRaises(ValueError):
            ProviderFactory.get_provider("unknown_provider")

class TestMistralProvider(unittest.TestCase):
    @patch('src.ai_interface.Mistral')
    def test_generate_response(self, MockMistral):
        mock_client = MockMistral.return_value
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Mistral Response"
        mock_client.chat.complete.return_value = mock_response
        
        provider = MistralProvider(api_key="fake")
        response = provider.generate_response("sys", "user")
        self.assertEqual(response, "Mistral Response")
        mock_client.chat.complete.assert_called_once()

class TestOpenAIProvider(unittest.TestCase):
    @patch('src.ai_interface.openai')
    def test_generate_response(self, MockOpenAI):
        mock_client = MockOpenAI.OpenAI.return_value
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "OpenAI Response"
        mock_client.chat.completions.create.return_value = mock_response
        
        provider = OpenAIProvider(api_key="fake")
        response = provider.generate_response("sys", "user")
        self.assertEqual(response, "OpenAI Response")
        mock_client.chat.completions.create.assert_called_once()

if __name__ == '__main__':
    unittest.main()
