// The adapter between the engine and the lanes model: each hook turns an
// engine event into a Signal for the tracker, and each drawing reads the
// Board back. Observers only: every hook passes its event on unchanged.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { EMPTY, MAIN, PLAN_FILE, apply } from './tracker'
import type { Signal, ToolInput } from './tracker'
import { band, detail, pane } from './views'
import type { Actions } from './views'

const PANE = 'lanes'
const COMMAND = 'lanes'
// Typed slash commands that make the main conversation a lane.
const SKILL_COMMANDS = new Set(['core:build', 'core:task'])
// How often ages redraw while a lane runs.
const TICK_MS = 5000

const board = atom({ plugin: 'lanes', key: 'board' } as const, EMPTY)
const selected = atom({ plugin: 'lanes', key: 'selected' } as const, null)
const tick = atom({ plugin: 'lanes', key: 'tick' } as const, 0)

// Folds one observation into the board; an observer never fails the event it watches.
async function record($: EngineInterface, signal: Signal): Promise<void> {
  try {
    await update($, board, current => apply(current ?? EMPTY, signal))
  } catch (error) {
    $.ui.log(`lanes: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Re-reads a plan the lane just touched; one that cannot be read leaves the lane as it was.
async function recordPlan($: EngineInterface, loopId: string, path: string): Promise<void> {
  try {
    const text = await $.fs.read(path)
    await record($, { kind: 'plan', loopId, path, text, at: await $.clock.now() })
  } catch {
    // The file moved or is not there yet.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show build lanes: each stage, its helper agents and what they are doing',
    })
    $.clock.every(TICK_MS, async () => {
      const current = await read($, board)
      if (current.lanes.some(lane => lane.state === 'running')) await update($, tick, n => (n ?? 0) + 1)
    })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    await update($, selected, () => null)
    await $.ui.open({ id: PANE, title: 'Lanes' })

    return { text: 'Lanes pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId === undefined) return started

    await record($, {
      kind: 'spawn',
      id: started.agentId,
      parentId: e.parentAgentId ?? MAIN,
      type: e.subagentType,
      description: e.description,
      prompt: e.prompt,
      at: await $.clock.now(),
    })

    return started
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) await record($, { kind: 'turn', loopId: e.agentId, at: await $.clock.now() })

    return next(e)
  })

  // A typed /core:build or /core:task runs as a prompt, not as a Skill call.
  on('prompt.submit', async ($, e, next) => {
    if (e.command && SKILL_COMMANDS.has(e.command.name)) {
      await record($, {
        kind: 'tool',
        loopId: MAIN,
        tool: 'Skill',
        input: { skill: e.command.name, args: e.command.args },
        at: await $.clock.now(),
      })
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const { tool, tool_use_id: _id, agentId, ...rest } = e
    const input = rest as ToolInput
    const loopId = agentId ?? MAIN
    await record($, { kind: 'tool', loopId, tool, input, at: await $.clock.now() })

    const ran = await next(e)
    if (ran.deny !== undefined) return ran

    // Only Bash output carries what the tracker reads: a PR number, CI's verdict, a merge.
    if (tool === 'Bash') {
      const text = 'text' in ran && typeof ran.text === 'string' ? ran.text : ''
      const isError = 'isError' in ran && ran.isError === true
      await record($, { kind: 'output', loopId, tool, input, text, isError, at: await $.clock.now() })
    }
    const path = input.file_path
    if (typeof path === 'string' && PLAN_FILE.test(path)) await recordPlan($, loopId, path)

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await record($, { kind: 'end', loopId: e.agentId ?? MAIN, answer: e.answer, at: await $.clock.now() })

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const current = await read($, board)
    await read($, tick)
    const tree = band($.ui.resolve(e), current, await $.clock.now(), e.props.bodyColumns)

    return tree ?? next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const current = await read($, board)
    const laneId = await read($, selected)
    await read($, tick)
    const now = await $.clock.now()
    const kit = $.ui.resolve(e)
    const actions: Actions = {
      select: id => void update($, selected, () => id),
      view: loopId => void $.ui.view({ agentId: loopId }),
    }
    const lane = current.lanes.find(one => one.id === laneId)

    return lane ? detail(kit, current, lane, now, actions) : pane(kit, current, now, e.props.bodyColumns, actions)
  })
}
