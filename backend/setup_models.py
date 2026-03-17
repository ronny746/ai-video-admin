import torch
from TTS.api import TTS
import os

def setup():
    print("Pre-downloading models for offline/VPS usage...")
    # This will trigger the download and agreement for XTTS v2
    # XTTS v2 requires agreement to terms of use
    os.environ["COQUI_TOS_AGREED"] = "1"
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Target device: {device}")
    
    try:
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        print("Success: XTTS v2 model downloaded and loaded.")
    except Exception as e:
        print(f"Error downloading model: {e}")

if __name__ == "__main__":
    setup()
