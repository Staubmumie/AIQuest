import os
import json
from pathlib import Path
from typing import TypedDict, Literal
from pydantic import BaseModel, Field, ValidationError
from langchain_openai import ChatOpenAI


PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str, **values) -> str:
    """Reads prompts/<name>.md and fills its {placeholders}. Also used by story_progression.py and guardrails.py."""
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8").format(**values)


# MODEL (also used by story_progression.py and guardrails.py)
llm = ChatOpenAI(
    model="openai/gpt-5-mini",
    temperature=0,
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    max_retries=2,
)


# Allowed fields: shared by interpreter, validator and updater.
STATE_RULES = {
    "player.hp": {
        "type": "integer",
        "operations": ["increment", "decrement", "set"],
        "min": 0,
        "max": 100,
    },
    "player.gold": {
        "type": "integer",
        "operations": ["increment", "decrement"],
        "min": 0,
        "reject_below_min": True,  # you can't spend more gold than you have
    },
    "player.inventory": {
        "type": "list",
        "operations": ["add", "remove"],
    },
}


class Player(BaseModel):
    """Valid player state (limits as in STATE_RULES). Also used by api.py."""

    hp: int = Field(ge=STATE_RULES["player.hp"]["min"], le=STATE_RULES["player.hp"]["max"])
    gold: int = Field(ge=STATE_RULES["player.gold"]["min"])
    inventory: list[str]


class StateChange(BaseModel):
    operation: Literal["increment", "decrement", "set", "add", "remove"]
    path: str
    value: int | str  # number for hp/gold, item name for inventory


class Action(BaseModel):
    action_type: str
    description: str
    changes: list[StateChange]


# GRAPH STATE
class GameState(TypedDict, total=False):
    # persistent for the whole game
    game_id: str
    player: dict              # {"hp": int, "gold": int, "inventory": list[str]}
    scene: str
    characters: list[str]
    story_history: str

    # per round (reset by new_round)
    user_input: str
    action: dict | None
    approved_changes: list[dict]
    result: str
    narration: str
    segments: list[dict]      # [{"speaker": "narrator" | character ID, "text": str}]
    memory_saved: bool
    memory_entry: dict        # {"text": str, "saved": bool, "error": str | None}
    recalled_memories: dict   # {"max_distance": float, "candidates": [{"text", "distance", "used"}], "error": str | None}
    guardrail: dict          # result of input_guardrails (see guardrails.py)

    # control by the Dungeon Master
    next_step: str


def new_game_state(game_id: str) -> GameState:
    return {
        "game_id": game_id,
        "player": {"hp": 100, "gold": 10, "inventory": ["Wooden Sword", "Bread"]},
        "scene": "tavern",
        "characters": ["travelling_merchant"],
        "story_history": (
            "You are sitting in a noisy tavern. A travelling merchant "
            "eyes you curiously from the next table."
        ),
    }


def new_round(state: GameState, user_input: str) -> GameState:
    """Resets the round fields so the Dungeon Master starts from the beginning."""
    return {
        **state,
        "user_input": user_input,
        "action": None,
        "approved_changes": [],
        "result": "",
        "narration": "",
        "segments": [],
        "memory_saved": False,
    }


def player_field(path: str) -> str:
    """'player.gold' -> 'gold' (all allowed fields live directly under player)."""
    return path.removeprefix("player.")


# 1. ACTION INTERPRETER
INTERPRETER_PROMPT = load_prompt("action_interpreter", state_rules=json.dumps(STATE_RULES, ensure_ascii=False))

interpreter = llm.with_structured_output(Action)


def interpret_action(state: GameState) -> dict:
    action = interpreter.invoke([
        ("system", INTERPRETER_PROMPT),
        ("human", json.dumps({
            "player": state["player"],
            "scene": state.get("scene"),
            "player_input": state["user_input"],
        }, ensure_ascii=False)),
    ])
    return {"action": action.model_dump()}


# 2. VALIDATOR
def check_change(player: dict, change: dict) -> str | None:
    """Returns an error message, or None if the change is allowed."""
    path, operation, value = change["path"], change["operation"], change["value"]
    rule = STATE_RULES.get(path)

    if rule is None:
        return f"Unknown field: {path}"
    if operation not in rule["operations"]:
        return f"Operation {operation} is not allowed for {path}."

    current = player.get(player_field(path))

    if rule["type"] == "integer":
        if type(value) is not int or type(current) is not int:
            return f"{path} requires an integer."
        if operation in ("increment", "decrement") and value < 0:
            return f"{operation} requires a non-negative value."
        if rule.get("reject_below_min") and operation == "decrement" and current - value < rule["min"]:
            return f"Not enough {path} (available: {current}, required: {value})."

    if rule["type"] == "list":
        if not isinstance(value, str) or not isinstance(current, list):
            return f"{path} requires an item name."
        if operation == "remove" and value not in current:
            return f"'{value}' is not in the inventory."

    return None


def validate_action(state: GameState) -> dict:
    changes = state["action"]["changes"]
    if not changes:
        return {"approved_changes": [], "result": "No state changes."}

    for change in changes:
        error = check_change(state["player"], change)
        if error:
            return {"approved_changes": [], "result": "Rejected: " + error}

    return {"approved_changes": changes, "result": "Approved"}


# 3. STATE UPDATE
def apply_operation(old, operation: str, value):
    """Computes the new value without modifying the old one."""
    if operation == "increment":
        return old + value
    if operation == "decrement":
        return old - value
    if operation == "set":
        return value
    if operation == "add":
        return old + [value]
    if operation == "remove":
        new = list(old)
        new.remove(value)
        return new
    raise ValueError(f"Unknown operation: {operation}")


def update_game_state(state: GameState) -> dict:
    if not state["approved_changes"]:
        return {}

    player = dict(state["player"])
    applied = []
    try:
        for change in state["approved_changes"]:
            path = change["path"]
            rule = STATE_RULES[path]
            key = player_field(path)
            old = player[key]

            new = apply_operation(old, change["operation"], change["value"])
            if "min" in rule:
                new = max(rule["min"], new)
            if "max" in rule:
                new = min(rule["max"], new)

            player[key] = new
            applied.append({"path": path, "before": old, "after": new})

        # Final safeguard: the result must be a valid player state.
        Player.model_validate(player)
    except (KeyError, TypeError, ValueError, ValidationError) as exc:
        # All or nothing: the old state stays unchanged.
        return {"approved_changes": [], "result": f"Rejected: invalid state change ({exc.__class__.__name__})."}

    return {
        "player": player,
        "result": "Applied changes: " + json.dumps(applied, ensure_ascii=False),
    }
