import { describe, expect, test } from 'claude-code/testing'

import type { Board, Lane } from '../types'
import { EMPTY, MAIN, apply, describeCall, parsePlan, stageOf, summarizeReport } from '../hooks/tracker'
import type { Signal } from '../hooks/tracker'

const LANE = 'lane-1'
const LANE_PROMPT = 'You are a lane in acme. Invoke the core:build skill for #42.\n(This lane then builds #48, once #42 is merged and you are resumed.)'

function fold(signals: Signal[], from: Board = EMPTY): Board {
  return signals.reduce(apply, from)
}

function lane(board: Board, id = LANE): Lane {
  const found = board.lanes.find(one => one.id === id)
  if (!found) throw new Error(`no lane ${id}`)
  return found
}

const spawnLane: Signal = { kind: 'spawn', id: LANE, parentId: MAIN, type: 'general-purpose', description: 'Lane #42', prompt: LANE_PROMPT, at: 0 }

function helper(id: string, type: string, at: number): Signal {
  return { kind: 'spawn', id, parentId: LANE, type, description: type, prompt: 'brief', at }
}

function end(loopId: string, answer: string, at: number): Signal {
  return { kind: 'end', loopId, answer, at }
}

function bash(loopId: string, command: string, at: number): Signal {
  return { kind: 'tool', loopId, tool: 'Bash', input: { command }, at }
}

function bashOutput(loopId: string, command: string, text: string, isError: boolean, at: number): Signal {
  return { kind: 'output', loopId, tool: 'Bash', input: { command }, text, isError, at }
}

function skill(loopId: string, name: string, args: string, at: number): Signal {
  return { kind: 'tool', loopId, tool: 'Skill', input: { skill: name, args }, at }
}

describe('lanes', () => {
  test('a lane prompt opens a lane on its issue and remembers the one queued after it', () => {
    const board = fold([spawnLane])

    expect(lane(board)).toMatchObject({ issue: 42, then: 48, state: 'running' })
    expect(stageOf(lane(board))).toBe('plan')
  })

  test('an agent spawned without a lane prompt is not a lane', () => {
    const board = fold([{ ...spawnLane, prompt: 'Find the auth middleware.' }])

    expect(board.lanes).toEqual([])
  })

  test('helpers move the lane through tests, gate and review, counting rounds', () => {
    const afterFirstGate = fold([
      spawnLane,
      helper('w1', 'core:test-writer', 1),
      helper('a1', 'core:test-auditor', 2),
      end('a1', 'Gate: FAIL', 3),
    ])
    expect(stageOf(lane(afterFirstGate))).toBe('gate')

    const afterSecondGate = fold(
      [helper('w2', 'core:test-writer', 4), helper('a2', 'core:test-auditor', 5)],
      afterFirstGate,
    )
    expect(lane(afterSecondGate)).toMatchObject({ gateRounds: 2, note: 'round 2/3' })

    const building = fold([end('a2', 'Gate: PASS', 6)], afterSecondGate)
    expect(stageOf(lane(building))).toBe('build')

    const firstReview = fold([helper('v1', 'core:verifier', 7), helper('r1', 'core:reviewer', 8)], building)
    expect(lane(firstReview)).toMatchObject({ reviewRounds: 1, note: undefined })
    expect(stageOf(lane(firstReview))).toBe('review')

    const fixRound = fold([helper('v2', 'core:verifier', 9), helper('r2', 'core:reviewer', 10)], firstReview)
    expect(lane(fixRound)).toMatchObject({ reviewRounds: 2, note: 'fix round' })
  })

  test('a finished helper continued for a fix round counts a new round; its first turn does not', () => {
    const audited = fold([
      spawnLane,
      helper('w1', 'core:test-writer', 1),
      end('w1', 'Files: a.test.ts', 2),
      helper('a1', 'core:test-auditor', 3),
      { kind: 'turn', loopId: 'a1', at: 3 },
      end('a1', 'Gate: FAIL', 4),
    ])
    expect(lane(audited).gateRounds).toBe(1)

    const rewriting = fold([{ kind: 'turn', loopId: 'w1', at: 5 }], audited)
    expect(stageOf(lane(rewriting))).toBe('tests')

    const reaudit = fold([end('w1', 'Files: a.test.ts', 6), { kind: 'turn', loopId: 'a1', at: 7 }], rewriting)
    expect(lane(reaudit)).toMatchObject({ gateRounds: 2, note: 'round 2/3' })
    expect(stageOf(lane(reaudit))).toBe('gate')
  })

  test('planning again past the plan stage counts a way back; planning first does not', () => {
    const planning = fold([spawnLane, skill(LANE, 'core:build', '42', 1), skill(LANE, 'core:task', '42', 2)])
    expect(lane(planning).wayBacks).toBe(0)

    const wayBack = fold([helper('w1', 'core:test-writer', 3), skill(LANE, 'core:task', '42', 4)], planning)
    expect(lane(wayBack)).toMatchObject({ wayBacks: 1, note: 'way back 1/2' })
    expect(stageOf(lane(wayBack))).toBe('plan')
  })

  test('gh marks the PR, CI and the lead merging it by number', () => {
    const create = 'gh pr create --title "Invoice export" --body-file pr.md'
    const opened = fold([
      spawnLane,
      bash(LANE, create, 1),
      bashOutput(LANE, create, 'https://github.com/acme/app/pull/114\n', false, 2),
      bash(LANE, 'gh pr checks 114 --watch', 3),
    ])
    expect(lane(opened)).toMatchObject({ pr: 114, note: 'CI' })
    expect(stageOf(lane(opened))).toBe('pr')

    const red = fold([bashOutput(LANE, 'gh pr checks 114 --watch', 'lint fail', true, 4)], opened)
    expect(lane(red).note).toBe('CI red')

    const refused = fold([bashOutput(MAIN, 'gh pr merge 114 --squash', 'not mergeable', true, 5)], opened)
    expect(stageOf(lane(refused))).toBe('pr')

    const merged = fold([bashOutput(MAIN, 'gh pr merge 114 --squash', '', false, 5)], opened)
    expect(stageOf(lane(merged))).toBe('ship')
  })

  const REPORTS = [
    ['Built: #42 Invoice export · https://x/pull/114 · ready to merge\nNeeds you: nothing', 'ready', 'merge', undefined],
    ['Built: #42 Invoice export · https://x/pull/114 · merged and deployed', 'done', 'post', undefined],
    ['Built: #42 Invoice export · none · blocked\nNeeds you: add the STRIPE_KEY secret', 'blocked', 'plan', 'add the STRIPE_KEY secret'],
    ['Built: #42 Invoice export · none · failed', 'failed', 'plan', undefined],
    ['Needs you: Redis or Postgres for counters? Recommend Postgres.', 'needs-you', 'plan', 'Redis or Postgres for counters? Recommend Postgres.'],
    ['One-way door: Redis or Postgres? I recommend Postgres.', 'needs-you', 'plan', 'One-way door: Redis or Postgres? I recommend Postgres.'],
  ] as const
  for (const [answer, state, stage, question] of REPORTS) {
    test(`a lane ending with ${JSON.stringify(answer.split('\n')[0])} is ${state} at ${stage}`, () => {
      const board = fold([spawnLane, end(LANE, answer, 1)])

      expect(lane(board)).toMatchObject({ state, question })
      expect(stageOf(lane(board))).toBe(stage)
    })
  }

  test('a lane that stopped runs again when resumed', () => {
    const board = fold([spawnLane, end(LANE, 'Needs you: Redis or Postgres?', 1), { kind: 'turn', loopId: LANE, at: 2 }])

    expect(lane(board)).toMatchObject({ state: 'running', question: undefined })
  })

  test('the main loop stopping mid-build without a report is idle, not waiting on the founder', () => {
    const board = fold([skill(MAIN, 'core:build', '42', 0), end(MAIN, 'Which database should the counters use?', 1)])

    expect(lane(board, MAIN).state).toBe('idle')
  })

  test('the main loop building its next issue keeps the first as a lane of its own', () => {
    const board = fold([skill(MAIN, 'core:build', '#42', 0), skill(MAIN, 'core:build', '48', 1)])

    expect(board.lanes.map(one => [one.id, one.issue])).toEqual([
      [`${MAIN}:42`, 42],
      [MAIN, 48],
    ])
  })

  test('a plan the lane touches names it and counts its steps', () => {
    const plan = [
      '# Invoice CSV export',
      '',
      'Status: In progress',
      'Issue: [#42](https://x/issues/42) · Task 2 of [Billing](README.md)',
      '',
      '## Steps',
      '1. [x] Add exporter | `src/export.ts` | service',
      '2. [x] Add route | `src/routes.ts` | controller',
      '3. [ ] Add button | `web/Invoices.tsx` | ui',
      '',
      '## Decisions',
      '- Auto-approved: no one-way doors (2026-10-20)',
      '- Way back: the CSV library cannot stream; switched to a hand-written writer',
    ].join('\n')

    const board = fold([
      spawnLane,
      helper('w1', 'core:test-writer', 0),
      { kind: 'plan', loopId: 'w1', path: '/repo/docs/plans/billing/02-invoice-csv-export.md', text: plan, at: 1 },
    ])

    expect(lane(board)).toMatchObject({
      title: 'Invoice CSV export',
      steps: { done: 2, total: 3 },
      wayBacks: 1,
      decision: 'Way back: the CSV library cannot stream; switched to a hand-written writer',
    })
  })

  test('a document without Status and Steps is not a plan', () => {
    expect(parsePlan('# Billing epic\n\n## Business rules\n- BR1. Invoices are immutable').isPlan).toBe(false)
  })

  const SUMMARIES = [
    ['core:test-writer', 'Files: a.test.ts\n| C | Test | Fails with |\n| :- | :- | :- |\n| 1 | a | x |\n| 2 | b | y |', '2 failing tests'],
    ['core:test-auditor', 'Suite: npm test: 2 failing\nGate: PASS', 'gate PASS'],
    ['core:map-auditor', 'Findings:\n1. C2 new: always refuses passes | fix: add a good-input row\n\nFollow-ups: none\nMap: FAIL', 'map FAIL'],
    ['core:verifier', '| # | Criterion | Verdict | Evidence |\n| :- | :- | :- | :- |\n| 1 | a | PASS | ok |\n| 2 | b | FAIL | no |\n| F | Frozen | PASS | empty |', '2/3 pass'],
    ['core:reviewer', '**Must fix**\n1. Null user\n2. Leak\n\n**Follow-ups**\n3. Rename', '2 must fix · 1 follow-ups'],
    ['Explore', '\n## Found it\nmore', 'Found it'],
  ] as const
  for (const [type, answer, line] of SUMMARIES) {
    test(`a ${type} report reads as ${JSON.stringify(line)}`, () => {
      expect(summarizeReport(type, answer)).toBe(line)
    })
  }

  const CALLS = [
    ['Bash', { command: 'npm test -- invoices\necho done' }, 'npm test -- invoices'],
    ['Read', { file_path: '/repo/.worktrees/lane-1/src/auth/session.ts' }, 'Read src/auth/session.ts'],
    ['Agent', { subagent_type: 'core:reviewer', description: 'Review diff' }, 'Agent core:reviewer'],
    ['mcp__github__get_pr', {}, 'mcp__github__get_pr'],
  ] as const
  for (const [tool, input, line] of CALLS) {
    test(`a ${tool} call reads as ${JSON.stringify(line)}`, () => {
      expect(describeCall(tool, input)).toBe(line)
    })
  }
})
