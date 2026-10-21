import { describe, expect, test } from 'claude-code/testing'

import type { Board, Lane } from '../types'
import { EMPTY, MAIN, apply, clearFinished, describeCall, helpersOf, parsePlan, stageOf, summarizeReport } from '../hooks/tracker'
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

  // gh's rows as a lane's Bash sees them, from a run where only Vercel's daily cap failed.
  const VERCEL_CAPPED = 'Vercel\tfail\t0\thttps://vercel.com/acme?upgradeToPro=build-rate-limit\tDeployment rate limited — retry in 24 hours.'
  const CHECK_PASSED = 'check\tpass\t1m5s\thttps://github.com/acme/app/actions/runs/1/job/2\t'
  const CHECKS = [
    ['watched to the end', [VERCEL_CAPPED, CHECK_PASSED, 'Refreshing checks status every 20 seconds. Press Ctrl+C to quit.', '', VERCEL_CAPPED, CHECK_PASSED], true],
    ['piped through tail, which exits 0', [VERCEL_CAPPED, CHECK_PASSED], false],
  ] as const
  for (const [how, rows, isError] of CHECKS) {
    test(`CI names the check that failed when ${how}`, () => {
      const board = fold([spawnLane, bashOutput(LANE, 'gh pr checks 114 --watch 2>&1 | tail -4', rows.join('\n'), isError, 1)])

      expect(lane(board).note).toBe('CI red: Vercel')
    })
  }

  test("the lead's post-deploy comment on a lane's PR finishes that lane; one naming no PR does not", () => {
    const merged = fold([
      spawnLane,
      bashOutput(LANE, 'gh pr create --fill', 'https://github.com/acme/app/pull/114\n', false, 1),
      bashOutput(MAIN, 'gh pr merge 114 --squash', '', false, 2),
    ])

    const unnamed = fold([bash(MAIN, 'post() { gh pr comment $1 --body "Post-deploy: pass"; }; post 114', 3)], merged)
    expect(stageOf(lane(unnamed))).toBe('ship')

    const posted = fold([bash(MAIN, 'gh pr comment 114 --body "Post-deploy: immediate checks pass."', 3)], merged)
    expect(lane(posted).state).toBe('done')
    expect(stageOf(lane(posted))).toBe('post')
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

  test("a finished task lists its own helpers, not those of the loop's next task", () => {
    const board = fold([
      spawnLane,
      helper('w1', 'core:test-writer', 1),
      skill(LANE, 'core:build', '48', 2),
      helper('w2', 'core:test-writer', 3),
    ])

    expect(helpersOf(board, lane(board, `${LANE}:42`)).map(loop => loop.id)).toEqual(['w1'])
    expect(helpersOf(board, lane(board)).map(loop => loop.id)).toEqual(['w2'])
  })

  test("a lead's lane prompt to a running lane continues its row, on the same issue or the next", () => {
    const resumed = fold([
      spawnLane,
      helper('w1', 'core:test-writer', 1),
      { ...spawnLane, prompt: 'Founder answered: Postgres. Invoke the core:build skill for #42.', at: 2 },
    ])
    expect(resumed.lanes).toHaveLength(1)
    expect(lane(resumed)).toMatchObject({ issue: 42, then: 48 })
    expect(stageOf(lane(resumed))).toBe('tests')

    const movedOn = fold(
      [
        { ...spawnLane, prompt: '#114 is merged. Next: invoke the core:build skill for #48. This lane then builds #50.', at: 3 },
        skill(LANE, 'core:build', '48', 4),
      ],
      resumed,
    )
    expect(movedOn.lanes.map(one => [one.id, one.issue, one.then])).toEqual([
      [`${LANE}:42`, 42, 48],
      [LANE, 48, 50],
    ])
  })

  // Replays a core:next lead from 2026-10-20: it resumed finished lanes with
  // SendMessage, which reaches the tracker as a spawn carrying the message,
  // then merged each PR and posted every post-deploy itself.
  test('a lead resuming lanes, merging and post-deploying lists each issue once, done at post', () => {
    let clock = 0
    const at = () => ++clock
    const resume = (id: string, prompt: string): Signal => ({ kind: 'spawn', id, parentId: MAIN, type: 'general-purpose', description: `Lane ${id}`, prompt, at: at() })
    const build = (id: string, issue: number) => skill(id, 'core:build', String(issue), at())
    const opened = (id: string, pr: number) => bashOutput(id, 'gh pr create --fill', `https://github.com/o/r/pull/${pr}`, false, at())
    const report = (id: string, answer: string) => end(id, answer, at())
    const merge = (pr: number) => bashOutput(MAIN, `gh pr merge ${pr} --squash`, '', false, at())
    const postDeploy = (pr: number) => bash(MAIN, `gh pr comment ${pr} --body "Post-deploy: immediate checks pass."`, at())

    const board = fold([
      resume('A', 'You are a lane. Invoke the core:build skill for #86.\n(This lane then builds #87, once #86 is merged and you are resumed.)'),
      build('A', 86), opened('A', 90), report('A', 'Built: #86 Keep it · https://x/pull/90 · ready to merge\nNeeds you: nothing.'),
      resume('A', 'The default branch moved: merge it in, rerun the suite, push, wait for CI, report.'),
      report('A', 'PR #90 is up to date with main and ready to merge.\nNeeds you: nothing.'),
      merge(90),
      resume('A', '#90 is merged. Start #87 now from the updated default branch.'),
      build('A', 87), opened('A', 94), report('A', '#87 is ready to merge as PR #94.\nNeeds you: only the triage.'),
      merge(94),
      resume('A', '#94 is merged. Next: invoke the core:build skill for #91. This lane then builds #80, once #91 is merged.'),
      build('A', 91), opened('A', 96), report('A', '#91 is ready to merge as PR #96.\nNeeds you: one fact.'),
      merge(96),
      resume('A', '#96 is merged. Next: invoke the core:build skill for #80.'),
      build('A', 80), opened('A', 101), report('A', '#80 is ready to merge as PR #101.\nNeeds you: nothing.'),
      merge(101),
      resume('C', 'You are a lane. Invoke the core:build skill for #81.\n(This lane then builds #82, once #81 is merged and you are resumed.)'),
      build('C', 81), opened('C', 97), report('C', 'Built: #81 Wizard · https://x/pull/97 · ready to merge\nNeeds you: nothing.'),
      merge(97),
      resume('C', '#97 is merged. Next: invoke the core:build skill for #82 (her photo).'),
      build('C', 82), opened('C', 115), report('C', '#82 is ready to merge: https://x/pull/115.\nNeeds you: nothing for the founder.'),
      merge(115),
      resume('C', 'The founder decided. Invoke the core:build skill for #102.'),
      build('C', 102),
      ...[90, 94, 96, 101, 97, 115].map(postDeploy),
    ])

    expect(board.lanes.map(one => [one.id, one.issue, stageOf(one), one.state])).toEqual([
      ['A:86', 86, 'post', 'done'],
      ['A:87', 87, 'post', 'done'],
      ['A:91', 91, 'post', 'done'],
      ['A', 80, 'post', 'done'],
      ['C:81', 81, 'post', 'done'],
      ['C:82', 82, 'post', 'done'],
      ['C', 102, 'plan', 'running'],
    ])
  })

  test('clearing drops merged and done lanes and keeps one waiting for its merge', () => {
    const board = fold([
      spawnLane,
      bashOutput(LANE, 'gh pr create --fill', 'https://github.com/acme/app/pull/114', false, 1),
      bashOutput(MAIN, 'gh pr merge 114 --squash', '', false, 2),
      { ...spawnLane, id: 'lane-2', prompt: 'Invoke the core:build skill for #43.', at: 3 },
      end('lane-2', 'Built: #43 Refunds · https://x/pull/115 · ready to merge', 4),
      { ...spawnLane, id: 'lane-3', prompt: 'Invoke the core:build skill for #44.', at: 5 },
      end('lane-3', 'Built: #44 Receipts · https://x/pull/116 · merged and deployed', 6),
    ])

    expect(clearFinished(board).lanes.map(one => one.id)).toEqual(['lane-2'])
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
