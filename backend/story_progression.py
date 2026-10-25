import json
from pydantic import BaseModel, Field

from gamestate import llm, load_prompt

SCENES = {
    "forest": "A dense, mysterious forest.",
    "dark_forest": "A gloomy, mist-shrouded forest.",
    "mountain": "A rugged mountain landscape with steep cliffs.",
    "cave": "A dark cave with branching tunnels.",
    "dungeon": "An underground dungeon full of secrets.",
    "tavern": "A medieval tavern full of travellers.",
    "village": "A small, peaceful village.",
    "city": "A lively medieval city.",
    "castle": "A mighty castle with high walls.",
    "ruins": "The remains of a long-forgotten civilization.",
    "swamp": "An eerie swamp with murky water.",
    "graveyard": "An old graveyard with weathered tombstones.",
    "temple": "A mystical temple full of ancient symbols.",
    "lake": "A large lake surrounded by mountains and forests.",
    "plains": "Wide grasslands with scattered trees.",
}

CHARACTERS = {
    "elf_ranger": "A watchful elven ranger with a keen eye and an air of closeness to nature.",
    "dwarf_warrior": "A sturdy dwarven warrior with a braided beard and heavy armor.",
    "human_knight": "An honorable human knight in fine but battle-tested gear.",
    "goblin_thief": "A cunning goblin thief with a sly grin and simple leather clothing.",
    "orc_mercenary": "A powerful orc mercenary with scars, a rough face and a menacing presence.",
    "mage_scholar": "A learned mage with a calm presence, robes and mysterious details.",
    "priestess": "A wise priestess with a friendly but determined gaze.",
    "travelling_merchant": "A travelling merchant with a charismatic smile and striking clothes.",
}


class StorySegment(BaseModel):
    speaker: str = Field(description='"narrator" or the ID of the speaking character class')
    text: str = Field(description="Short passage, 1-3 sentences")


class StoryOutput(BaseModel):
    segments: list[StorySegment] = Field(description="The continued story as short passages")
    scene: str = Field(description="ID of the current scene")
    characters: list[str] = Field(description="IDs of the character classes currently present")


SYSTEM_PROMPT = load_prompt(
    "dungeon_master",
    scenes=json.dumps(SCENES, ensure_ascii=False),
    characters=json.dumps(CHARACTERS, ensure_ascii=False),
)

storyteller = llm.with_structured_output(StoryOutput)


def progress_story(
    action_result: dict,
    last_input: str,
    story_history: str,
    current_scene: str,
    player: dict,
    memories: list[str] | None = None,
) -> StoryOutput:
    recalled = ""
    if memories:
        recalled = "\n" + load_prompt("recalled_memories", memories="\n---\n".join(memories))

    prompt = load_prompt(
        "story_progression",
        story_history=story_history,
        recalled=recalled,
        current_scene=current_scene,
        player=json.dumps(player, ensure_ascii=False),
        last_input=last_input,
        action_result=json.dumps(action_result, ensure_ascii=False),
    )

    story = storyteller.invoke([("system", SYSTEM_PROMPT), ("human", prompt)])

    # Only accept known scenes and characters
    if story.scene not in SCENES:
        story.scene = current_scene
    story.characters = [c for c in story.characters if c in CHARACTERS]
    # Unknown speakers become the narrator; an empty response would make the Dungeon Master loop forever
    for segment in story.segments:
        if segment.speaker not in CHARACTERS:
            segment.speaker = "narrator"
    story.segments = [s for s in story.segments if s.text.strip()] or [
        StorySegment(speaker="narrator", text="Time passes.")
    ]

    return story


def segments_to_text(segments: list[dict]) -> str:
    """Passages as a single text for story_history and long-term memory."""
    return "\n".join(
        s["text"] if s["speaker"] == "narrator" else f"{s['speaker']}: “{s['text']}”"
        for s in segments
    )
