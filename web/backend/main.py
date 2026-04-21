from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routes import scrape, ai, compile

# Create the FastAPI app
app = FastAPI(
    title="AutoCV API",
    description="API for AutoCV - AI-powered CV and Cover Letter Generator",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(scrape.router)
app.include_router(ai.router)
app.include_router(compile.router)

# Check if frontend is built and serve static files in production
frontend_dist = os.path.join(os.path.dirname(__file__), '../frontend/dist')
print(f"Checking for frontend at: {frontend_dist}")

if os.path.exists(frontend_dist):
    print(f"Serving static frontend from: {frontend_dist}")
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


# Root endpoint
@app.get("/api/")
async def root():
    return {
        "message": "AutoCV API",
        "docs": "/api/docs",
        "health": "ok"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
