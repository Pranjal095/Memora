from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import tempfile
import shutil
# from transformers import AutoProcessor, AutoModelForAudioClassification
# import torch

app = FastAPI()

# processor = AutoProcessor.from_pretrained("MelodyMachine/Deepfake-audio-detection-V2")
# model = AutoModelForAudioClassification.from_pretrained("MelodyMachine/Deepfake-audio-detection-V2")

class DetectResponse(BaseModel):
    label: str
    probability: float

@app.post("/detect-audio", response_model=DetectResponse)
async def detect_audio(file: UploadFile = File(...)):
    if not file.filename.endswith((".wav", ".mp3")):
        raise HTTPException(status_code=400, detail="Unsupported format")

    # save to temp
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    contents = await file.read()
    tmp.write(contents)
    tmp.close()

    # TODO: load audio, preprocess, run model
    # inputs = processor(tmp.name, sampling_rate=16_000, return_tensors="pt")
    # with torch.no_grad():
    #   logits = model(**inputs).logits
    # prob = torch.softmax(logits, dim=1)[0,1].item()
    # label = "AI-generated" if prob > 0.5 else "human"

    # dummy:
    prob = 0.85
    label = "AI-generated"

    # cleanup
    shutil.os.remove(tmp.name)

    return {"label": label, "probability": prob}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)