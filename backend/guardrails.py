"""Input guardrails: check every new player input exactly once before the Dungeon Master starts.

1. Validation       (Python)  empty / too long -> reject
2. Prompt injection (Regex)   clear manipulation -> reject, single signal words -> only flag
3. Semantic         (LLM)     optional via the "semantic_guardrail" setting
"""

import json
import logging
import re

from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel

from gamestate import GameState, llm, load_prompt

logger = logging.getLogger("aiquest")

MAX_INPUT_LENGTH = 4000

# Clear attempts to change or extract the AI's instructions (verb + reference to the AI).
# "Ich ignoriere die Befehle des Hauptmanns" ("I ignore the captain's orders") deliberately does not match.
INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        # English
        r"\b(ignore|disregard|forget|override)\b.{0,30}\b(previous|prior|above|earlier|your|system)\s+(instructions?|prompts?|programming|guidelines)\b",
        r"\b(reveal|show|print|repeat|output|tell me)\b.{0,30}\b(system|initial|hidden|original)\s+(prompt|instructions?|message)\b",
        r"\byou are (now|no longer)\b.{0,30}\b(an? )?(ai|assistant|chatbot|language model)\b",
        r"\b(developer|jailbreak|dan)\s+mode\b",
        # German
        r"\b(ignorier\w*|vergiss|missachte\w*)\b.{0,30}\b(vorherigen|bisherigen|obigen|früheren|deine)\s+(anweisungen|instruktionen|vorgaben|prompts?)\b",
        r"\b(zeig\w*|nenn\w*|verrat\w*|gib|wiederhol\w*)\b.{0,30}\b(system-?prompt|systemanweisung\w*|deine\s+(\w+\s+)?anweisungen)\b",
        r"\bdu bist (jetzt|ab sofort|nun|nicht mehr)\b.{0,30}\b(eine? )?(ki|assistent|chatbot|sprachmodell)\b",
        r"\b(entwickler|developer|jailbreak)-?modus\b",
    ]
]

# Single signal words: often harmless in role-play, so only flag, never reject.
SUSPICIOUS_WORDS = re.compile(
    r"\b(system ?prompt|prompt|instructions?|anweisungen|jailbreak|chatgpt|sprachmodell|language model|ki-assistent|ai assistant)\b",
    re.IGNORECASE,
)


class ScopeCheck(BaseModel):
    allowed: bool
    reason: str


SCOPE_PROMPT = load_prompt("semantic_guardrail")

scope_checker = llm.with_structured_output(ScopeCheck)


def check_input(text: str | None) -> tuple[str, str]:
    """Returns (result, explanation); result is "pass" or "fail"."""
    if not isinstance(text, str) or not text.strip():
        return "fail", "Your input is empty."
    if len(text) > MAX_INPUT_LENGTH:
        return "fail", f"Your input is too long (at most {MAX_INPUT_LENGTH} characters)."
    return "pass", ""


def check_injection(text: str) -> tuple[str, str]:
    """"fail" for a clear pattern, "flag" for mere signal words, otherwise "pass"."""
    for pattern in INJECTION_PATTERNS:
        if match := pattern.search(text):
            return "fail", f"Attempt to change the game master's instructions: “{match.group(0)}”"
    if words := sorted({w.lower() for w in SUSPICIOUS_WORDS.findall(text)}):
        return "flag", "Signal words: " + ", ".join(words)
    return "pass", ""


def check_scope(text: str) -> tuple[str, str]:
    """LLM check. If it fails, the input is allowed (only flagged)."""
    try:
        result = scope_checker.invoke([
            ("system", SCOPE_PROMPT),
            ("human", json.dumps({"player_input": text}, ensure_ascii=False)),
        ])
    except Exception as exc:
        logger.warning("Semantic guardrail failed: %s", exc)
        return "error", "Check failed, input allowed."
    return ("pass" if result.allowed else "fail"), result.reason


def input_guardrails(state: GameState, config: RunnableConfig) -> dict:
    text = state.get("user_input")
    semantic_enabled = bool(config.get("configurable", {}).get("semantic_guardrail", False))

    checks = []
    for name, check in [("validation", check_input), ("injection", check_injection), ("semantic", check_scope)]:
        if name == "semantic" and not semantic_enabled:
            checks.append({"check": name, "result": "skipped", "detail": "Disabled in settings."})
            continue
        result, detail = check(text)
        checks.append({"check": name, "result": result, "detail": detail})
        if result == "fail":
            break  # later checks (especially the LLM call) are unnecessary then

    failed = next((c for c in checks if c["result"] == "fail"), None)
    if failed:
        status = "rejected"
    elif any(c["result"] in ("flag", "error") for c in checks):
        status = "flagged"
    else:
        status = "allowed"

    update = {"guardrail": {"status": status, "semantic_enabled": semantic_enabled, "checks": checks}}
    if failed:
        # Respond through the normal path (dialogue box) without changing game mechanics or story.
        message = f"As the game master, I can't accept that. {failed['detail']}"
        update["narration"] = message
        update["segments"] = [{"speaker": "narrator", "text": message}]
    return update


def route_guardrails(state: GameState) -> str:
    return "rejected" if state["guardrail"]["status"] == "rejected" else "allowed"
