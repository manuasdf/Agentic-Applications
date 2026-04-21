from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from enum import Enum


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL of the job posting to scrape")


class ScrapeResponse(BaseModel):
    text: str = Field(..., description="Extracted text from the job posting")
    url: str = Field(..., description="Original URL")


class AIProvider(str, Enum):
    MISTRAL = "mistral"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    XAI = "xai"
    DEEPSEEK = "deepseek"
    HUGGINGFACE = "huggingface"
    LOCAL = "local"


class AIRequest(BaseModel):
    system_prompt: str = Field(..., description="System prompt for the AI")
    user_prompt: str = Field(..., description="User prompt for the AI")
    provider: AIProvider = Field(default=AIProvider.MISTRAL, description="AI provider to use")
    model: Optional[str] = Field(default=None, description="Specific model name")
    api_key: Optional[str] = Field(default=None, description="API key (if not in env)")
    api_base: Optional[str] = Field(default=None, description="Base URL for the provider")


class AIResponse(BaseModel):
    content: str = Field(..., description="AI-generated response")
    provider: str = Field(..., description="Provider used")
    model: Optional[str] = Field(default=None, description="Model used")


class CompileRequest(BaseModel):
    latex: str = Field(..., description="LaTeX source code to compile")


class CompileResponse(BaseModel):
    pdf_base64: str = Field(..., description="PDF as base64-encoded string")
    success: bool = Field(..., description="Whether compilation succeeded")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class JobAnalysisRequest(BaseModel):
    job_text: str = Field(..., description="Text from the job posting")
    provider: AIProvider = Field(default=AIProvider.MISTRAL)
    model: Optional[str] = None
    api_key: Optional[str] = None


class JobAnalysisResponse(BaseModel):
    analysis: Dict[str, Any] = Field(..., description="Parsed job analysis")
    raw_response: str = Field(..., description="Raw AI response")


class GenerateDocumentRequest(BaseModel):
    document_type: Literal["cv", "cover_letter", "email"] = Field(..., description="Type of document to generate")
    job_analysis: Dict[str, Any] = Field(..., description="Job analysis data")
    candidate_profile: str = Field(..., description="Candidate profile text")
    template: Optional[str] = Field(default=None, description="LaTeX template")
    provider: AIProvider = Field(default=AIProvider.MISTRAL)
    model: Optional[str] = None
    api_key: Optional[str] = None
    babel_language: Optional[str] = Field(default="english", description="Babel language for LaTeX")
    tone_guide: Optional[str] = Field(default=None, description="Tone and style guide")


class GenerateDocumentResponse(BaseModel):
    latex: Optional[str] = Field(default=None, description="Generated LaTeX (for cv/cover_letter)")
    content: Optional[str] = Field(default=None, description="Generated content (for email)")
    document_type: Literal["cv", "cover_letter", "email"]
    success: bool = Field(..., description="Whether generation succeeded")
    error: Optional[str] = Field(default=None, description="Error message if failed")
