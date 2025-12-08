#CNN_MASTER.PY
import time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import types
import sounddevice as sd
import sys
import os
import json
import re
from collections import deque

sys.path.append("/home/pi/Desktop/ia/audioset_tagging_cnn/pytorch") # IMPORTANTE: cambiar a la ubicacion del repo

from models import Cnn10

# --- CONFIGURATION ---
SAMPLE_RATE = 16000
DURATION = 5.0
MODEL_PATH = "/home/pi/Desktop/ia/best_model.pth"  # IMPORTANTE: cambiar a la ubicacion de los pesos
MIC_DEVICE_ID = 1

CONFIDENCE_THRESHOLD = 0.75
WINDOW_SIZE = 5
TRIGGER_COUNT = 3
MEM_FILE = '/dev/shm/data_cnn.json'

# --- 0. HELPER FUNCTION: SAVE TO RAM ---
def save_to_ram(line_text):
    """
    Parses the CNN output line and saves it to RAM for the LoRa Master.
    """
    data = {
        "status": "SAFE",
        "conf": 0.0,
        "db": 0.0,
        "timestamp": time.time()
    }

    # 1. Determine Status
    if "DANGER" in line_text:
        data["status"] = "DANGER"
    else:
        data["status"] = "SAFE" # Includes "Warning" and "SAFE"

    # 2. Extract dB Level (Matches "Lvl: 30.1 dB")
    db_match = re.search(r'Lvl: ([\d\.]+) dB', line_text)
    if db_match:
        data["db"] = float(db_match.group(1))

    # 3. Extract Confidence (Matches "Conf: 0.98" inside "Last Conf" or "Conf")
    conf_match = re.search(r'Conf: ([\d\.]+)', line_text)
    if conf_match:
        data["conf"] = float(conf_match.group(1))

    # 4. Save to Shared Memory
    try:
        with open(MEM_FILE, 'w') as f:
            json.dump(data, f)
    except:
        pass # Ignore if file is busy

# --- 1. MODEL DEFINITIONS ---
def binary_forward(self, input, mixup_lambda=None):
    x = self.spectrogram_extractor(input)
    x = self.logmel_extractor(x)
    x = x.transpose(1, 3)
    x = self.bn0(x)
    x = x.transpose(1, 3)
    x = self.conv_block1(x, pool_size=(2, 2), pool_type='avg')
    x = F.dropout(x, p=0.2, training=self.training)
    x = self.conv_block2(x, pool_size=(2, 2), pool_type='avg')
    x = F.dropout(x, p=0.2, training=self.training)
    x = self.conv_block3(x, pool_size=(2, 2), pool_type='avg')
    x = F.dropout(x, p=0.2, training=self.training)
    x = self.conv_block4(x, pool_size=(2, 2), pool_type='avg')
    x = F.dropout(x, p=0.2, training=self.training)
    x = torch.mean(x, dim=3)
    (x1, _) = torch.max(x, dim=2)
    x2 = torch.mean(x, dim=2)
    x = x1 + x2
    x = F.relu_(self.fc1(x))
    embedding = F.dropout(x, p=0.5, training=self.training)
    logits = self.fc_audioset(x)
    return logits

print("Initializing Model...")
device = torch.device('cpu')
model = Cnn10(sample_rate=16000, window_size=1024, hop_size=320, mel_bins=64, fmin=50, fmax=8000, classes_num=527)
model.forward = types.MethodType(binary_forward, model)
model.fc_audioset = nn.Sequential(nn.Dropout(0.5), nn.Linear(512, 2))

try:
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    state_dict = checkpoint['model'] if 'model' in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    print("Weights Loaded.")
except Exception as e:
    print(f"Error loading weights: {e}")
    sys.exit(1)

model.to(device)
model.eval()

# --- 2. INITIALIZE HISTORY BUFFER ---
history = deque(maxlen=WINDOW_SIZE)

# --- 3. THE AUDIO CALLBACK ---
def audio_callback(indata, frames, time_info, status):
    if status:
        print(f"Audio Error: {status}")

    audio_data = indata.flatten()

    rms = np.sqrt(np.mean(audio_data**2))
    db_level = 20 * np.log10(rms + 1e-9)
    db_level = max(0, 50 + db_level)

    input_tensor = torch.from_numpy(audio_data).float().unsqueeze(0).to(device)

    # --- INFERENCE ---
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits, dim=1)

    safe_prob = probs[0][0].item()
    danger_prob = probs[0][1].item()

    timestamp = time.strftime("%H:%M:%S")

    # --- LOGIC ---
    # 1. Determine local result based on stricter threshold
    is_danger = 1 if danger_prob > CONFIDENCE_THRESHOLD else 0
    history.append(is_danger)
    danger_count = sum(history)

    output_text = ""

    if danger_count >= TRIGGER_COUNT:
        output_text = f"[{timestamp}] DANGER (Detections: {danger_count}/{WINDOW_SIZE} | Last Conf: {danger_prob:.2f} | Lvl: {db_level:.1f} dB)"
    elif is_danger:
        output_text = f"[{timestamp}] Warning... Accumulating ({danger_count}/{WINDOW_SIZE} | Lvl: {db_level:.1f} dB)"
    else:
        output_text = f"[{timestamp}] SAFE (Conf: {safe_prob:.2f} | Lvl: {db_level:.1f} dB)"

    # Print to terminal
    print(output_text, flush=True)

    # Save to RAM for LoRa Master
    save_to_ram(output_text)

# --- 4. MAIN EXECUTION LOOP ---
print(f"Forest Guard Active on Device {MIC_DEVICE_ID} (USB).")
print(f"Target Rate: {SAMPLE_RATE}Hz")
print("Press Ctrl+C to stop.")

try:
    with sd.InputStream(device=MIC_DEVICE_ID,
                        callback=audio_callback,
                        channels=1,
                        samplerate=SAMPLE_RATE,
                        blocksize=int(SAMPLE_RATE * DURATION)):

        while True:
            sd.sleep(1000)

except KeyboardInterrupt:
    print("\nStopping.")
except Exception as e:
    print(f"\nError: {e}")