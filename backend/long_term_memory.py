from uuid import UUID, uuid4
import lancedb
from sentence_transformers import SentenceTransformer

TABLE_NAME = "memories"
# Cosine distance (0 = identical, 1 = unrelated). Above this, a memory counts as not relevant.
MAX_DISTANCE = 0.5

db = lancedb.connect("./memory_db")
embedder = SentenceTransformer("all-MiniLM-L6-v2")


def save_memory(game_id: str, memory: str) -> bool:
    """Saves a memory. Returns False if there was nothing to save."""
    if not game_id or not memory.strip():
        return False

    record = {
        "id": str(uuid4()),
        "game_id": game_id,
        "text": memory,
        "vector": embedder.encode(memory).tolist(),
    }

    if TABLE_NAME in db.table_names():
        db.open_table(TABLE_NAME).add([record])
    else:
        db.create_table(TABLE_NAME, data=[record])
    return True


def search_memories(game_id: str, query: str, limit: int = 3, max_distance: float = MAX_DISTANCE) -> list[dict]:
    """Finds a game's most similar memories.

    Returns all candidates with their distance; only those below max_distance are relevant ("used").
    The discarded candidates help with tuning the threshold in the Developer Panel.
    """
    if not query.strip() or TABLE_NAME not in db.table_names():
        return []
    game_id = str(UUID(game_id))  # only valid IDs end up in the filter expression

    results = (
        db.open_table(TABLE_NAME)
        .search(embedder.encode(query).tolist())
        .distance_type("cosine")
        .where(f"game_id = '{game_id}'", prefilter=True)
        .limit(limit)
        .to_list()
    )
    return [
        {"text": r["text"], "distance": round(float(r["_distance"]), 3), "used": float(r["_distance"]) <= max_distance}
        for r in results
    ]


def delete_memories(game_id: str) -> None:
    """Deletes all memories of a game; other games stay untouched."""
    game_id = str(UUID(game_id))  # only valid IDs end up in the filter expression
    if TABLE_NAME in db.table_names():
        db.open_table(TABLE_NAME).delete(f"game_id = '{game_id}'")
