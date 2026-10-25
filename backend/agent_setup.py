from uuid import uuid4
from langgraph.graph import StateGraph, START, END

from gamestate import (
    GameState,
    new_game_state,
    new_round,
    interpret_action,
    validate_action,
    update_game_state,
)
import story_progression
from guardrails import input_guardrails, route_guardrails
from long_term_memory import MAX_DISTANCE, save_memory, search_memories


# --- Nodes ---
# interpret_action, validate_action, update_game_state -> see gamestate.py

def dungeon_master(state: GameState) -> dict:
    """Keeps track of the round and decides which node runs next.

    Flow of a round:
    1. Evaluate the player action  (interpret -> validate -> update)
    2. Continue the story
    3. Save the round to long-term memory
    4. End of the round
    """
    if state.get("action") is None:
        next_step = "action"
    elif not state.get("narration"):
        next_step = "write_story"
    elif not state.get("memory_saved"):
        next_step = "save_memory"
    else:
        next_step = "end"

    return {"next_step": next_step}


def progress_story(state: GameState) -> dict:
    try:
        candidates, error = search_memories(state["game_id"], state["user_input"]), None
    except Exception as exc:  # the story continues even without memories
        candidates, error = [], str(exc)
    memories = [c["text"] for c in candidates if c["used"]]

    story = story_progression.progress_story(
        action_result={"action": state["action"], "result": state["result"]},
        last_input=state["user_input"],
        story_history=state["story_history"],
        current_scene=state["scene"],
        player=state["player"],
        memories=memories,
    )
    segments = [s.model_dump() for s in story.segments]
    narration = story_progression.segments_to_text(segments)

    return {
        "narration": narration,
        "segments": segments,
        "scene": story.scene,
        "characters": story.characters,
        "story_history": f"{state['story_history']}\n\nPlayer: {state['user_input']}\n{narration}",
        "recalled_memories": {"max_distance": MAX_DISTANCE, "candidates": candidates, "error": error},
    }


def save_long_term_memory(state: GameState) -> dict:
    text = f"Player: {state['user_input']}\nNarration: {state['narration']}"
    try:
        saved, error = save_memory(state["game_id"], text), None
    except Exception as exc:  # a storage error should not abort the round
        saved, error = False, str(exc)

    # memory_saved controls the Dungeon Master (round finished), memory_entry shows what was saved.
    return {"memory_saved": True, "memory_entry": {"text": text, "saved": saved, "error": error}}


# Planned: dice roll between validation and update
# def roll_dice(state: GameState) -> dict:
#     pass
#
# def route_validation(state: GameState) -> str:
#     return "roll_dice" if state.get("requires_dice") else "update_game_state"


# --- Routing ---

def route_dungeon_master(state: GameState) -> str:
    return state.get("next_step", "end")


# --- Graph ---

builder = StateGraph(GameState)

builder.add_node("input_guardrails", input_guardrails)
builder.add_node("dungeon_master", dungeon_master)
builder.add_node("interpret_action", interpret_action)
builder.add_node("validate_action", validate_action)
# builder.add_node("roll_dice", roll_dice)
builder.add_node("update_game_state", update_game_state)
builder.add_node("progress_story", progress_story)
builder.add_node("save_long_term_memory", save_long_term_memory)

# Guardrails run only once per input: the loops below lead back to dungeon_master, never here.
builder.add_edge(START, "input_guardrails")
builder.add_conditional_edges(
    "input_guardrails",
    route_guardrails,
    {
        "allowed": "dungeon_master",
        "rejected": END,
    },
)

builder.add_conditional_edges(
    "dungeon_master",
    route_dungeon_master,
    {
        "action": "interpret_action",
        "write_story": "progress_story",
        "save_memory": "save_long_term_memory",
        "end": END,
    },
)

builder.add_edge("interpret_action", "validate_action")

# builder.add_conditional_edges(
#     "validate_action",
#     route_validation,
#     {
#         "roll_dice": "roll_dice",
#         "update_game_state": "update_game_state",
#     },
# )

builder.add_edge("validate_action", "update_game_state")
builder.add_edge("update_game_state", "dungeon_master")
builder.add_edge("progress_story", "dungeon_master")
builder.add_edge("save_long_term_memory", "dungeon_master")

graph = builder.compile()


# --- Game loop ---

def format_player(player: dict) -> str:
    inventory = ", ".join(player["inventory"]) or "-"
    return f"[HP: {player['hp']} | Gold: {player['gold']} | Inventory: {inventory}]"


def save_graph_image(path: str = "graph.png") -> None:
    try:
        with open(path, "wb") as f:
            f.write(graph.get_graph().draw_mermaid_png())
    except Exception as e:
        print(f"(Could not create graph image: {e})")


def main() -> None:
    save_graph_image()

    state = new_game_state(game_id=str(uuid4()))
    print(state["story_history"])

    while True:
        user_input = input("\n> ").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit"):
            break

        state = graph.invoke(new_round(state, user_input))

        print("\n" + state["narration"])
        print("\n" + format_player(state["player"]))

        if state["player"]["hp"] <= 0:
            print("\nYou died. GAME OVER.")
            break


if __name__ == "__main__":
    main()
