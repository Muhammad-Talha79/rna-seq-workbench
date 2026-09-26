import os
from pathlib import Path

class Settings:
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "jobs"
    REF_DIR: Path = BASE_DIR / "ref"
    
    HISAT2_INDEX_PREFIX: str = str(REF_DIR / "grch38_hisat2")
    GTF_PATH: str = str(REF_DIR / "Homo_sapiens.GRCh38.109.gtf")

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
