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

clip_model = SentenceTransformer("clip-ViT-L-14")

QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
COLLECTION = os.getenv("COLLECTION_NAME", "photos")
RESET_FLAG = os.getenv("RESET_PHOTOS_COLLECTION", "false").lower() == "true"

qdrant = QdrantClient(url=QDRANT_URL)

dummy_embedding = clip_model.encode("test", convert_to_numpy=True)
embedding_size = len(dummy_embedding)

vectors_config = {
    "size": embedding_size,
    "distance": "Cosine",
}

if RESET_FLAG:
    qdrant.recreate_collection(collection_name=COLLECTION, vectors_config=vectors_config)
else:
    try:
        qdrant.get_collection(collection_name=COLLECTION)
    except UnexpectedResponse:
        qdrant.create_collection(collection_name=COLLECTION, vectors_config=vectors_config)

count = qdrant.count(collection_name=COLLECTION).count
print(f"Qdrant collection {COLLECTION} has {count} points")

def create_multimodal_embedding(image, caption, note="", city=""):
    img_emb = clip_model.encode([image], convert_to_numpy=True)[0]
    
    text_parts = [caption]
    if note.strip():
        text_parts.append(note.strip())
    if city.strip():
        text_parts.append(f"location: {city.strip()}")
    
    combined_text = " | ".join(text_parts)
    text_emb = clip_model.encode([combined_text], convert_to_numpy=True)[0]
    
    combined = 0.7 * img_emb + 0.3 * text_emb
    
    return combined.tolist()

MIN_SIMILARITY = float(os.getenv("SEARCH_MIN_SIMILARITY", "0.0"))
K_RESULTS = int(os.getenv("K_RESULTS", "50"))

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    img_src = data["image_path"]
    note = data.get("note", "")
    city = data.get("city", "")
    point_id = data["id"]

    if img_src.startswith("http"):
        resp = requests.get(img_src)
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
    else:
        image = Image.open(img_src).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    out = blip.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)

    vect = create_multimodal_embedding(image, caption, note, city)

    payload = {
        "note": note,
        "caption": caption,
        "city": city,
    }

    qdrant.upsert(
        collection_name=COLLECTION,
        points=[{"id": point_id, "vector": vect, "payload": payload}],
    )
    return jsonify({"status": "ok"}), 200

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    k = int(request.args.get("k", "50"))

    text_embedding = clip_model.encode([query], convert_to_numpy=True)[0]
    qvec = text_embedding.tolist()

    query_filter = None

    resp = qdrant.search(
        collection_name=COLLECTION,
        query_vector=qvec,
        query_filter=query_filter,
        limit=k,
        with_payload=True,
        score_threshold=MIN_SIMILARITY,
    )

    hits = []
    for h in resp:
        print(h)
        hits.append({
            "id": h.id,
            "score": round(h.score, 4),
            "note": h.payload.get("note"),
            "caption": h.payload.get("caption"),
            "city": h.payload.get("city"),
        })
    
    return jsonify(hits[:10]), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)