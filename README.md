# AIQuest

**AIQuest** is an AI-powered fantasy RPG playable in the browser, inspired by Dungeons & Dragons and classic 2D role-playing games.

Instead of following predefined dialogue options, players can freely describe their actions. An AI Game Master, powered by LangGraph, interprets these actions, validates their effects on the game state, generates dynamic stories and NPC dialogues, and remembers important events through long-term memory.

The project was developed to explore how AI agents work internally, with a particular focus on agent orchestration, state management, memory, security, and observability.

## Key Features

- **AI Game Master:** Generates dynamic stories and responds to free-text player actions.
- **LangGraph Workflow:** Coordinates actions, validation, state updates, story progression, and memory operations.
- **Game State Management:** Maintains structured information about the player, world, and current scene.
- **Short-Term Memory:** Preserves relevant information throughout the agent workflow.
- **Long-Term Memory:** Uses LanceDB and embeddings to store and retrieve relevant story events.
- **Input Guardrails:** Detects invalid inputs and potential prompt injection attempts.
- **Interactive 2D Interface:** Displays fantasy backgrounds, character portraits, and step-by-step NPC dialogue.
- **Developer Panel:** Visualizes agent execution, node decisions, state changes, token usage, and costs.
- **Save / Load:** Allows players to save their progress and continue previous adventures.

## Getting Started

### Backend

Requirements: Python and [uv](https://docs.astral.sh/uv/).

```bash
cd backend
cp .env.example .env    # then set OPENROUTER_API_KEY
uv sync
uv run uvicorn api:app --reload
```

### Frontend

Requirements: Node.js and npm.

```bash
cd frontend
npm install
npm run dev
```

Open the application at:

http://localhost:5173

The backend URL is configured through `VITE_API_BASE_URL` in `frontend/.env.development`.

To override it locally, create or modify `.env.development.local`.

### Langfuse (Optional)

AIQuest uses Langfuse for LLM tracing, token usage, and cost monitoring. To enable it, add the following to `backend/.env`:

```env
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=
```

Game turns are grouped by `game_id`, with traces accessible through the Developer Panel. Tracing is optional and does not interrupt gameplay if unavailable.

## Project Requirements

The following requirements were implemented as part of the AI agent development project.

### Medium — Token Usage and Cost Tracking

**Implemented**

- Integrated Langfuse to track LLM usage and costs.
- Displayed token usage and cost information in the Developer Panel.
- Enabled tracing of individual LLM calls.

### Medium — Short-Term Memory in LangGraph

**Implemented**

- Uses a shared `AgentState` that is updated throughout the LangGraph workflow.
- Stores relevant information required by different nodes.
- Maintains structured game information through the `GameState`.

### Medium — Security Guardrails

**Implemented**

Every new player input passes through an input guardrail node before reaching the Dungeon Master.

Three techniques are used:

1. **Input Validation (Python):** Rejects empty or excessively long inputs.
2. **Prompt Injection Detection (Regex):** Detects common manipulation patterns. Clear attempts can be rejected, while individual suspicious keywords are only flagged.
3. **Semantic Scope Validation (LLM):** Optionally checks whether an input belongs to the RPG context. Can be enabled or disabled through the `semantic_guardrail` setting.

Additional validation ensures that structured outputs and GameState modifications satisfy the expected types and constraints.

### Hard — LLM Observability

**Implemented**

- Integrated Langfuse for LLM tracing, token usage, and cost monitoring.
- Developed a dedicated Developer Panel to inspect the internal behavior of the agent.
- Displays executed LangGraph nodes, decisions, inputs, outputs, and GameState changes.
- Helps understand how individual agent operations contribute to the final result.

### Hard — Agentic RAG

**Implemented**

AIQuest uses a long-term memory mechanism based on LanceDB and vector embeddings.

- The Dungeon Master can decide when important story information should be saved.
- Memories are stored together with embeddings for semantic retrieval.
- During story progression, relevant memories can be retrieved based on semantic similarity.
- Retrieved information helps the Game Master maintain narrative consistency and remember previous events.

This allows the agent to selectively access historical information rather than including the entire adventure history in every prompt.

## Future Improvements

AIQuest currently focuses on demonstrating the core concepts of AI agent development. Several extensions could make the gameplay more immersive and interactive.

**Gameplay**

- **Dice Rolls:** Introduce dice-based mechanics to create more randomness and uncertainty in player actions.
- **Text-to-Speech:** Give NPCs and the narrator voices for a more immersive experience.
- **Dynamic World Creation:** Add a pre-game workflow where players can customize their character, world, and story. Potentially generate character portraits and scene backgrounds dynamically.
- **Multiplayer:** Allow multiple players to participate in the same AI-driven adventure.

**Extended GameState**

- **Relationships:** Track NPC relationships using scores from -100 to +100.
- **Map / Locations:** Track discovered locations and connections between them.
- **Quest System:** Track active, completed, and failed quests.
- **Reputation:** Track the player's reputation with different factions.
- **Status Effects:** Manage effects such as poisoning, injuries, and buffs.
- **Companions:** Track NPCs who accompany the player.

These improvements could increase the complexity and depth of the game while providing additional opportunities to experiment with agent orchestration and state management.

---

AIQuest is primarily an educational project exploring **LangGraph, AI agents, memory, guardrails, and observability** through an interactive fantasy RPG.