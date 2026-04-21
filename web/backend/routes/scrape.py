import sys
import os

# Add src to path - calculate absolute path to repo root/src
# From web/backend/routes/: ../../../ = repo root
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
src_path = os.path.join(REPO_ROOT, 'src')
if os.path.exists(src_path):
    sys.path.append(src_path)

from fastapi import APIRouter, HTTPException
from models import ScrapeRequest, ScrapeResponse
from tools import WebScraper

router = APIRouter(prefix="/api", tags=["scrape"])


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_job_posting(request: ScrapeRequest):
    try:
        text = WebScraper.get_page_content(request.url)
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to extract content from URL: {request.url}"
            )
        
        return ScrapeResponse(text=text, url=request.url)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping URL: {str(e)}"
        )
