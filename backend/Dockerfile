FROM python:3.10-slim

# Install system utilities & bioinformatics tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    hisat2 \
    samtools \
    subread \
    fastqc \
    ncbi-entrez-direct \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
