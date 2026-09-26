import asyncio
from pathlib import Path
from fastapi import WebSocket, WebSocketDisconnect
from app.config import settings

class LogStreamer:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.log_path = settings.DATA_DIR / job_id / "execution.log"

    async def stream_logs(self, websocket: WebSocket):
        await websocket.accept()
        
        # Wait for execution.log to be created if job just started
        retry_count = 0
        while not self.log_path.exists() and retry_count < 30:
            await asyncio.sleep(1)
            retry_count += 1

        if not self.log_path.exists():
            await websocket.send_text("[ERROR] Log file not found. Job may not have started.")
            await websocket.close()
            return

        try:
            with open(self.log_path, "r") as f:
                # Send existing log history first
                for line in f:
                    await websocket.send_text(line.strip())

                # Tail file continuously for new lines
                while True:
                    line = f.readline()
                    if line:
                        await websocket.send_text(line.strip())
                    else:
                        await asyncio.sleep(0.5)
        except WebSocketDisconnect:
            print(f"[WebSocket] Client disconnected from log stream for job {self.job_id}")
        except Exception as e:
            try:
                await websocket.send_text(f"[ERROR] WebSocket stream error: {str(e)}")
                await websocket.close()
            except Exception:
                pass
