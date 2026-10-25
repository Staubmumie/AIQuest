"""Developer trace for one round: node timeline, state diff and LLM cost.

Uses only LangGraph's streaming (tasks/updates/values) and, if configured,
the Langfuse CallbackHandler. Tracing errors must never stop the game.
"""

import logging
import os
import time
from contextlib import nullcontext

from langchain_core.callbacks import BaseCallbackHandler

from gamestate import GameState

logger = logging.getLogger("aiquest")

MAX_TEXT = 2000  # long texts (story_history) are shortened in the trace

# Fields a node actually reads: only these are shown as input in the Developer Panel.
NODE_INPUTS = {
    "input_guardrails": ["user_input"],
    "dungeon_master": ["action", "narration", "memory_saved"],
    "interpret_action": ["user_input", "player", "scene"],
    "validate_action": ["action", "player"],
    "update_game_state": ["approved_changes", "player"],
    "progress_story": ["game_id", "user_input", "action", "result", "scene", "player", "story_history"],
    "save_long_term_memory": ["game_id", "user_input", "narration"],
}


def short(value):
    """Recursively shortens long strings so the trace stays small."""
    if isinstance(value, str) and len(value) > MAX_TEXT:
        half = MAX_TEXT // 2
        return f"{value[:half]} … {value[-half:]}"
    if isinstance(value, dict):
        return {k: short(v) for k, v in value.items()}
    if isinstance(value, list):
        return [short(v) for v in value]
    return value


def flatten(state: dict, prefix: str = "") -> dict:
    """{"player": {"hp": 60}} -> {"player.hp": 60}. Lists stay a single value."""
    flat = {}
    for key, value in state.items():
        if isinstance(value, dict):
            flat.update(flatten(value, f"{prefix}{key}."))
        else:
            flat[f"{prefix}{key}"] = value
    return flat


def state_diff(before: dict, after: dict) -> list[dict]:
    """Only the fields that actually changed."""
    old, new = flatten(before), flatten(after)
    return [
        {"path": path, "before": short(old.get(path)), "after": short(new.get(path))}
        for path in {**old, **new}
        if old.get(path) != new.get(path)
    ]


class UsageCollector(BaseCallbackHandler):
    """Records tokens and cost of every LLM call along with its LangGraph node.

    No streaming mode needed: OpenRouter returns `usage.cost` (USD) directly.
    """

    def __init__(self):
        self.nodes: dict = {}  # run_id -> node name
        self.calls: list[dict] = []

    def on_chat_model_start(self, serialized, messages, *, run_id, metadata=None, **kwargs):
        self.nodes[run_id] = (metadata or {}).get("langgraph_node")

    def on_llm_end(self, response, *, run_id, **kwargs):
        output = response.llm_output or {}
        usage = output.get("token_usage") or {}
        self.calls.append({
            "node": self.nodes.pop(run_id, None),
            "model": output.get("model_name"),
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "cost": usage.get("cost"),  # None if not reported
        })


def langfuse_handler():
    """Langfuse CallbackHandler if the keys are set, otherwise None."""
    if not (os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")):
        return None
    try:
        from langfuse.langchain import CallbackHandler

        return CallbackHandler()
    except Exception:
        logger.warning("Langfuse disabled", exc_info=True)
        return None


def langfuse_session(game_id: str):
    """Groups all rounds of a game as a Langfuse session."""
    try:
        from langfuse import propagate_attributes

        return propagate_attributes(session_id=game_id, trace_name="turn")
    except Exception:
        return nullcontext()


def langfuse_trace_url(handler) -> str | None:
    if handler is None or not handler.last_trace_id:
        return None
    try:
        from langfuse import get_client

        return get_client().get_trace_url(trace_id=handler.last_trace_id)
    except Exception:
        return None


def run_traced(graph, state: GameState, config: dict | None = None, on_node=None) -> tuple[GameState, dict]:
    """Like graph.invoke(state, config), but also returns the round's trace.

    on_node(name) is called as soon as a node starts (for the progress indicator).
    """
    usage = UsageCollector()
    handler = langfuse_handler()
    callbacks = [usage, handler] if handler else [usage]
    session = langfuse_session(state["game_id"]) if handler else nullcontext()

    nodes: list[dict] = []
    seen = 0  # LLM calls already assigned to a node (the graph runs sequentially)
    started = last = time.perf_counter()

    # Per step: "tasks" (node starts), "updates" (node done), then "values" (new state).
    stream_mode = ["tasks", "updates", "values"]
    with session:
        for mode, data in graph.stream(state, {**(config or {}), "callbacks": callbacks}, stream_mode=stream_mode):
            if mode == "tasks":
                if on_node and "input" in data:  # Start-Ereignis (End-Ereignisse haben "result")
                    on_node(data["name"])

            elif mode == "updates":
                now = time.perf_counter()
                for node, output in data.items():
                    fields = NODE_INPUTS.get(node, list(state))
                    nodes.append({
                        "node": node,
                        "ms": round((now - last) * 1000),
                        "input": short({k: state[k] for k in fields if k in state}),
                        "output": short(output or {}),
                        "diff": [],
                        "llm": usage.calls[seen:],
                    })
                    seen = len(usage.calls)
                last = now

            elif mode == "values":
                if nodes:
                    nodes[-1]["diff"] = state_diff(state, data)
                state = data

    llm_calls = usage.calls
    costs = [c["cost"] for c in llm_calls if c["cost"] is not None]
    trace = {
        "turn_ms": round((time.perf_counter() - started) * 1000),
        "nodes": nodes,
        "usage": {
            "llm_calls": len(llm_calls),
            "input_tokens": sum(c["input_tokens"] for c in llm_calls),
            "output_tokens": sum(c["output_tokens"] for c in llm_calls),
            "total_tokens": sum(c["total_tokens"] for c in llm_calls),
            "cost": sum(costs) if costs else None,
        },
        "langfuse_url": langfuse_trace_url(handler),
    }
    return state, trace
