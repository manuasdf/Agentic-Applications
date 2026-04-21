import sys
import os

# Add src to path - calculate absolute path to repo root/src
# From web/backend/routes/: ../../../ = repo root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
src_path = os.path.join(REPO_ROOT, 'src')
if os.path.exists(src_path):
    sys.path.append(src_path)

from fastapi import APIRouter, HTTPException
from models import AIRequest, AIResponse, JobAnalysisRequest, JobAnalysisResponse, GenerateDocumentRequest, GenerateDocumentResponse
from typing import Optional
from ai_interface import ProviderFactory
from prompts import (
    SYSTEM_PROMPT_JOB_ANALYZER,
    SYSTEM_PROMPT_CV_GENERATOR,
    SYSTEM_PROMPT_COVER_LETTER_GENERATOR,
    SYSTEM_PROMPT_EMAIL_GENERATOR
)
from tools import JSONParser

router = APIRouter(prefix="/api", tags=["ai"])


def _get_provider(provider_name: str, api_key: Optional[str] = None, api_base: Optional[str] = None, model_name: Optional[str] = None):
    try:
        return ProviderFactory.get_provider(
            provider_name.value if hasattr(provider_name, 'value') else provider_name,
            api_key=api_key,
            api_base=api_base,
            model_name=model_name
        )
    except (ValueError, ImportError) as e:
        raise HTTPException(status_code=400, detail=f"Provider error: {str(e)}")


@router.post("/ai/generate", response_model=AIResponse)
async def generate_ai_response(request: AIRequest):
    """
    Generate an AI response using the specified provider.
    
    Acts as a proxy to hide API keys from the frontend.
    """
    try:
        provider = _get_provider(
            request.provider,
            api_key=request.api_key,
            api_base=request.api_base,
            model_name=request.model
        )
        
        response = provider.generate_response(
            system_prompt=request.system_prompt,
            user_prompt=request.user_prompt,
            model=request.model
        )
        
        return AIResponse(
            content=response,
            provider=request.provider.value if hasattr(request.provider, 'value') else request.provider,
            model=request.model
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation error: {str(e)}"
        )


@router.post("/ai/analyze-job", response_model=JobAnalysisResponse)
async def analyze_job_posting(request: JobAnalysisRequest):
    """
    Analyze a job posting to extract key information and fit assessment.
    
    Uses the JOB_ANALYZER prompt to parse and analyze job requirements.
    """
    try:
        provider = _get_provider(
            request.provider,
            api_key=request.api_key,
            model_name=request.model
        )
        
        raw_response = provider.generate_response(
            system_prompt=SYSTEM_PROMPT_JOB_ANALYZER,
            user_prompt=request.job_text
        )
        
        # Parse the JSON response
        analysis = JSONParser.parse(raw_response)
        
        return JobAnalysisResponse(
            analysis=analysis,
            raw_response=raw_response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Job analysis error: {str(e)}"
        )


@router.post("/ai/generate-cv", response_model=GenerateDocumentResponse)
async def generate_cv(request: GenerateDocumentRequest):
    try:
        if request.document_type != "cv":
            raise HTTPException(status_code=400, detail="Expected document_type='cv'")
        
        provider = _get_provider(
            request.provider,
            api_key=request.api_key,
            model_name=request.model
        )
        
        # Build the prompt
        prompt_parts = []
        
        if request.template:
            prompt_parts.append(f"LaTeX Template:\n{request.template}\n\n")
        
        prompt_parts.append(f"Candidate Profile:\n{request.candidate_profile}\n\n")
        prompt_parts.append(f"Job Analysis:\n{request.job_analysis}\n")
        
        if request.babel_language:
            prompt_parts.append(f"Babel Language: {request.babel_language}\n")
        
        if request.tone_guide:
            prompt_parts.append(f"\nTone and Style Guide:\n{request.tone_guide}\n")
        
        user_prompt = "\n".join(prompt_parts)
        
        raw_response = provider.generate_response(
            system_prompt=SYSTEM_PROMPT_CV_GENERATOR,
            user_prompt=user_prompt
        )
        
        # Extract clean LaTeX
        import re
        latex_match = re.search(r'```latex\s*(.*?)\s*```', raw_response, re.DOTALL)
        if latex_match:
            latex = latex_match.group(1).strip()
        else:
            # Try to find document structure
            doc_match = re.search(r'\\documentclass.*?\\end{document}', raw_response, re.DOTALL)
            latex = doc_match.group(0).strip() if doc_match else raw_response.strip()
        
        return GenerateDocumentResponse(
            latex=latex,
            document_type="cv",
            success=True
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"CV generation error: {str(e)}"
        )


@router.post("/ai/generate-cover-letter", response_model=GenerateDocumentResponse)
async def generate_cover_letter(request: GenerateDocumentRequest):
    """
    Generate Cover Letter LaTeX content based on job analysis and candidate profile.
    """
    try:
        if request.document_type != "cover_letter":
            raise HTTPException(status_code=400, detail="Expected document_type='cover_letter'")
        
        provider = _get_provider(
            request.provider,
            api_key=request.api_key,
            model_name=request.model
        )
        
        # Build the prompt
        prompt_parts = []
        
        if request.template:
            prompt_parts.append(f"LaTeX Template:\n{request.template}\n\n")
        
        prompt_parts.append(f"Candidate Profile:\n{request.candidate_profile}\n\n")
        prompt_parts.append(f"Job Analysis:\n{request.job_analysis}\n")
        
        if request.babel_language:
            prompt_parts.append(f"Babel Language: {request.babel_language}\n")
        
        if request.tone_guide:
            prompt_parts.append(f"\nTone and Style Guide:\n{request.tone_guide}\n")
        
        user_prompt = "\n".join(prompt_parts)
        
        raw_response = provider.generate_response(
            system_prompt=SYSTEM_PROMPT_COVER_LETTER_GENERATOR,
            user_prompt=user_prompt
        )
        
        # Extract clean LaTeX
        import re
        latex_match = re.search(r'```latex\s*(.*?)\s*```', raw_response, re.DOTALL)
        if latex_match:
            latex = latex_match.group(1).strip()
        else:
            doc_match = re.search(r'\\documentclass.*?\\end{document}', raw_response, re.DOTALL)
            latex = doc_match.group(0).strip() if doc_match else raw_response.strip()
        
        return GenerateDocumentResponse(
            latex=latex,
            document_type="cover_letter",
            success=True
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cover letter generation error: {str(e)}"
        )


@router.post("/ai/generate-email", response_model=GenerateDocumentResponse)
async def generate_email(request: GenerateDocumentRequest):
    """
    Generate email content based on job analysis and candidate profile.
    """
    try:
        if request.document_type != "email":
            raise HTTPException(status_code=400, detail="Expected document_type='email'")
        
        provider = _get_provider(
            request.provider,
            api_key=request.api_key,
            model_name=request.model
        )
        
        # Build the prompt
        prompt_parts = []
        prompt_parts.append(f"Job Analysis:\n{request.job_analysis}\n\n")
        prompt_parts.append(f"Candidate Profile:\n{request.candidate_profile}\n")
        
        if request.tone_guide:
            prompt_parts.append(f"\nTone and Style Guide:\n{request.tone_guide}\n")
        
        user_prompt = "\n".join(prompt_parts)
        
        raw_response = provider.generate_response(
            system_prompt=SYSTEM_PROMPT_EMAIL_GENERATOR,
            user_prompt=user_prompt
        )
        
        # Parse JSON response
        email_data = JSONParser.parse(raw_response)
        
        return GenerateDocumentResponse(
            content=raw_response,
            document_type="email",
            success=True
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Email generation error: {str(e)}"
        )
