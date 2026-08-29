"""
Local Whisper Worker

Standalone FastAPI server for audio transcription using faster-whisper.
Runs as an independent process — never inside Next.js.

Architecture:
  Browser → Next.js API route → This worker → transcript

Configuration via environment variables (see config below).
"""

import os
import sys
import io
import time
import tempfile
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

# ── Configuration ────────────────────────────────────────────────────────────

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small.en")
WHISPER_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "en")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "auto")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "auto")
WHISPER_MAX_AUDIO_SECONDS = int(os.environ.get("WHISPER_MAX_AUDIO_SECONDS", "900"))
WHISPER_MAX_CONCURRENT_JOBS = int(os.environ.get("WHISPER_MAX_CONCURRENT_JOBS", "1"))
WHISPER_HOST = os.environ.get("WHISPER_HOST", "127.0.0.1")
WHISPER_PORT = int(os.environ.get("WHISPER_PORT", "8787"))
WHISPER_DEBUG = os.environ.get("WHISPER_DEBUG", "false").lower() == "true"

def log(msg):
    print(f"[Whisper Worker] {msg}", file=sys.stderr, flush=True)

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="Local Whisper Worker", version="1.0.0")

# ── State ────────────────────────────────────────────────────────────────────

model = None
model_lock = asyncio.Semaphore(WHISPER_MAX_CONCURRENT_JOBS)
model_loaded = False

def load_model():
    global model, model_loaded
    try:
        from faster_whisper import WhisperModel

        log(f"Loading model: {WHISPER_MODEL} (device={WHISPER_DEVICE}, compute={WHISPER_COMPUTE_TYPE})")
        start = time.time()

        model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )

        elapsed = time.time() - start
        log(f"Model loaded in {elapsed:.1f}s")
        model_loaded = True
    except ImportError:
        log("ERROR: faster-whisper not installed. Run: pip install faster-whisper")
        model_loaded = False
    except Exception as e:
        log(f"ERROR: Failed to load model: {e}")
        model_loaded = False

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    load_model()

@app.get("/health")
async def health():
    return {
        "online": True,
        "modelLoaded": model_loaded,
        "model": WHISPER_MODEL,
        "device": WHISPER_DEVICE,
        "queueAvailable": model_lock._value > 0 if hasattr(model_lock, '_value') else True,
        "maxConcurrentJobs": WHISPER_MAX_CONCURRENT_JOBS,
    }

@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=WHISPER_LANGUAGE),
    sessionId: Optional[str] = Form(default=None),
    questionId: Optional[str] = Form(default=None),
):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Whisper model not loaded")

    # Read audio
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data provided")

    # Check size (rough estimate: 32kbps * seconds)
    max_bytes = WHISPER_MAX_AUDIO_SECONDS * 32000 // 8  # ~4MB per 1000s at 32kbps
    if len(audio_bytes) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Audio too large (max {WHISPER_MAX_AUDIO_SECONDS}s)")

    # Transcribe
    start_time = time.time()
    try:
        async with model_lock:
            # Write to temp file (faster-whisper needs a file path)
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                segments, info = model.transcribe(
                    tmp_path,
                    language=language,
                    beam_size=5,
                    vad_filter=True,
                    vad_parameters=dict(
                        min_silence_duration_ms=500,
                        speech_pad_ms=200,
                    ),
                )

                # Collect all segments
                text_parts = []
                for segment in segments:
                    text_parts.append(segment.text.strip())
                    if WHISPER_DEBUG:
                        log(f"  [{segment.start:.1f}s -> {segment.end:.1f}s] {segment.text}")

                full_text = " ".join(text_parts)
                duration_ms = int((time.time() - start_time) * 1000)

                log(f"Transcribed {len(audio_bytes)} bytes in {duration_ms}ms → {len(full_text)} chars")

                return JSONResponse({
                    "success": True,
                    "text": full_text,
                    "language": info.language,
                    "durationMs": duration_ms,
                    "provider": "local_whisper",
                })
            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp_path)
                except:
                    pass

    except Exception as e:
        log(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log(f"Starting Whisper worker on {WHISPER_HOST}:{WHISPER_PORT}")
    log(f"Model: {WHISPER_MODEL}, Language: {WHISPER_LANGUAGE}")
    log(f"Max concurrent jobs: {WHISPER_MAX_CONCURRENT_JOBS}")
    uvicorn.run(app, host=WHISPER_HOST, port=WHISPER_PORT, log_level="info")
