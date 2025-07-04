from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from transformers import BlipProcessor, BlipForConditionalGeneration
from qdrant_client import QdrantClient
import torch

app = Flask(__name__)

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
blip = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

embedder = SentenceTransformer("all-MiniLM-L6-v2")

qdrant = QdrantClient(url="http://qdrant:6333")
qdrant.recreate_collection(
    collection_name="photos",
    vectors_config={"size": embedder.get_sentence_embedding_dimension(), "distance": "Cosine"},
)

@app.route("/embed", methods=["POST"])
def embed():
    data = request.json
    img_path = data["image_path"]
    note    = data.get("note", "")
    point_id= str(data["id"])

    image = processor(images=img_path, return_tensors="pt")
    out   = blip.generate(**image)
    caption = processor.decode(out[0], skip_special_tokens=True)

    text = note + " " + caption
    vect = embedder.encode(text).tolist()

    payload = {"note": note, "caption": caption}
    qdrant.upsert(
        collection_name="photos",
        points=[{"id": point_id, "vector": vect, "payload": payload}],
    )
    return jsonify({"status":"ok"}), 200

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q","")
    k     = int(request.args.get("k", "10"))
    qvec  = embedder.encode(query).tolist()

    res = qdrant.search(
        collection_name="photos",
        query_vector=qvec,
        limit=k,
        with_payload=True,
    )
    hits = [{"id":hit.id, "score": hit.score, "payload":hit.payload} for hit in res]
    return jsonify(hits), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)