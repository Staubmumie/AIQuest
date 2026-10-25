import { ExternalLink, Terminal, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DebugLogEntry, LlmCall, LogLevel, NodeRun, TurnRecord } from '../../types/devtools'
import type { GameState, GuardrailResult, SavedGame } from '../../types/game'

const LOG_COLORS: Record<LogLevel, string> = {
  info: 'text-ink-400',
  warn: 'text-gold-400',
  error: 'text-ember-400',
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`)
const formatCost = (cost: number | null) => (cost === null ? 'n/a' : `$${cost.toFixed(4)}`)
const formatValue = (value: unknown) => (value === undefined ? '—' : JSON.stringify(value))

function sumUsage(calls: { total_tokens: number; cost: number | null }[]) {
  const costs = calls.map((c) => c.cost).filter((c): c is number => c !== null)
  return {
    tokens: calls.reduce((sum, c) => sum + c.total_tokens, 0),
    cost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null,
  }
}

function TraceField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b border-ink-700 px-4 py-3">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</h3>
      <div className="text-sm text-parchment">{children}</div>
    </section>
  )
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{children}</h4>
}

function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-ink-950 p-2 text-[10px] text-parchment/85">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function LlmCalls({ calls }: { calls: LlmCall[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {calls.map((call, i) => (
        <li key={i} className="text-ink-400">
          {call.model} · {call.input_tokens} in / {call.output_tokens} out · {formatCost(call.cost)}
        </li>
      ))}
    </ul>
  )
}

const NEXT_STEPS: Record<string, string> = {
  action: 'evaluate the player action',
  write_story: 'write the story',
  save_memory: 'save the round to memory',
  end: 'end the turn',
}

/** One readable line per node: the decision or result that matters for debugging. */
function nodeSummary(run: NodeRun): string {
  const out = run.output as Partial<GameState>
  switch (run.node) {
    case 'input_guardrails':
      return `Input ${out.guardrail?.status ?? 'checked'}`
    case 'dungeon_master':
      return `Next: ${NEXT_STEPS[out.next_step ?? ''] ?? out.next_step}`
    case 'interpret_action':
      return out.action ? `${out.action.action_type}: ${out.action.description}` : ''
    case 'validate_action':
      return out.result ?? ''
    case 'update_game_state': {
      const applied = run.diff.filter((c) => c.path.startsWith('player.'))
      if (applied.length > 0) return applied.map((c) => `${c.path} ${formatValue(c.before)} → ${formatValue(c.after)}`).join(', ')
      return out.result ?? 'No changes applied'
    }
    case 'progress_story': {
      const used = out.recalled_memories?.candidates.filter((c) => c.used).length ?? 0
      return `${out.segments?.length ?? 0} segments · scene ${out.scene} · ${used} memories recalled`
    }
    case 'save_long_term_memory':
      if (out.memory_entry?.saved) return 'Memory saved'
      return `Memory not saved${out.memory_entry?.error ? `: ${out.memory_entry.error}` : ' (nothing to store)'}`
    default:
      return ''
  }
}

/** Node-specific details that are easier to read than the raw output. */
function NodeHighlights({ run }: { run: NodeRun }) {
  const out = run.output as Partial<GameState>
  if (run.node === 'interpret_action' && out.action) {
    return (
      <>
        <SubHeading>Proposed changes</SubHeading>
        {out.action.changes.length === 0 ? (
          <p className="text-ink-400">None</p>
        ) : (
          <ul>
            {out.action.changes.map((c, i) => (
              <li key={i}>
                <span className="text-gold-300">{c.operation}</span> {c.path} {formatValue(c.value)}
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }
  if (run.node === 'progress_story' && out.segments) {
    const recalled = out.recalled_memories
    return (
      <>
        {recalled && (
          <>
            <SubHeading>Recalled memories (max distance {recalled.max_distance})</SubHeading>
            {recalled.error && <p className="text-ember-400">Search failed: {recalled.error}</p>}
            {recalled.candidates.length === 0 && !recalled.error && <p className="text-ink-400">No memories found</p>}
            <ul className="flex flex-col gap-1">
              {recalled.candidates.map((c, i) => (
                <li key={i} className={c.used ? '' : 'text-ink-400'}>
                  <span className={c.used ? 'text-gold-300' : ''}>
                    {c.distance.toFixed(3)} · {c.used ? 'used' : 'too far'}
                  </span>
                  <pre className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-ink-950 p-2 text-[10px]">
                    {c.text}
                  </pre>
                </li>
              ))}
            </ul>
          </>
        )}
        <SubHeading>Story segments</SubHeading>
        <ol className="flex flex-col gap-0.5">
          {out.segments.map((s, i) => (
            <li key={i} className="break-words">
              <span className="text-arcane-400">{s.speaker}:</span> {s.text}
            </li>
          ))}
        </ol>
        <p className="mt-1 text-ink-400">Characters: {out.characters?.join(', ') || '—'}</p>
      </>
    )
  }
  if (run.node === 'save_long_term_memory' && out.memory_entry) {
    return (
      <>
        <SubHeading>Stored memory</SubHeading>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-ink-950 p-2 text-[10px] text-parchment/85">
          {out.memory_entry.text}
        </pre>
      </>
    )
  }
  return null
}

/** One executed node: header with timing and summary, expandable to highlights, State Diff, LLM usage and raw data. */
function NodeDetails({ run, index }: { run: NodeRun; index: number }) {
  const summary = nodeSummary(run)
  return (
    <details className="rounded bg-ink-800/60">
      <summary className="cursor-pointer px-2 py-1 font-mono text-[11px] hover:bg-ink-700/60">
        <div className="flex items-center gap-2">
          <span className="w-4 text-right text-ink-600">{index + 1}</span>
          <span className="flex-1 truncate text-arcane-400">{run.node}</span>
          {run.diff.length > 0 && <span className="text-gold-300">Δ{run.diff.length}</span>}
          {run.llm.length > 0 && <span className="text-ember-400">LLM</span>}
          <span className="text-ink-400">{formatMs(run.ms)}</span>
        </div>
        {summary && <p className="ml-6 line-clamp-2 break-words text-parchment/75">{summary}</p>}
      </summary>
      <div className="px-2 pb-2 font-mono text-[11px]">
        <NodeHighlights run={run} />
        <SubHeading>State diff</SubHeading>
        {run.diff.length === 0 ? (
          <p className="text-ink-400">No changes</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {run.diff.map((change) => (
              <li key={change.path} className="line-clamp-3 break-all" title={formatValue(change.after)}>
                <span className="text-gold-300">{change.path}</span>
                <span className="text-ink-400">: </span>
                <span className="text-ember-400/90">{formatValue(change.before)}</span>
                <span className="text-ink-400"> → </span>
                <span className="text-parchment">{formatValue(change.after)}</span>
              </li>
            ))}
          </ul>
        )}
        {run.llm.length > 0 && (
          <>
            <SubHeading>LLM calls</SubHeading>
            <LlmCalls calls={run.llm} />
          </>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-ink-400">Raw output</summary>
          <Json value={run.output} />
        </details>
        <details className="mt-1">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-ink-400">Input (fields this node reads)</summary>
          <Json value={run.input} />
        </details>
      </div>
    </details>
  )
}

const GUARDRAIL_COLORS: Record<GuardrailResult['status'], string> = {
  allowed: 'text-ink-400',
  flagged: 'text-gold-300',
  rejected: 'text-ember-400',
}

/** Which input checks ran and what they found (output of the `input_guardrails` node). */
function GuardrailChecks({ guardrail }: { guardrail: GuardrailResult }) {
  return (
    <div className="mb-1 rounded bg-ink-800/60 px-2 py-1.5 font-mono text-[11px]">
      <p>
        <span className="text-ink-400">Guardrails: </span>
        <span className={GUARDRAIL_COLORS[guardrail.status]}>{guardrail.status}</span>
        <span className="text-ink-400"> · semantic {guardrail.semantic_enabled ? 'on' : 'off'}</span>
      </p>
      <ul className="mt-0.5">
        {guardrail.checks.map((c) => (
          <li key={c.check} className="break-words text-ink-400">
            {c.check}: <span className={c.result === 'pass' || c.result === 'skipped' ? '' : 'text-gold-300'}>{c.result}</span>
            {c.detail && ` · ${c.detail}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One game turn: summary line (time, tokens, cost), guardrail result and the node timeline. */
function TurnDetails({ record, open }: { record: TurnRecord; open: boolean }) {
  const { trace } = record
  const guardrail = trace.nodes.find((n) => n.node === 'input_guardrails')?.output.guardrail as
    | GuardrailResult
    | undefined
  return (
    <details open={open} className="border-b border-ink-700">
      <summary className="cursor-pointer px-4 py-2 hover:bg-ink-800/60">
        <span className="font-mono text-xs text-gold-400">Turn {record.turn}</span>
        <span className="ml-2 text-xs text-parchment/85">“{record.userInput}”</span>
        <div className="mt-0.5 font-mono text-[11px] text-ink-400">
          {formatMs(trace.turn_ms)} · {trace.usage.total_tokens.toLocaleString()} tokens · {formatCost(trace.usage.cost)}
          {guardrail && guardrail.status !== 'allowed' && (
            <span className={GUARDRAIL_COLORS[guardrail.status]}> · {guardrail.status}</span>
          )}
        </div>
      </summary>
      <div className="flex flex-col gap-1 px-4 pb-3">
        {guardrail && <GuardrailChecks guardrail={guardrail} />}
        {trace.nodes.map((run, i) => (
          <NodeDetails key={i} run={run} index={i} />
        ))}
        {trace.langfuse_url && (
          <a
            href={trace.langfuse_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 self-start text-[11px] text-arcane-400 hover:underline"
          >
            Open in Langfuse <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </details>
  )
}

interface DeveloperPanelProps {
  game: SavedGame
  lastTurnMs: number | null
  logs: DebugLogEntry[]
  traces: TurnRecord[]
  onClose?: () => void
}

/** Debug panel: LangGraph node timeline, State Diff and LLM costs per turn of this session. */
export function DeveloperPanel({ game, lastTurnMs, logs, traces, onClose }: DeveloperPanelProps) {
  const session = sumUsage(traces.map((t) => t.trace.usage))
  const callsByNode: Record<string, LlmCall[]> = {}
  for (const call of traces.flatMap((t) => t.trace.nodes.flatMap((n) => n.llm))) {
    ;(callsByNode[call.node ?? 'unknown'] ??= []).push(call)
  }
  const costPerNode = Object.entries(callsByNode).map(([node, calls]) => ({ node, ...sumUsage(calls) }))

  return (
    <div className="flex h-full flex-col bg-ink-900 font-sans">
      <header className="flex items-center gap-2 border-b border-ink-600 px-4 py-3">
        <Terminal className="size-4 text-arcane-400" aria-hidden />
        <h2 className="flex-1 font-display text-sm font-bold tracking-wide text-arcane-400">Developer View</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-parchment" aria-label="Close developer view">
            <X className="size-4" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <TraceField label="Game">
          <span className="break-all font-mono text-xs">
            {game.state.game_id} · turn {game.turn} · last round trip {lastTurnMs === null ? '—' : formatMs(lastTurnMs)}
          </span>
        </TraceField>

        <TraceField label={`Session costs · ${traces.length} traced turns`}>
          <p className="font-mono text-xs">
            {session.tokens.toLocaleString()} tokens · <span className="text-gold-300">{formatCost(session.cost)}</span>
          </p>
          {costPerNode.length > 0 && (
            <ul className="mt-1 font-mono text-[11px] text-ink-400">
              {costPerNode.map((row) => (
                <li key={row.node}>
                  {row.node}: {row.tokens.toLocaleString()} tokens · {formatCost(row.cost)}
                </li>
              ))}
            </ul>
          )}
        </TraceField>

        <section className="border-b border-ink-700">
          <h3 className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Execution timeline</h3>
          {traces.length === 0 ? (
            <p className="px-4 pb-3 text-xs text-ink-400">No turn played in this session yet.</p>
          ) : (
            [...traces]
              .reverse()
              .map((record, i) => <TurnDetails key={record.turn} record={record} open={i === 0} />)
          )}
        </section>

        <TraceField label="Debug logs">
          {logs.length === 0 ? (
            <p className="text-xs text-ink-400">No events yet.</p>
          ) : (
            <ol className="flex max-h-64 flex-col-reverse gap-0.5 overflow-y-auto font-mono text-[11px]">
              {[...logs].reverse().map((entry) => (
                <li key={entry.id} className={LOG_COLORS[entry.level]}>
                  <span className="text-ink-600">{timeFormat.format(new Date(entry.timestamp))}</span> {entry.message}
                </li>
              ))}
            </ol>
          )}
        </TraceField>
      </div>
    </div>
  )
}
