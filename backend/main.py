from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import uuid
import torch
from TTS.api import TTS
import time

# Auto-agree to Coqui TOS
os.environ["COQUI_TOS_AGREED"] = "1"

app = FastAPI()

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
STORAGE_DIR = "../storage"
AUDIO_DIR = os.path.join(STORAGE_DIR, "audio")
METADATA_DIR = os.path.join(STORAGE_DIR, "metadata")

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)

# Initialize TTS Model (Lazy loading or pre-load)
# We'll use XTTS v2 as it's best for Hindi and emotional range
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Globally store the model to avoid re-loading
tts_instance = None

def get_tts():
    global tts_instance
    if tts_instance is None:
        print("Loading XTTS v2 model (this may take a while on first run)...")
        tts_instance = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    return tts_instance

class StorySegment(BaseModel):
    character: str
    text: str
    emotion: str = "Neutral" # Happy, Sad, Angry, etc.
    background_effect: Optional[str] = None

class StoryRequest(BaseModel):
    title: str
    segments: List[StorySegment]

@app.get("/")
def read_root():
    return {"status": "AI Story Admin Backend Running"}

@app.post("/generate-story")
async def generate_story(request: StoryRequest, background_tasks: BackgroundTasks):
    story_id = str(uuid.uuid4())
    
    # Save initial metadata with "processing" status
    metadata = {
        "id": story_id,
        "title": request.title,
        "status": "processing",
        "created_at": time.time(),
        "segments": [s.model_dump() for s in request.segments],
        "audio_files": []
    }
    
    with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "w") as f:
        json.dump(metadata, f)
    
    # Process in background
    background_tasks.add_task(process_tts, story_id, request)
    
    return {"story_id": story_id, "message": "Generation started"}

def process_tts(story_id: str, request: StoryRequest):
    tts = get_tts()
    output_files = []
    
    try:
        for i, segment in enumerate(request.segments):
            # Real-time update for each part
            with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "r") as f:
                metadata = json.load(f)
            metadata["status"] = f"Generating part {i+1}/{len(request.segments)}"
            with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "w") as f:
                json.dump(metadata, f)

            filename = f"{story_id}_part_{i}.wav"
            filepath = os.path.join(AUDIO_DIR, filename)
            
            tts.tts_to_file(
                text=segment.text,
                speaker="Ana Elizabet",
                language="hi",
                file_path=filepath
            )
            output_files.append({"part": i, "file": filename, "character": segment.character})

            # Save progress after each file
            with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "r") as f:
                update_meta = json.load(f)
            update_meta["audio_files"] = output_files
            with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "w") as f:
                json.dump(update_meta, f)

        # Update metadata to "completed"
        with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "r") as f:
            metadata = json.load(f)
        
        metadata["status"] = "completed"
        metadata["audio_files"] = output_files
        
        with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "w") as f:
            json.dump(metadata, f)
            
    except Exception as e:
        print(f"Error generating TTS: {e}")
        with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "r") as f:
            metadata = json.load(f)
        metadata["status"] = "failed"
        metadata["error"] = str(e)
        with open(os.path.join(METADATA_DIR, f"{story_id}.json"), "w") as f:
            json.dump(metadata, f)

@app.get("/stories")
def list_stories():
    stories = []
    for filename in os.listdir(METADATA_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(METADATA_DIR, filename), "r") as f:
                stories.append(json.load(f))
    return sorted(stories, key=lambda x: x['created_at'], reverse=True)

@app.get("/story/{story_id}")
def get_story(story_id: str):
    path = os.path.join(METADATA_DIR, f"{story_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Story not found")
    with open(path, "r") as f:
        return json.load(f)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
