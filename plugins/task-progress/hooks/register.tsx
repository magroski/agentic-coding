import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { addTask, fromTodos, patchTask, progressBar, progressOf, syncTasks } from './tasks'
import type { Task, TaskStatus } from '../types'

// Mirrors the session's task list into a small pane:
//
//   ┌ Tasks ─────────────────────┐
//   │ █████░░░░░░░░░  3/8 · 38%  │
//   │ ✔ Write failing test       │
//   │ ▶ Fixing the parser        │
//   │ ○ Update docs              │
//   └────────────────────────────┘
//
// The task tools' calls feed the list; the pane opens itself on the first task
// and stays shut once the person closes it, until /task-progress.

const PANE = 'task-progress'
const TITLE = 'Tasks'
const COMMAND = 'task-progress'
// Small window: dock width when fullscreen, height cap when inline.
const DOCK_COLUMNS = 40
const MAX_INLINE_ROWS = 12
const HEADER_ROWS = 1
const MIN_BAR = 4
const MAX_BAR = 24

const STATUS_GLYPH: Record<TaskStatus, string> = {
  completed: '✔',
  in_progress: '▶',
  pending: '○',
}

const tasks = atom({ plugin: 'task-progress', key: 'tasks' } as const, [])
const isDismissed = atom({ plugin: 'task-progress', key: 'isDismissed' } as const, false)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Observers never gate: on failure, let the call through as it settled.
const passThrough = <E, R>(_$: unknown, e: E, next: (e: E) => R) => next(e)

// Opens the pane unasked, unless it is up or the person closed it.
const reveal = async ($: EngineInterface, count: number) => {
  if (count === 0 || (await read($, isDismissed))) {
    return
  }

  const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (isOpen) {
    return
  }

  const rows = Math.min(count + HEADER_ROWS, MAX_INLINE_ROWS)
  await $.ui.open({ id: PANE, title: TITLE, rows, columns: DOCK_COLUMNS })
}

// Stores the new list and shows it.
const commit = async ($: EngineInterface, change: (list: Task[]) => Task[]) => {
  const list = await update($, tasks, change)
  await reveal($, list.length)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Show task list progress in a pane',
    })
    await reveal($, (await read($, tasks)).length)

    return next(e)
  })

  // Asked for: reopen at any width and stop treating it as dismissed.
  on('command.run', { command: COMMAND }, async $ => {
    await update($, isDismissed, () => false)
    await $.ui.open({ id: PANE, title: TITLE, columns: DOCK_COLUMNS })

    return { text: 'Task progress pane opened.' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') {
      await update($, isDismissed, () => true)
    }

    return next(e)
  }).catch(passThrough)

  // /clear starts new work: drop the old list and its pane.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, tasks, () => [])
      await update($, isDismissed, () => false)
      await $.ui.close({ id: PANE })
    }

    return next(e)
  })

  // A subagent's TodoWrite is its own list, not the session's.
  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined || ran.deny !== undefined || ran.isError) {
      return ran
    }

    await commit($, () => fromTodos(e.todos))

    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) {
      return ran
    }

    const { id } = ran.result.task
    await commit($, list => addTask(list, { id, subject: e.subject, activeForm: e.activeForm }))

    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError || !ran.result.success) {
      return ran
    }

    await commit($, list => patchTask(list, e))

    return ran
  }).catch(passThrough)

  on('tool.call', { tool: 'TaskList' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError) {
      return ran
    }

    await commit($, list => syncTasks(list, ran.result.tasks))

    return ran
  }).catch(passThrough)

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, tasks)

    if (list.length === 0) {
      return <Text dimColor>No tasks yet.</Text>
    }

    // Header: bar sized to what the label leaves, e.g. "██████░░░░  3/5 · 60%".
    const progress = progressOf(list)
    const label = `  ${progress.done}/${progress.total} · ${progress.percent}%`
    const barWidth = clamp(e.props.bodyColumns - label.length, MIN_BAR, MAX_BAR)

    return (
      <Box flexDirection="column">
        <Box key="header" flexDirection="row">
          <Text color="success">{progressBar(progress, barWidth)}</Text>
          <Text bold>{label}</Text>
        </Box>
        {list.map(task => {
          const isDone = task.status === 'completed'
          const isActive = task.status === 'in_progress'

          return (
            <Box key={`task:${task.id}`} flexDirection="row">
              <Text color={isDone ? 'success' : isActive ? 'claude' : 'inactive'}>
                {STATUS_GLYPH[task.status]}{' '}
              </Text>
              <Text dimColor={isDone} bold={isActive} wrap="truncate-end">
                {isActive ? (task.activeForm ?? task.subject) : task.subject}
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
