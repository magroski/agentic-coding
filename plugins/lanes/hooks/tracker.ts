// The lanes model: folds what the session's loops do into one Board.
//
//   engine events ──> register.tsx ──Signal──> apply() ──Board──> views.tsx
//                     (adapter)                (this file,        (band, pane,
//                                               pure)              detail)
//
// Nothing here reaches the engine: every input arrives as a Signal, so the
// stage inference is testable on its own.

import type { Board, Lane, LaneState, Loop, Stage } from '../types'

// The build skill's pipeline. Its steps 4 (build) and 5 (self-check) share
// one stage: no tool call tells them apart.
export const STAGES: readonly Stage[] = ['plan', 'tests', 'gate', 'build', 'review', 'pr', 'merge', 'ship', 'post']

// Stages after the PR merged.
const MERGED: ReadonlySet<Stage> = new Set(['ship', 'post'])

// Loop id of the main conversation, whose events carry no agentId.
export const MAIN = 'main'

// Retry caps the build skill sets, so a view can show how close a lane is.
// Gate audits count per task, across way backs.
export const LIMITS = { gateRounds: 3, reviewRounds: 2, wayBacks: 2 } as const

// A file the task skill writes: docs/plans/<slug>.md or docs/plans/<epic>/<nn>-<slug>.md.
export const PLAN_FILE = /\/docs\/plans\/.+\.md$/

export const EMPTY: Board = { lanes: [], loops: {} }

const BUILD_SKILL = 'core:build'
const TASK_SKILL = 'core:task'

// Helper agent type -> the stage its spawn starts.
export const HELPER_STAGE: Readonly<Record<string, Stage>> = {
  'core:map-auditor': 'plan',
  'core:test-writer': 'tests',
  'core:test-auditor': 'gate',
  'core:reviewer': 'review',
}

// The next skill's lane prompt: "Invoke the core:build skill for #42.
// (This lane then builds #48, ...)".
const LANE_ISSUE = /core:build skill for #(\d+)/
const LANE_THEN = /then builds #(\d+)/

// The build skill's report: "Built: #42 <title> · <url> · ready to merge".
const REPORT_BUILT = /^Built:.*·\s*(merged and deployed|ready to merge|blocked|failed)\b/m
const REPORT_NEEDS = /^Needs you:\s*(.+)$/m
const NOTHING = /^nothing\b/i
const BUILT_STATE: Readonly<Record<string, LaneState>> = {
  'merged and deployed': 'done',
  'ready to merge': 'ready',
  blocked: 'blocked',
  failed: 'failed',
}

// gh commands that mark the build's steps 7 to 9.
const GH_PR_CREATE = /\bgh pr create\b/
const GH_PR_CHECKS = /\bgh pr checks\b/
const GH_PR_MERGE = /\bgh pr merge\b(?:\s+#?(\d+))?/
const GH_POST_DEPLOY = /\bgh pr comment\b[\s\S]*Post-deploy:/
const GH_COMMENT_PR = /\bgh pr comment\s+#?(\d+)\b/
const PR_URL = /\/pull\/(\d+)/
// The gate's last step on either track, the light one having no auditor to end it.
const FREEZE_COMMIT = /\bgit commit\b[\s\S]*Add failing tests for\b/
// A failed row of `gh pr checks` off a terminal: "Vercel\tfail\t0\t<url>\tDeployment rate limited".
const CHECK_FAILED = /^([^\t\n]+)\tfail\t/gm

// Helper reports, as each agent file spells them.
const GATE_VERDICT = /^Gate:\s*(PASS|FAIL)/m
const MAP_VERDICT = /^Map:\s*(PASS|FAIL)/m
const TEST_ROW = /^\|\s*\d+\s*\|/gm
const VERDICT_ROW = /^\|[^|\n]*\|[^|\n]*\|\s*(PASS|FAIL)\b/gm
const MUST_FIX = /\*\*Must fix\*\*/
const FIX_HERE = /\*\*Fix here\*\*/
const FOLLOW_UPS = /\*\*Follow-ups?\*\*/
const AFTER_MUST_FIX = /\*\*(?:Fix here|Follow-ups?)\*\*/
const NUMBERED = /^\d+\./gm

// Task plan sections, per the task skill's template.
const PLAN_STATUS = /^Status: /m
const PLAN_STEPS = /^## Steps/m
const PLAN_TITLE = /^# (.+)$/m
const PLAN_ISSUE = /^Issue: \[#(\d+)\]/m
const PLAN_STEP = /^\d+\. \[([ xX])\]/gm
const WAY_BACK = /^- Way back:/gm

const MAX_LOOPS = 200
const MAX_TEXT = 80
const PATH_TAIL = 3

export type ToolInput = Readonly<Record<string, unknown>>

// What the adapter observed, already stripped of the engine's shapes.
export type Signal =
  | { kind: 'spawn'; id: string; parentId: string; type: string; description: string; prompt: string; at: number }
  | { kind: 'turn'; loopId: string; at: number }
  | { kind: 'tool'; loopId: string; tool: string; input: ToolInput; at: number }
  | { kind: 'output'; loopId: string; tool: string; input: ToolInput; text: string; isError: boolean; at: number }
  | { kind: 'plan'; loopId: string; path: string; text: string; at: number }
  | { kind: 'end'; loopId: string; answer: string; at: number }

export function apply(board: Board, signal: Signal): Board {
  switch (signal.kind) {
    case 'spawn':
      return onSpawn(board, signal)
    case 'turn':
      return onTurn(board, signal.loopId, signal.at)
    case 'tool':
      return onTool(board, signal)
    case 'output':
      return onOutput(board, signal)
    case 'plan':
      return onPlan(board, signal)
    case 'end':
      return onEnd(board, signal)
  }
}

export function stageOf(lane: Lane): Stage {
  return lane.history[lane.history.length - 1]?.stage ?? 'plan'
}

// The lane a loop works for: its own, or its spawner's when it is a helper.
export function laneOf(board: Board, loopId: string): Lane | undefined {
  const own = liveLane(board, loopId)
  if (own) return own
  const parentId = board.loops[loopId]?.parentId

  return parentId === undefined ? undefined : liveLane(board, parentId)
}

// Helpers a lane spawned for its own task, oldest first. A finished task's
// helpers stop where its loop's next task began.
export function helpersOf(board: Board, lane: Lane): Loop[] {
  const until = Math.min(
    ...board.lanes.filter(other => other.loop === lane.loop && other.startedAt > lane.startedAt).map(other => other.startedAt),
  )

  return Object.values(board.loops)
    .filter(loop => loop.parentId === lane.loop && loop.startedAt >= lane.startedAt && loop.startedAt < until)
    .sort((a, b) => a.startedAt - b.startedAt)
}

// Running subagents that are neither a lane nor a lane's helper.
export function otherAgents(board: Board): Loop[] {
  const lanes = new Set(board.lanes.map(lane => lane.loop))

  return Object.values(board.loops).filter(
    loop => loop.id !== MAIN && !loop.isDone && !lanes.has(loop.id) && !lanes.has(loop.parentId ?? ''),
  )
}

// Drops lanes whose PR is merged or that are done, for a long-lived board;
// a lane still building or waiting on a merge stays.
export function clearFinished(board: Board): Board {
  return { ...board, lanes: board.lanes.filter(lane => lane.state !== 'done' && !MERGED.has(stageOf(lane))) }
}

// One line for a tool call: "Read src/auth/session.ts", "npm test -- invoices".
export function describeCall(tool: string, input: ToolInput): string {
  const text = (key: string) => String(input[key] ?? '')
  switch (tool) {
    case 'Bash':
      return firstLine(text('command')) ?? tool
    case 'Read':
    case 'Edit':
    case 'Write':
      return `${tool} ${shortPath(text('file_path'))}`
    case 'Grep':
    case 'Glob':
      return `${tool} ${text('pattern')}`
    case 'Agent':
      return `Agent ${text('subagent_type') || text('description')}`
    case 'Skill':
      return `Skill ${text('skill')}`
    default:
      return tool
  }
}

// One line from a helper's final report, read the way its agent file writes it.
export function summarizeReport(type: string, answer: string): string | undefined {
  switch (type) {
    case 'core:test-writer':
      return `${count(answer, TEST_ROW)} failing tests`
    case 'core:map-auditor': {
      const verdict = MAP_VERDICT.exec(answer)?.[1]
      return verdict ? `map ${verdict}` : firstLine(answer)
    }
    case 'core:test-auditor': {
      const verdict = GATE_VERDICT.exec(answer)?.[1]
      return verdict ? `gate ${verdict}` : firstLine(answer)
    }
    case 'core:verifier':
      return passCount(answer) ?? firstLine(answer)
    case 'core:reviewer': {
      const findings = `${count(between(answer, MUST_FIX, AFTER_MUST_FIX), NUMBERED)} must fix · ${count(between(answer, FIX_HERE, FOLLOW_UPS), NUMBERED)} fix here · ${count(between(answer, FOLLOW_UPS), NUMBERED)} follow-ups`
      const criteria = passCount(answer)
      return criteria ? `${criteria} · ${findings}` : findings
    }
    default:
      return firstLine(answer)
  }
}

export type Report = { state: LaneState; question?: string }

// A lane's last words: its build report, else the question it stopped on.
export function parseReport(answer: string): Report | undefined {
  const needs = REPORT_NEEDS.exec(answer)?.[1]?.trim()
  const question = needs && !NOTHING.test(needs) ? needs : undefined
  const built = REPORT_BUILT.exec(answer)?.[1]
  if (built) return { state: BUILT_STATE[built] ?? 'failed', question }
  if (question) return { state: 'needs-you', question }

  return undefined
}

export type PlanFacts = {
  isPlan: boolean
  title?: string
  issue?: number
  steps?: { done: number; total: number }
  decision?: string
  wayBacks: number
}

export function parsePlan(text: string): PlanFacts {
  if (!PLAN_STATUS.test(text) || !PLAN_STEPS.test(text)) return { isPlan: false, wayBacks: 0 }

  const steps = [...section(text, 'Steps').matchAll(PLAN_STEP)]
  const decisions = section(text, 'Decisions')
    .split('\n')
    .filter(line => line.startsWith('- '))

  return {
    isPlan: true,
    title: PLAN_TITLE.exec(text)?.[1]?.trim(),
    issue: toNumber(PLAN_ISSUE.exec(text)?.[1]),
    steps: steps.length > 0 ? { done: steps.filter(step => step[1] !== ' ').length, total: steps.length } : undefined,
    decision: decisions.at(-1)?.slice(2),
    wayBacks: count(text, WAY_BACK),
  }
}

function onSpawn(board: Board, s: Extract<Signal, { kind: 'spawn' }>): Board {
  const loop: Loop = {
    id: s.id,
    type: s.type,
    description: s.description,
    parentId: s.parentId,
    isDone: false,
    startedAt: s.at,
  }
  const next = { ...board, loops: prune({ ...board.loops, [s.id]: loop }) }

  // A lane agent of the next skill: its prompt names the issue.
  const issue = toNumber(LANE_ISSUE.exec(s.prompt)?.[1])
  if (issue !== undefined) {
    const then = toNumber(LANE_THEN.exec(s.prompt)?.[1])
    if (!liveLane(next, s.id)) return { ...next, lanes: [...next.lanes, newLane(s.id, s.at, { issue, title: s.description, then })] }

    // The lead resuming its lane with SendMessage: the same row goes on, and
    // moves to a new one when the message names the next issue.
    return withLane(startBuild(next, s.id, issue, s.at), s.id, lane => ({ ...lane, then: then ?? lane.then }))
  }

  const stage = HELPER_STAGE[s.type]
  const lane = liveLane(next, s.parentId)
  if (!stage || !lane) return next

  return withLane(next, lane.id, current => spawnHelper(current, s.type, stage, s.at))
}

// A helper's spawn moves its lane to that helper's stage and counts rounds.
function spawnHelper(lane: Lane, type: string, stage: Stage, at: number): Lane {
  const moved = advance(lane, stage, at)
  switch (type) {
    case 'core:test-auditor': {
      const gateRounds = lane.gateRounds + 1
      return { ...moved, gateRounds, note: `round ${gateRounds}/${LIMITS.gateRounds}` }
    }
    case 'core:reviewer': {
      const reviewRounds = lane.reviewRounds + 1
      return { ...moved, reviewRounds, note: reviewRounds > 1 ? 'fix round' : moved.note }
    }
    default:
      return moved
  }
}

// A loop starting a turn is a lane resumed: by the lead's message, or the founder.
function onTurn(board: Board, loopId: string, at: number): Board {
  const loop = board.loops[loopId]
  const next = loop ? { ...board, loops: { ...board.loops, [loopId]: { ...loop, isDone: false } } } : board
  const lane = liveLane(next, loopId)
  if (lane) return lane.loop === MAIN ? next : withLane(next, lane.id, resume)

  // A finished helper starting a turn was sent its fix round: it counts as a spawn would.
  if (!loop?.isDone) return next
  const stage = HELPER_STAGE[loop.type]
  const owner = liveLane(next, loop.parentId ?? '')
  if (!stage || !owner) return next

  return withLane(next, owner.id, current => spawnHelper(current, loop.type, stage, at))
}

function onTool(board: Board, s: Extract<Signal, { kind: 'tool' }>): Board {
  const next = touch(withActivity(board, s.loopId, describeCall(s.tool, s.input), s.at), s.loopId)
  switch (s.tool) {
    case 'Skill':
      return onSkill(next, s.loopId, String(s.input.skill ?? ''), String(s.input.args ?? ''), s.at)
    case 'Bash':
      return onCommand(next, s.loopId, String(s.input.command ?? ''), s.at)
    default:
      return next
  }
}

function onSkill(board: Board, loopId: string, skill: string, args: string, at: number): Board {
  // Only a leading number is an issue: "42", "#42"; a plan path is not.
  const issue = toNumber(/^#?(\d+)\b/.exec(args.trim())?.[1])
  if (skill === BUILD_SKILL) return startBuild(board, loopId, issue, at)
  if (skill === TASK_SKILL) return startPlanning(board, loopId, issue, at)

  return board
}

function startBuild(board: Board, loopId: string, issue: number | undefined, at: number): Board {
  const lane = liveLane(board, loopId)
  if (!lane) return { ...board, lanes: [...board.lanes, newLane(loopId, at, { issue })] }
  if (issue === undefined || lane.issue === undefined || lane.issue === issue) {
    return withLane(board, lane.id, current => ({ ...current, issue: current.issue ?? issue }))
  }

  // The loop moved on to its next issue: the finished task keeps its own id.
  const archived = { ...lane, id: `${loopId}:${lane.issue}` }
  return {
    ...board,
    lanes: [...board.lanes.map(current => (current.id === lane.id ? archived : current)), newLane(loopId, at, { issue })],
  }
}

function startPlanning(board: Board, loopId: string, issue: number | undefined, at: number): Board {
  const lane = liveLane(board, loopId)
  if (!lane) return { ...board, lanes: [...board.lanes, newLane(loopId, at, { issue })] }
  if (stageOf(lane) === 'plan') return board

  // Planning again past the plan stage is the build skill's way back.
  return withLane(board, lane.id, current => {
    const wayBacks = current.wayBacks + 1
    return { ...advance(current, 'plan', at), wayBacks, note: `way back ${wayBacks}/${LIMITS.wayBacks}` }
  })
}

function onCommand(board: Board, loopId: string, command: string, at: number): Board {
  if (GH_POST_DEPLOY.test(command)) return onPostDeploy(board, loopId, toNumber(GH_COMMENT_PR.exec(command)?.[1]), at)

  const lane = laneOf(board, loopId)
  if (!lane) return board
  if (FREEZE_COMMIT.test(command)) return withLane(board, lane.id, current => advance(current, 'build', at))
  if (GH_PR_CREATE.test(command)) return withLane(board, lane.id, current => advance(current, 'pr', at))
  if (GH_PR_CHECKS.test(command)) return withLane(board, lane.id, current => ({ ...advance(current, 'pr', at), note: 'CI' }))

  return board
}

// Results matter for three commands: the PR's number, CI's verdict, a merge that went through.
function onOutput(board: Board, s: Extract<Signal, { kind: 'output' }>): Board {
  if (s.tool !== 'Bash') return board

  const command = String(s.input.command ?? '')
  const merge = GH_PR_MERGE.exec(command)
  if (merge) return s.isError ? board : onMerge(board, s.loopId, toNumber(merge[1]), s.at)

  const lane = laneOf(board, s.loopId)
  if (!lane) return board
  if (GH_PR_CREATE.test(command)) {
    const pr = toNumber(PR_URL.exec(s.text)?.[1])
    return pr === undefined ? board : withLane(board, lane.id, current => ({ ...current, pr }))
  }
  if (GH_PR_CHECKS.test(command)) {
    return withLane(board, lane.id, current => ({ ...current, note: ciNote(s.text, s.isError) }))
  }

  return board
}

// CI's verdict names what failed, so a deploy provider's cap reads apart from
// a failing test: "CI red: Vercel". Rows win over the exit code, which a pipe hides.
function ciNote(text: string, isError: boolean): string {
  const failed = new Set([...text.matchAll(CHECK_FAILED)].map(match => match[1]))
  if (failed.size > 0) return `CI red: ${[...failed].join(', ')}`

  return isError ? 'CI red' : 'CI green'
}

// The lead merges a lane's PR by number; a build in the main loop merges its own.
function onMerge(board: Board, loopId: string, pr: number | undefined, at: number): Board {
  const lane = pr === undefined ? laneOf(board, loopId) : board.lanes.find(current => current.pr === pr)
  if (!lane) return board

  return withLane(board, lane.id, current => advance(current, 'ship', at))
}

// The post-deploy comment is a build's last step, whoever posts it: the lead
// names the lane's PR; a comment naming none belongs to the loop's own lane.
function onPostDeploy(board: Board, loopId: string, pr: number | undefined, at: number): Board {
  const lane = pr === undefined ? laneOf(board, loopId) : board.lanes.find(current => current.pr === pr)
  if (!lane) return board

  return withLane(board, lane.id, current => ({ ...moveTo(current, 'post', at), state: 'done', question: undefined }))
}

function onPlan(board: Board, s: Extract<Signal, { kind: 'plan' }>): Board {
  const lane = laneOf(board, s.loopId)
  const facts = parsePlan(s.text)
  if (!lane || !facts.isPlan) return board

  return withLane(board, lane.id, current => ({
    ...current,
    plan: s.path,
    title: facts.title ?? current.title,
    issue: current.issue ?? facts.issue,
    steps: facts.steps ?? current.steps,
    decision: facts.decision ?? current.decision,
    wayBacks: Math.max(current.wayBacks, facts.wayBacks),
  }))
}

function onEnd(board: Board, s: Extract<Signal, { kind: 'end' }>): Board {
  const loop = board.loops[s.loopId]
  const next =
    loop && s.loopId !== MAIN
      ? {
          ...board,
          loops: {
            ...board.loops,
            [s.loopId]: { ...loop, isDone: true, endedAt: s.at, outcome: summarizeReport(loop.type, s.answer) },
          },
        }
      : board

  const own = liveLane(next, s.loopId)
  if (own) return withLane(next, own.id, lane => settle(lane, s.answer, s.at))

  // A passed gate starts the build; a failed one goes back to the test-writer.
  if (loop?.type === 'core:test-auditor' && GATE_VERDICT.exec(s.answer)?.[1] === 'PASS') {
    const lane = laneOf(next, s.loopId)
    if (lane) return withLane(next, lane.id, current => advance(current, 'build', s.at))
  }

  return next
}

// A lane's turn ended. A lane agent that stops without a report returned a
// question, as the next skill tells it to; the main loop stopping says nothing.
function settle(lane: Lane, answer: string, at: number): Lane {
  const report = parseReport(answer)
  if (!report) {
    if (lane.loop === MAIN) return lane.state === 'running' ? { ...lane, state: 'idle' } : lane
    return { ...lane, state: 'needs-you', question: firstLine(answer) }
  }

  const stage = report.state === 'done' ? 'post' : report.state === 'ready' ? 'merge' : stageOf(lane)
  const moved = stage === stageOf(lane) ? lane : moveTo(lane, stage, at)

  return { ...moved, state: report.state, question: report.question }
}

function newLane(loop: string, at: number, fields: Partial<Lane> = {}): Lane {
  return {
    id: loop,
    loop,
    title: '',
    state: 'running',
    history: [{ stage: 'plan', at }],
    gateRounds: 0,
    reviewRounds: 0,
    wayBacks: 0,
    startedAt: at,
    ...fields,
  }
}

// A lane of the loop still working on its task: archived tasks carry `<loop>:<issue>` ids.
function liveLane(board: Board, loop: string): Lane | undefined {
  return board.lanes.find(lane => lane.id === loop)
}

function withLane(board: Board, id: string, change: (lane: Lane) => Lane): Board {
  return { ...board, lanes: board.lanes.map(lane => (lane.id === id ? change(lane) : lane)) }
}

function withActivity(board: Board, loopId: string, text: string, at: number): Board {
  const loop = board.loops[loopId] ?? {
    id: loopId,
    type: loopId === MAIN ? MAIN : 'agent',
    description: '',
    isDone: false,
    startedAt: at,
  }

  return { ...board, loops: prune({ ...board.loops, [loopId]: { ...loop, activity: { text, at } } }) }
}

// Work in a lane agent or its helpers means it is running again.
function touch(board: Board, loopId: string): Board {
  const lane = laneOf(board, loopId)
  if (!lane || lane.loop === MAIN || lane.state === 'running' || lane.state === 'done') return board

  return withLane(board, lane.id, resume)
}

function resume(lane: Lane): Lane {
  return lane.state === 'done' ? lane : { ...lane, state: 'running', question: undefined }
}

// Moves a lane on and marks it working.
function advance(lane: Lane, stage: Stage, at: number): Lane {
  return resume(moveTo(lane, stage, at))
}

// Staying in a stage keeps its start time and its note.
function moveTo(lane: Lane, stage: Stage, at: number): Lane {
  if (stageOf(lane) === stage) return lane

  return { ...lane, history: [...lane.history, { stage, at }], note: undefined }
}

// Drops the oldest finished loops past the cap, so a long session stays small.
function prune(loops: Record<string, Loop>): Record<string, Loop> {
  const all = Object.values(loops)
  if (all.length <= MAX_LOOPS) return loops

  const dropped = new Set(
    all
      .filter(loop => loop.isDone)
      .sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
      .slice(0, all.length - MAX_LOOPS)
      .map(loop => loop.id),
  )

  return Object.fromEntries(all.filter(loop => !dropped.has(loop.id)).map(loop => [loop.id, loop]))
}

// The text under "## <heading>", up to the next "## " heading.
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}`)
  if (start < 0) return ''

  const body = text.slice(start + heading.length + 4)
  const end = body.search(/^## /m)

  return end < 0 ? body : body.slice(0, end)
}

// The text from `from` up to `to` (or the end); empty when `from` is absent.
function between(text: string, from: RegExp, to?: RegExp): string {
  const start = text.search(from)
  if (start < 0) return ''

  const rest = text.slice(start)
  const end = to ? rest.search(to) : -1

  return end > 0 ? rest.slice(0, end) : rest
}

// "2/3 pass" from a criteria table's verdict rows; undefined when there is no table.
function passCount(answer: string): string | undefined {
  const verdicts = [...answer.matchAll(VERDICT_ROW)].map(match => match[1])
  if (verdicts.length === 0) return undefined

  return `${verdicts.filter(verdict => verdict === 'PASS').length}/${verdicts.length} pass`
}

function count(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

export function firstLine(text: string): string | undefined {
  const line = text
    .split('\n')
    .map(part => part.replace(/^[#>*\-\s]+/, '').trim())
    .find(part => part.length > 0)

  return line === undefined ? undefined : line.slice(0, MAX_TEXT)
}

function shortPath(path: string): string {
  return path.split('/').filter(Boolean).slice(-PATH_TAIL).join('/')
}

function toNumber(text: string | undefined): number | undefined {
  return text === undefined ? undefined : Number(text)
}
