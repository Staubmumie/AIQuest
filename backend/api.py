"""HTTP interface for the frontend. The game logic lives in agent_setup.py.

The API is stateless: the frontend sends the saved game state with
every round and gets the new state back.
"""

import json
import logging
import os
from queue import Queue
from threading import Thread
from typing import Annotated
from uuid import UUID, uuid4

from dotenv import load_dotenv

load_dotenv()  # must run before gamestate, which reads OPENROUTER_API_KEY on import

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, StringConstraints

from agent_setup import graph
from devtools import run_traced
from gamestate import GameState, Player, new_game_state, new_round
from long_term_memory import delete_memories

logger = logging.getLogger("aiquest")

app = FastAPI(title="AIQuest API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("AIQUEST_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class SavedState(BaseModel):
    """The persistent fields of GameState. new_round resets the round fields."""

    game_id: str = Field(min_length=1)
    player: Player
    scene: str
    characters: list[str]
    story_history: str


class TurnRequest(BaseModel):
    state: SavedState
    # Empty or overly long inputs are checked by the graph node input_guardrails (guardrails.py).
    user_input: Annotated[str, StringConstraints(strip_whitespace=True)]
    semantic_guardrail: bool = False


class TurnResponse(BaseModel):
    state: GameState
    trace: dict  # node timeline, state diff and LLM cost for the Developer Panel


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/games", status_code=status.HTTP_201_CREATED)
def create_game() -> GameState:
    return new_game_state(game_id=str(uuid4()))


@app.delete("/api/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: UUID) -> None:
    """Deletes a game's server-side data (long-term memory). The frontend deletes the save."""
    delete_memories(str(game_id))


@app.post("/api/turn")
def play_turn(request: TurnRequest) -> StreamingResponse:
    """Streams one line of JSON per event (NDJSON):
    {"node": ...} as soon as a node starts, finally {"result": {state, trace}} or {"error": ...}.
    """
    if request.state.player.hp <= 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "Your hero has fallen. This adventure is over.")

    events: Queue = Queue()

    # The graph runs entirely in its own thread so that context variables (callbacks, Langfuse)
    # stay stable; the response only reads the events from the queue.
    def run() -> None:
        try:
            state, trace = run_traced(
                graph,
                new_round(request.state.model_dump(), request.user_input),
                {"configurable": {"semantic_guardrail": request.semantic_guardrail}},
                on_node=lambda node: events.put({"node": node}),
            )
            events.put({"result": TurnResponse(state=state, trace=trace).model_dump()})
        except Exception as exc:
            logger.exception("Game Master failed")
            events.put({"error": f"The Game Master failed to respond: {exc}"})
        events.put(None)

    def lines():
        while (event := events.get()) is not None:
            yield json.dumps(event, ensure_ascii=False) + "\n"

    Thread(target=run, daemon=True).start()
    return StreamingResponse(lines(), media_type="application/x-ndjson")
