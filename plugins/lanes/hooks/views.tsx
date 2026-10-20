// The three drawings: the band above the prompt, the /lanes pane, and one
// lane's detail. Each is a function of the Board and the time; presses are
// handed back through `Actions`, so nothing here reaches the engine.

import type { Color, Elements, RenderElement } from 'claude-code'

import type { Board, Lane, LaneState, Loop, Stage } from '../types'
import { HELPER_STAGE, LIMITS, MAIN, STAGES, helpersOf, otherAgents, stageOf } from './tracker'

export type Kit = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>

export type Actions = {
  select: (laneId: string | null) => void
  view: (loopId: string) => void
}

type Look = { glyph: string; color: Color; label: string }

const LOOK: Readonly<Record<LaneState, Look>> = {
  running: { glyph: '●', color: 'claude', label: 'running' },
  idle: { glyph: '○', color: 'inactive', label: 'stopped' },
  'needs-you': { glyph: '◆', color: 'permission', label: 'needs you' },
  ready: { glyph: '◆', color: 'permission', label: 'ready to merge' },
  blocked: { glyph: '✗', color: 'error', label: 'blocked' },
  failed: { glyph: '✗', color: 'error', label: 'failed' },
  done: { glyph: '✓', color: 'success', label: 'merged and deployed' },
}

const STAGE_LABEL: Readonly<Record<Stage, string>> = {
  plan: 'plan',
  tests: 'tests',
  gate: 'gate',
  build: 'build',
  review: 'review',
  pr: 'PR',
  merge: 'merge',
  ship: 'ship',
  post: 'post',
}

// Column heads over the pane's tracks, each at most a full segment wide.
const TRACK_HEAD: Readonly<Record<Stage, string>> = { ...STAGE_LABEL, review: 'rev' }

const INDENT = '    '
const SEGMENT_MAX = 5
const HEAD_MIN = 4
const HELPER_ROWS = 3
const HOTKEYS = 9
const TYPE_WIDTH = 14
const BAND_TITLE = 24
const BAND_STAGE = 16
const BAND_AGE = 4
const BAND_MINI_TRACK = STAGES.length * 2 - 1
// Below this the band drops its mini track to keep the activity readable.
const BAND_WIDE = 90
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

const DONE_LINE = '━'
const TODO_LINE = '─'

export function band(kit: Kit, board: Board, now: number, columns: number): RenderElement | undefined {
  const { Box, Text } = kit
  const lanes = board.lanes.filter(lane => lane.state !== 'done')
  if (lanes.length === 0) return undefined

  const isWide = columns >= BAND_WIDE

  return (
    <Box flexDirection="column">
      <Text dimColor>lanes · /lanes for detail</Text>
      {lanes.map(lane => {
        const look = LOOK[lane.state]
        return (
          <Box key={lane.id} flexDirection="row" gap={1}>
            <Box width={1}>
              <Text color={look.color}>{look.glyph}</Text>
            </Box>
            <Box width={BAND_TITLE}>
              <Text bold wrap="truncate-end">
                {title(lane)}
              </Text>
            </Box>
            {isWide && <Box width={BAND_MINI_TRACK}>{track(kit, lane, 1)}</Box>}
            <Box width={BAND_STAGE}>
              <Text color={look.color} wrap="truncate-end">
                {stageText(lane)}
              </Text>
            </Box>
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <Text wrap="truncate-end">{lane.question ?? currentWork(board, lane) ?? ''}</Text>
            </Box>
            <Box width={BAND_AGE} justifyContent="flex-end">
              <Text dimColor>{age(now - stageStart(lane))}</Text>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export function pane(kit: Kit, board: Board, now: number, columns: number, actions: Actions): RenderElement {
  const { Box, Text, Button } = kit
  const active = board.lanes.filter(lane => lane.state !== 'done')
  const done = board.lanes.filter(lane => lane.state === 'done')
  const others = otherAgents(board)
  const width = segmentWidth(columns)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text dimColor>{summary(board)}</Text>
        {width >= HEAD_MIN && (
          <Text dimColor>
            {INDENT}
            {STAGES.map(stage => TRACK_HEAD[stage].slice(0, width).padEnd(width)).join(' ')}
          </Text>
        )}
      </Box>
      {active.length === 0 && <Text dimColor>No lane is building. A lane shows here once a build starts.</Text>}
      {active.map((lane, index) => laneBlock(kit, board, lane, index, now, columns, width, actions))}
      {done.length > 0 && (
        <Box flexDirection="column">
          <Text dimColor>Done</Text>
          {done.map(lane => (
            <Button key={`done-${lane.id}`} plain onPress={() => actions.select(lane.id)}>
              <Text color="success">✓</Text> {title(lane)} <Text dimColor>{LOOK.done.label}</Text>
            </Button>
          ))}
        </Box>
      )}
      {others.length > 0 && (
        <Box flexDirection="column">
          <Text dimColor>Other agents</Text>
          {others.map(loop => agentRow(kit, loop, now, '  '))}
        </Box>
      )}
      <Text dimColor>1-9 lane detail · esc back to the prompt</Text>
    </Box>
  )
}

export function detail(kit: Kit, board: Board, lane: Lane, now: number, actions: Actions): RenderElement {
  const { Box, Text, Button } = kit
  const look = LOOK[lane.state]
  const helpers = helpersOf(board, lane)
  const reached = STAGES.indexOf(stageOf(lane))
  const pending = lane.state === 'done' ? [] : STAGES.slice(reached + 1)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {title(lane)}
          </Text>
          <Text color={look.color}>
            {look.glyph} {look.label} · {age(now - lane.startedAt)}
          </Text>
        </Box>
        {lane.question && <Text color="permission">{lane.question}</Text>}
        {lane.plan && <Text dimColor>plan {lane.plan}</Text>}
        {lane.pr !== undefined && <Text dimColor>PR #{lane.pr}</Text>}
        {lane.then !== undefined && <Text dimColor>then #{lane.then}</Text>}
      </Box>

      <Box flexDirection="column">
        <Text dimColor>Timeline</Text>
        {lane.history.map((entry, index) => {
          const end = lane.history[index + 1]?.at
          const isCurrent = end === undefined && lane.state !== 'done'
          const stageHelpers = helpers.filter(
            loop => HELPER_STAGE[loop.type] === entry.stage && loop.startedAt >= entry.at && (end === undefined || loop.startedAt < end),
          )
          return (
            <Box key={`stage-${index}`} flexDirection="column">
              <Box flexDirection="row" justifyContent="space-between">
                <Text>
                  <Text color={isCurrent ? look.color : 'success'}>{isCurrent ? look.glyph : '✓'}</Text>{' '}
                  {STAGE_LABEL[entry.stage].padEnd(8)}
                  {isCurrent && lane.note ? <Text dimColor>{lane.note}</Text> : ''}
                </Text>
                <Text dimColor>{age((end ?? now) - entry.at)}</Text>
              </Box>
              {stageHelpers.map(loop => agentRow(kit, loop, now, INDENT))}
            </Box>
          )
        })}
        {pending.length > 0 && <Text dimColor>○ {pending.map(stage => STAGE_LABEL[stage]).join(' · ')}</Text>}
      </Box>

      <Box flexDirection="column">
        <Text dimColor>Limits</Text>
        {limitRow(kit, 'gate rounds', lane.gateRounds, LIMITS.gateRounds)}
        {limitRow(kit, 'review rounds', lane.reviewRounds, LIMITS.reviewRounds)}
        {limitRow(kit, 'way back to plan', lane.wayBacks, LIMITS.wayBacks)}
        {lane.steps && (
          <Text>
            plan steps <Text dimColor>{`${lane.steps.done}/${lane.steps.total}`}</Text>
          </Text>
        )}
      </Box>

      {lane.decision && (
        <Box flexDirection="column">
          <Text dimColor>Latest decision</Text>
          <Text>{lane.decision}</Text>
        </Box>
      )}

      <Box flexDirection="row" gap={2}>
        <Button key="back" plain hotkey="b" label="back" onPress={() => actions.select(null)} />
        {lane.loop !== MAIN && <Button key="transcript" plain hotkey="v" label="transcript" onPress={() => actions.view(lane.loop)} />}
      </Box>
    </Box>
  )
}

function laneBlock(kit: Kit, board: Board, lane: Lane, index: number, now: number, columns: number, width: number, actions: Actions) {
  const { Box, Text, Button } = kit
  const look = LOOK[lane.state]
  const helpers = helpersOf(board, lane).slice(-HELPER_ROWS)
  const isHelperRunning = helpers.some(loop => !loop.isDone)
  const ownWork = board.loops[lane.loop]?.activity?.text
  const caret = `▲ ${stageText(lane)}`
  const caretAt = INDENT.length + STAGES.indexOf(stageOf(lane)) * (width + 1)
  const caretPad = caretAt + caret.length <= columns ? caretAt : INDENT.length
  const hotkey = index < HOTKEYS ? { hotkey: String(index + 1) } : {}

  return (
    <Box key={lane.id} flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Button key={`lane-${lane.id}`} plain {...hotkey} onPress={() => actions.select(lane.id)}>
          <Text color={look.color}>{look.glyph}</Text> {title(lane)}
        </Button>
        <Text dimColor>{age(now - lane.startedAt)}</Text>
      </Box>
      <Text>
        {INDENT}
        {track(kit, lane, width)}
      </Text>
      <Text color={look.color}>
        {' '.repeat(caretPad)}
        {caret}
      </Text>
      {lane.question && (
        <Text wrap="truncate-end">
          {INDENT}
          {'  '}
          {lane.question}
        </Text>
      )}
      {helpers.map((loop, at) => agentRow(kit, loop, now, `${INDENT}${at === helpers.length - 1 && isHelperRunning ? '└' : '├'} `))}
      {!isHelperRunning && lane.state === 'running' && ownWork && (
        <Text wrap="truncate-end">
          {INDENT}
          <Text color="claude">●</Text> {ownWork}
        </Text>
      )}
      {lane.then !== undefined && (
        <Text dimColor>
          {INDENT}then #{lane.then}
        </Text>
      )}
    </Box>
  )
}

// "test-auditor  ● npm test -- invoices      41s", or "✓ gate PASS  1m" once done.
function agentRow(kit: Kit, loop: Loop, now: number, lead: string) {
  const { Box, Text } = kit
  const what = loop.isDone ? loop.outcome : (loop.activity?.text ?? loop.description)
  const took = loop.isDone ? (loop.endedAt ?? now) - loop.startedAt : now - loop.startedAt

  return (
    <Box key={`agent-${loop.id}`} flexDirection="row" justifyContent="space-between">
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">
          <Text dimColor>
            {lead}
            {shortType(loop.type).padEnd(TYPE_WIDTH)}
          </Text>
          <Text color={loop.isDone ? 'success' : 'claude'}>{loop.isDone ? '✓' : '●'}</Text> {what ?? ''}
        </Text>
      </Box>
      <Text dimColor> {age(took)}</Text>
    </Box>
  )
}

function limitRow(kit: Kit, label: string, used: number, limit: number) {
  const { Box, Text } = kit

  return (
    <Box key={label} flexDirection="row" justifyContent="space-between">
      <Text>{label}</Text>
      <Text color={used >= limit ? 'warning' : 'inactive'}>{`${used}/${limit}`}</Text>
    </Box>
  )
}

// One segment per stage: done green, current in the lane's color, the rest dim.
function track(kit: Kit, lane: Lane, width: number) {
  const { Text } = kit
  const at = STAGES.indexOf(stageOf(lane))
  const isDone = lane.state === 'done'

  return (
    <Text>
      {STAGES.map((stage, index) => {
        const isPast = isDone || index < at
        const color: Color = isPast ? 'success' : index === at ? LOOK[lane.state].color : 'subtle'
        const gap = index < STAGES.length - 1 ? ' ' : ''
        return (
          <Text key={stage} color={color}>
            {(isPast || index === at ? DONE_LINE : TODO_LINE).repeat(width)}
            {gap}
          </Text>
        )
      })}
    </Text>
  )
}

// "gate · round 2/2", "plan · needs you", "merge · ready to merge".
function stageText(lane: Lane): string {
  const state = lane.state === 'running' ? undefined : LOOK[lane.state].label
  return [STAGE_LABEL[stageOf(lane)], lane.note, state].filter(Boolean).join(' · ')
}

// What the lane is doing now: its newest running helper's call, else its own.
function currentWork(board: Board, lane: Lane): string | undefined {
  const helper = helpersOf(board, lane)
    .filter(loop => !loop.isDone && loop.activity)
    .at(-1)
  if (helper?.activity) return `${shortType(helper.type)}: ${helper.activity.text}`

  return board.loops[lane.loop]?.activity?.text
}

function summary(board: Board): string {
  const counts = new Map<string, number>()
  for (const lane of board.lanes) {
    const label = LOOK[lane.state].label
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  if (counts.size === 0) return 'no lanes'

  return [...counts].map(([label, n]) => `${n} ${label}`).join(' · ')
}

function title(lane: Lane): string {
  const name = lane.title || (lane.loop === MAIN ? 'main conversation' : 'lane')
  // An agent description often names the issue already: "Build #42".
  return lane.issue === undefined || name.includes(`#${lane.issue}`) ? name : `#${lane.issue} ${name}`
}

// Segments as wide as the pane allows: nine of them, eight gaps, after the indent.
function segmentWidth(columns: number): number {
  const room = Math.floor((columns - INDENT.length - (STAGES.length - 1)) / STAGES.length)
  return Math.max(1, Math.min(SEGMENT_MAX, room))
}

function stageStart(lane: Lane): number {
  return lane.history.at(-1)?.at ?? lane.startedAt
}

function shortType(type: string): string {
  return type.replace(/^core:/, '')
}

// "41s", "18m", "2h05".
export function age(ms: number): string {
  if (ms < MINUTE) return `${Math.max(0, Math.floor(ms / SECOND))}s`
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`

  return `${Math.floor(ms / HOUR)}h${String(Math.floor((ms % HOUR) / MINUTE)).padStart(2, '0')}`
}
