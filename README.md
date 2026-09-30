# 🧬 RNA-Seq Transcriptomics & Single-Cell Workbench

A production-grade, containerized bioinformatics web application designed for end-to-end transcriptomics data processing, visualization, and interactive AI guidance. Built with a **FastAPI** microservice backend, an asynchronous **Scanpy** processing engine, a **Vite + React** dashboard, and an integrated **AI Assistant Chatbot**.

---

## 🌟 Key Features

### 1. 🚀 Bulk RNA-Seq Pipeline Launcher

* **NCBI SRA Data Retrieval:** Enter any public SRA Accession number (e.g., `SRR3734796`) to trigger sequence fetching (`fastq-dump`).
* **Alignment & Quantification Simulation:** Orchestrates `HISAT2` genome alignment, `SAMtools` coordinate sorting, and `featureCounts` exon quantification.
* **Live Web Socket / Polling Terminal Stream:** Streams real-time stdout logs directly to an embedded terminal interface in the React dashboard.
* **Quality Control Integration:** Generates dynamic, styled **FastQC** HTML summary reports featuring total read counts, GC content, and alignment efficiency metrics.

### 2. 📊 DESeq2 DEG Visualizer & MultiQC Reports

* **Differential Expression Analysis:** Input `Control Job ID` vs. `Treated Job ID` to perform differential expression metrics calculation.
* **Interactive DEG Table:** Search, filter, and inspect gene expression changes ($log_2\text{ Fold Change}$, base mean, $p$-values) with significance status badges (`UP`, `DOWN`, `NS`).
* **MultiQC Summaries:** Open standalone, styled HTML reports outlining genome-wide differential expression statistics.

### 3. 🔬 Single-Cell UMAP Cluster Engine

* **Scanpy Integration:** Preprocesses single-cell PBMC datasets directly inside the Python backend.
* **Leiden Clustering:** Computes high-dimensional principal component analysis (PCA), builds neighbor connectivity graphs, and partitions single cells into distinct biological clusters via `leidenalg` / `python-igraph`.
* **Interactive 2D Canvas Plot:** Renders an interactive SVG scatter plot displaying cell embeddings with cluster legends and coordinate distributions.

### 4. 🤖 AI Assistant Chatbot

* **Context-Aware Guidance:** Integrated floating widget providing real-time, multi-line interactive walkthroughs.
* **User Onboarding:** Answers technical questions regarding SRA accession pipeline execution, DESeq2 comparative setup, single-cell analysis, and FastQC inspection.

---

## 🛠️ Tech Stack & Architecture

```
                       ┌────────────────────────────────────────┐
                       │           Vite + React Dashboard       │
                       │             (Port :5173)               │
                       └───────────────────┬────────────────────┘
                                           │
                                     HTTP / REST API
                                           │
                       ┌───────────────────▼────────────────────┐
                       │             FastAPI Backend            │
                       │             (Port :8000)               │
                       └─────────┬───────────────────┬──────────┘
                                 │                   │
            ┌────────────────────▼─────┐       ┌─────▼───────────────────┐
            │   Bulk Alignment Pipeline│       │ Single-Cell Engine      │
            │ (SRA/HISAT2/featureCounts│       │(Scanpy/AnnData/Leiden)  │
            └──────────────────────────┘       └─────────────────────────┘

```

* **Frontend:** React, Vite, Axios, SVG Data Visualization.
* **Backend:** Python 3.10, FastAPI, Uvicorn, Asyncio, Pydantic, NumPy, Pandas.
* **Bioinformatics Engine:** Scanpy, AnnData, `leidenalg`, `python-igraph`.
* **Containerization & CI/CD:** Docker, Docker Compose (`node:20-alpine`, `python:3.10-slim`), GitHub Actions (Pytest execution suite).

---

## 🚀 Quickstart with Docker Compose

The entire stack is containerized for seamless deployment across Linux, macOS, and Windows (via WSL2).

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20.10 or higher) with Docker Compose Enabled.

### Installation & Launch

1. **Clone the Repository:**
```bash
git clone https://github.com/Muhammad-Talha79/rna-seq-workbench.git
cd rna-seq-workbench

```


2. **Spin Up Containers:**
```bash
docker compose up --build -d

```


3. **Access the Workbench:**
* **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
* **FastAPI Interactive API Specs:** [http://localhost:8000/docs](http://localhost:8000/docs)


4. **Stop Containers:**
```bash
docker compose down

```



---

## 🧪 Local Environment Setup & Testing

If you prefer running the services outside Docker for local development:

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

```

### Run Test Suite

```bash
pytest tests -v

```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev

```

---

## 📖 Interactive Usage Guide

1. **Run a Bulk Pipeline:**
* Navigate to **Bulk Pipeline Launcher**.
* Enter an SRA Accession (e.g., `SRR3734796`), adjust CPU threads, and click **Execute Alignment & Counts**.
* Watch live terminal logs stream as reads are processed. Once status displays `COMPLETED`, click **Inspect FastQC Report**.


2. **Perform Differential Expression:**
* Enter `Control Job ID` and `Treated Job ID` under the **DESeq2** panel.
* Click **Run Differential Expression**, then switch to the **DESeq2 DEG Visualizer** tab to inspect the calculated fold changes and gene status badges.


3. **Explore Single-Cell Data:**
* Navigate to **Single-Cell UMAP**.
* Click **Run Single-Cell Analysis** to process 200 cells across 1,800+ genes, rendering a multi-cluster UMAP embedding plot.


4. **Ask the AI Assistant:**
* Click the **💬 Help Assistant** button in the bottom-right corner to open the walkthrough assistant for step-by-step guidance.



---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.
