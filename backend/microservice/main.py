import os
import sys
import json
import warnings

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_NO_TF"] = "1"
os.environ["HF_HUB_DISABLE_IMAGE_PROCESSING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
warnings.filterwarnings("ignore")

import librosa
import webrtcvad
import numpy as np
from transformers import pipeline

MODELS        = ["MelodyMachine/Deepfake-audio-detection-V2"]
SAMPLE_RATE   = 16_000
VAD_FRAME_MS  = 30
VAD_AGGRESSIVENESS = 2
WINDOW_S      = 10
STRIDE_S      = 2
BATCH_SIZE    = 8


def load_audio(path, sr=SAMPLE_RATE):
    wav, _ = librosa.load(path, sr=sr, mono=True)
    return wav / np.max(np.abs(wav), initial=1e-9)


def get_speech_segments(wav, sr):
    vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)
    frame_len = int(sr * VAD_FRAME_MS / 1000)
    frames = [wav[i : i + frame_len] for i in range(0, len(wav), frame_len)]
    speech_idxs = []
    for idx, frame in enumerate(frames):
        pcm = (frame * 32768).astype(np.int16).tobytes()
        if len(pcm) < frame_len * 2:
            break
        if vad.is_speech(pcm, sr):
            speech_idxs.append(idx)

    runs = []
    start = prev = None
    for idx in speech_idxs:
        if start is None:
            start = idx
        elif idx - prev > 1:
            runs.append((start, prev))
            start = idx
        prev = idx
    if start is not None:
        runs.append((start, prev))

    seg_times = []
    for s, e in runs:
        t0 = s * frame_len / sr
        t1 = (e + 1) * frame_len / sr
        seg_times.append((t0, t1))
    return seg_times


def chunk_segment(start, end):
    t = start
    while t < end:
        yield t, min(end, t + WINDOW_S)
        t += (WINDOW_S - STRIDE_S)


def infer_on_chunks(audio_path):
    wav = load_audio(audio_path)
    segments = get_speech_segments(wav, SAMPLE_RATE)
    if not segments:
        raise RuntimeError("No speech detected in audio.")

    pipe = pipeline(
        task="audio-classification",
        model=MODELS[0],
        framework="pt",
        device=-1,
        batch_size=BATCH_SIZE,
    )

    real_scores = []
    fake_scores = []

    snippets = []
    for seg_start, seg_end in segments:
        for t0, t1 in chunk_segment(seg_start, seg_end):
            arr = wav[int(t0 * SAMPLE_RATE) : int(t1 * SAMPLE_RATE)]
            if len(arr) < WINDOW_S * SAMPLE_RATE:
                pad = int(WINDOW_S * SAMPLE_RATE) - len(arr)
                arr = np.pad(arr, (0, pad))
            snippets.append({"array": arr, "sampling_rate": SAMPLE_RATE})

    outputs = pipe(snippets, top_k=2)

    for out in outputs:
        scores = {d["label"].upper(): d["score"] for d in out}
        real_scores.append(scores.get("REAL", 0.0))
        fake_scores.append(scores.get("FAKE", 0.0))

    real_scores = np.array(real_scores)
    fake_scores = np.array(fake_scores)

    avg_real_all = float(real_scores.mean())
    avg_fake_all = float(fake_scores.mean())

    label = "AI-generated" if avg_fake_all > avg_real_all else "Human"
    probability = max(avg_fake_all, avg_real_all)

    return {
        "label": label,
        "probability": probability,
    }


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <audio.wav>", file=sys.stderr)
        sys.exit(1)

    result = infer_on_chunks(sys.argv[1])
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()