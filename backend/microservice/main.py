import os
import sys
import json
import warnings

import torch
import librosa
import numpy as np
from transformers import pipeline

os.environ["TF_CPP_MIN_LOG_LEVEL"]    = "3"
os.environ["TRANSFORMERS_NO_TF"]      = "1"
os.environ["HF_HUB_DISABLE_IMAGE_PROCESSING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"]  = "error"
warnings.filterwarnings("ignore")

torch.set_num_threads(os.cpu_count())

SAMPLE_RATE = 16_000
WINDOW_S    = 3
STRIDE_S    = WINDOW_S/2
BATCH_SIZE  = 8

model_vad, utils_vad = torch.hub.load(
    'snakers4/silero-vad', 'silero_vad', trust_repo=True, force_reload=False
)
(get_speech_timestamps, _, _, _, _) = utils_vad

MODELS = {
    "wav2vec2": "MelodyMachine/Deepfake-audio-detection-V2",
    "wavlm":     "DavidCombei/wavLM-base-Deepfake_V2",
}
PIPELINES = {
    name: pipeline(
        task="audio-classification",
        model=mid,
        framework="pt",
        device=-1,
        batch_size=BATCH_SIZE,
    )
    for name, mid in MODELS.items()
}


def load_audio(path, sr=SAMPLE_RATE):
    wav, _ = librosa.load(path, sr=sr, mono=True)
    return wav / np.max(np.abs(wav), initial=1e-9)


def get_speech_segments(wav, sr=SAMPLE_RATE):
    wav_t = torch.from_numpy(wav).float()
    timestamps = get_speech_timestamps(wav_t, model_vad, sampling_rate=sr)
    return [(ts["start"]/sr, ts["end"]/sr) for ts in timestamps]


def chunk_segment(start, end):
    t = start
    while t < end:
        t1 = min(end, t + WINDOW_S)
        yield t, t1
        t += STRIDE_S


def infer_on_chunks(audio_path):
    wav = load_audio(audio_path)
    segs = get_speech_segments(wav)
    if not segs:
        raise RuntimeError("No speech detected in audio.")

    snippets = []
    for t0, t1 in [c for s in segs for c in chunk_segment(*s)]:
        arr = wav[int(t0 * SAMPLE_RATE): int(t1 * SAMPLE_RATE)]
        if len(arr) < WINDOW_S * SAMPLE_RATE:
            pad = int(WINDOW_S*SAMPLE_RATE) - len(arr)
            arr = np.pad(arr, (0, pad))
        snippets.append({"array": arr, "sampling_rate": SAMPLE_RATE})

    per_model_scores = {}
    for name, pipe in PIPELINES.items():
        outs = pipe(snippets, top_k=2)
        scores = [ next((d["score"] for d in o if d["label"].upper()=="FAKE"), 0.0)
                   for o in outs ]
        per_model_scores[name] = float(np.mean(scores))

    avg_fusion = sum(per_model_scores.values()) / len(per_model_scores)
    votes = sum(1 for s in per_model_scores.values() if s > 0.5)
    maj_vote = votes > len(per_model_scores)/2

    label = "AI-generated" if maj_vote else "Human"
    return {"label": label,
            "probability": avg_fusion,
            "per_model": per_model_scores}


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <audio.wav>", file=sys.stderr)
        sys.exit(1)
    res = infer_on_chunks(sys.argv[1])
    sys.stdout.write(json.dumps(res))


if __name__ == "__main__":
    main()