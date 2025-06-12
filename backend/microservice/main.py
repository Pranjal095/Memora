import os
import sys
import json
import warnings

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_NO_TF"]   = "1"
os.environ["HF_HUB_DISABLE_IMAGE_PROCESSING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TRANSFORMERS_VERBOSITY_OPTIMIZED"] = "error"

warnings.filterwarnings("ignore")

from transformers import pipeline

def main():
    audio_path = sys.argv[1]

    clf = pipeline(
        task="audio-classification",
        model="MelodyMachine/Deepfake-audio-detection-V2",
        framework="pt",
        device=-1,
        chunk_length_s=30,
        chunk_stride_s=5
    )
    outputs = clf(audio_path)

    fake_scores = []
    real_scores = []
    for o in outputs:
        lbl = o["label"].lower()
        sc  = o["score"]
        if lbl == "fake":
            fake_scores.append(sc)
        elif lbl == "real":
            real_scores.append(sc)
        else:
            continue

    if fake_scores:
        label       = "AI-generated"
        probability = max(fake_scores)
    else:
        label       = "Human"
        probability = max(real_scores) if real_scores else 0.0

    sys.stdout.write(json.dumps({
        "label":       label,
        "probability": probability,
    }))

if __name__ == "__main__":
    main()