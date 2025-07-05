import os, io, requests
from flask import Flask, request, jsonify
from PIL import Image
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Filter, FieldCondition, MatchValue

app = Flask(__name__)

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
blip      = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
embedder  = SentenceTransformer("all-MiniLM-L6-v2")

QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6333")
COLLECTION = os.getenv("COLLECTION_NAME", "photos")
RESET_FLAG = os.getenv("RESET_PHOTOS_COLLECTION", "false").lower() == "true"

qdrant = QdrantClient(url=QDRANT_URL)

vectors_config = {
    "size":     embedder.get_sentence_embedding_dimension(),
    "distance": "Cosine",
}

if RESET_FLAG:
    qdrant.recreate_collection(collection_name=COLLECTION, vectors_config=vectors_config)
else:
    try:
        qdrant.get_collection(collection_name=COLLECTION)
    except UnexpectedResponse:
        qdrant.create_collection(collection_name=COLLECTION, vectors_config=vectors_config)

@app.route("/embed", methods=["POST"])
def embed():
    data     = request.json
    img_src  = data["image_path"]
    note     = data.get("note", "")
    point_id = data["id"]

    if img_src.startswith("http"):
        resp  = requests.get(img_src)
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
    else:
        image = Image.open(img_src).convert("RGB")

    inputs  = processor(images=image, return_tensors="pt")
    out     = blip.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)

    text    = f"{note} {caption}".strip()
    vect    = embedder.encode(text).tolist()
    payload = {"note": note, "caption": caption}

    qdrant.upsert(
        collection_name=COLLECTION,
        points=[{
            "id": point_id,
            "vector": vect,
            "payload": payload
        }],
    )
    return jsonify({"status": "ok"}), 200

@app.route("/search", methods=["GET"])
def search():
    query     = request.args.get("q", "").strip()
    limit     = int(request.args.get("k", "10"))
    threshold = float(os.getenv("SEARCH_THRESHOLD", "0.3"))

    hits = []
    if query:
        qvec = embedder.encode(query).tolist()

        text_filter = Filter(
            should=[
                FieldCondition(key="note",    match=MatchValue(value=query)),
                FieldCondition(key="caption", match=MatchValue(value=query)),
            ]
        )

        resp = qdrant.search(
            collection_name=COLLECTION,
            query_vector=qvec,
            limit=limit,
            with_payload=True,
            query_filter=text_filter
        )

        print(f"QUERY: {query}")
        for h in resp:
            print(
                f"  id={h.id:<5} score={h.score:.4f}"
                f"  note={h.payload['note']!r}"
                f"  caption={h.payload['caption']!r}"
            )

        for h in resp:
            if h.score <= threshold:
                hits.append({"id": h.id, "score": h.score, "payload": h.payload})

    return jsonify(hits), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)