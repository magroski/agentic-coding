import { expect, mock, test } from 'claude-code/testing'
import type { Args, On } from 'claude-code'

const LANE = 'lane-1'
const AUDITOR = 'auditor-1'
const LANE_PROMPT = 'You are a lane in acme. Invoke the core:build skill for #42.'
const MINUTE = 60_000
const SURFACES = ['terminal', 'desktop'] as const

const BAND = {
  plugin: 'lanes',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 110, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

const PANE = {
  plugin: 'lanes',
  component: 'Pane',
  requestId: 'lanes',
  props: { title: 'Lanes', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

type SpawnFields = Pick<Args<'agent.spawn'>, 'prompt' | 'subagentType'> & Partial<Args<'agent.spawn'>>

function spawn(fields: SpawnFields): Args<'agent.spawn'> {
  return {
    tool_use_id: 'toolu_spawn',
    description: 'Invoice CSV export',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
    ...fields,
  }
}

// Stands in for the engine: each spawn starts the next id given, each tool answers empty.
function engine(on: On, ids: string[]): void {
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: ids.shift() }))
  on('tool.call', () => ({ result: {}, text: '' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
}

// A Bash call made inside a subagent's loop, as the engine raises it.
function bashIn(agentId: string, command: string): Args<'tool.call'> {
  return { tool: 'Bash', command, tool_use_id: 'toolu_bash', agentId }
}

test("the band shows a lane's stage and its helper's call, on every surface", async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  engine(on, [LANE, AUDITOR])
  await $.agent.spawn(spawn({ prompt: LANE_PROMPT, subagentType: 'general-purpose' }))
  await $.agent.spawn(spawn({ prompt: 'Audit the tests.', subagentType: 'core:test-auditor', parentAgentId: LANE }))
  await clock.advance(MINUTE)
  await $.tool.call(bashIn(AUDITOR, 'npm test -- invoices'))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect((await ui.find({ type: 'Text', text: /^#42/ }))?.text).toBe('#42 Invoice CSV export')
    expect((await ui.find({ type: 'Text', text: /^gate/ }))?.text).toBe('gate · round 1/3')
    expect((await ui.find({ type: 'Text', text: /npm test/ }))?.text).toBe('test-auditor: npm test -- invoices')
    expect((await ui.find({ type: 'Text', text: /^1m$/ }))?.text).toBe('1m')
    await ui.unmount()
  }
})

test('a lane that stopped on a question shows the question in the band', async ($, on) => {
  mock.clock(on, { now: 0 })
  engine(on, [LANE])
  await $.agent.spawn(spawn({ prompt: LANE_PROMPT, subagentType: 'general-purpose' }))
  await $.turn.complete({
    agentId: LANE,
    answer: 'Needs you: Redis or Postgres for counters? Recommend Postgres.',
    durationMs: 1,
    isAborted: false,
    turnId: 'turn_1',
    reason: 'answer',
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /^plan/ }))?.text).toBe('plan · needs you')
  expect((await ui.find({ type: 'Text', text: /Redis/ }))?.text).toBe('Redis or Postgres for counters? Recommend Postgres.')
  await ui.unmount()
})

test("a lane's row opens its detail, and back returns to the list", async ($, on) => {
  mock.clock(on, { now: 0 })
  engine(on, [LANE])
  await $.agent.spawn(spawn({ prompt: LANE_PROMPT, subagentType: 'general-purpose' }))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: `lane-${LANE}` })
    expect(await ui.find({ type: 'Text', text: 'Timeline' })).toBeDefined()

    await ui.press({ key: 'back' })
    expect((await ui.find({ type: 'Text', text: /running/ }))?.text).toBe('1 running')
    await ui.unmount()
  }
})

test('/lanes clear drops finished lanes from the pane and keeps the running one', async ($, on) => {
  mock.clock(on, { now: 0 })
  engine(on, [LANE, 'lane-2'])
  await $.agent.spawn(spawn({ prompt: LANE_PROMPT, subagentType: 'general-purpose' }))
  await $.agent.spawn(spawn({ prompt: 'You are a lane in acme. Invoke the core:build skill for #43.', subagentType: 'general-purpose' }))
  await $.turn.complete({
    agentId: 'lane-2',
    answer: 'Built: #43 Refunds · https://x/pull/115 · merged and deployed',
    durationMs: 1,
    isAborted: false,
    turnId: 'turn_1',
    reason: 'answer',
  })

  const cleared = await $.command.run({
    command: 'lanes',
    args: 'clear',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(cleared.text).toBe('Finished lanes cleared: 1.')

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /running/ }))?.text).toBe('1 running')
  await ui.unmount()
})

test('with no lane the band leaves its space to the engine', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})
