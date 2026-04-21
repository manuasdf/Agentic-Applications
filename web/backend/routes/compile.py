import sys
import os
import tempfile
import base64
import subprocess

# Add src to path - calculate absolute path to repo root/src
# From web/backend/routes/: ../../../ = repo root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
src_path = os.path.join(REPO_ROOT, 'src')
if os.path.exists(src_path):
    sys.path.append(src_path)

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from models import CompileRequest, CompileResponse
from typing import Optional
import mimetypes

router = APIRouter(prefix="/api", tags=["compile"])


@router.post("/compile", response_model=CompileResponse)
async def compile_latex(request: CompileRequest):
    """
    Compile LaTeX source to PDF.
    
    Uses the existing PDFRenderer logic to compile LaTeX and returns PDF as base64.
    """
    try:
        # Create a temporary directory for compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write LaTeX to a temporary file
            tex_path = os.path.join(temp_dir, "document.tex")
            with open(tex_path, 'w', encoding='utf-8') as f:
                f.write(request.latex)
            
            # Compile using pdflatex
            cmd = ['pdflatex', '-interaction=nonstopmode', '-output-directory', temp_dir, tex_path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode != 0:
                stdout_text = result.stdout.decode('utf-8', errors='replace') if result.stdout else ""
                stderr_text = result.stderr.decode('utf-8', errors='replace') if result.stderr else ""
                error_msg = f"pdflatex compilation failed:\n{stdout_text}\n{stderr_text}"
                return CompileResponse(
                    pdf_base64="",
                    success=False,
                    error=error_msg
                )
            
            # Read the PDF file
            pdf_path = os.path.join(temp_dir, "document.pdf")
            if not os.path.exists(pdf_path):
                return CompileResponse(
                    pdf_base64="",
                    success=False,
                    error="PDF file not generated"
                )
            
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # Encode as base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            return CompileResponse(
                pdf_base64=pdf_base64,
                success=True,
                error=None
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Compilation error: {str(e)}"
        )


@router.post("/compile-raw", response_class=Response)
async def compile_latex_raw(request: CompileRequest):
    """
    Compile LaTeX source to PDF and return raw PDF bytes.
    
    Returns the PDF file directly for download.
    """
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            tex_path = os.path.join(temp_dir, "document.tex")
            with open(tex_path, 'w', encoding='utf-8') as f:
                f.write(request.latex)
            
            cmd = ['pdflatex', '-interaction=nonstopmode', '-output-directory', temp_dir, tex_path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode != 0:
                stdout_text = result.stdout.decode('utf-8', errors='replace') if result.stdout else ""
                stderr_text = result.stderr.decode('utf-8', errors='replace') if result.stderr else ""
                raise HTTPException(
                    status_code=400,
                    detail=f"Compilation failed:\n{stdout_text}\n{stderr_text}"
                )
            
            pdf_path = os.path.join(temp_dir, "document.pdf")
            if not os.path.exists(pdf_path):
                raise HTTPException(status_code=400, detail="PDF file not generated")
            
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # Return PDF with proper content type
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": "inline; filename=document.pdf"}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Compilation error: {str(e)}"
        )
