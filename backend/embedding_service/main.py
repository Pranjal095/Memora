import os
import io
import requests
from flask import Flask, request, jsonify
from PIL import Image
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse

app = Flask(__name__)

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
blip = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
COLLECTION = os.getenv("COLLECTION_NAME", "photos")
RESET_FLAG = os.getenv("RESET_PHOTOS_COLLECTION", "true").lower() == "true"

qdrant = QdrantClient(url=QDRANT_URL)

vectors_config = {
    "size": embedder.get_sentence_embedding_dimension(),
    "distance": "Cosine",
}

if RESET_FLAG:
    qdrant.recreate_collection(collection_name=COLLECTION, vectors_config=vectors_config)
else:
    try:
        qdrant.get_collection(collection_name=COLLECTION)
    except UnexpectedResponse:
        qdrant.create_collection(collection_name=COLLECTION, vectors_config=vectors_config)

import numpy as np

def normalize(vec):
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr /= norm
    return arr.tolist()

MIN_SIMILARITY = float(os.getenv("SEARCH_MIN_SIMILARITY", "0.6"))

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    img_src = data["image_path"]
    note = data.get("note", "")
    point_id = data["id"]

    if img_src.startswith("http"):
        resp = requests.get(img_src)
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
    else:
        image = Image.open(img_src).convert("RGB")

    inputs = processor(
        images=image,
        return_tensors="pt",
    )
    out = blip.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)

    text = f"{note} {caption}".strip()
    vect = normalize(embedder.encode(text, convert_to_numpy=True))
    payload = {"note": note, "caption": caption}
    print(caption)

    qdrant.upsert(
        collection_name=COLLECTION,
        points=[{"id": point_id, "vector": vect, "payload": payload}],
    )
    return jsonify({"status": "ok"}), 200

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    k = int(request.args.get("k", "10"))

    raw_q = embedder.encode(query, convert_to_numpy=True)
    qvec = normalize(raw_q)

    resp = qdrant.search(
        collection_name=COLLECTION,
        query_vector=qvec,
        limit=k,
        with_payload=True,
    )

    hits = []
    for h in resp:
        print(h)
        if h.score >= MIN_SIMILARITY:
            hits.append({
                "id": h.id,
                "score": round(h.score, 4),
                "note": h.payload.get("note"),
                "caption": h.payload.get("caption"),
            })

    return jsonify(hits), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)