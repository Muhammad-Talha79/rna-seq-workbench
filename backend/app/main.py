from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(
    title="RNA-seq Workbench API",
    version="1.0.0",
    description="Backend API for RNA-seq analysis, QC, differential expression, and pathway enrichment."
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints under /api/v1/pipeline
app.include_router(api_v1_router, prefix="/api/v1/pipeline", tags=["pipeline"])

@app.get("/")
async def root():
    return {"message": "RNA-seq Workbench API Operational", "status": "active"}
