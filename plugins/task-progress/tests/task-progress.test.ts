import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const PLUGIN = 'task-progress'
const PANE = 'task-progress'
const SURFACES = ['terminal', 'desktop'] as const

// What a surface hands the pane: a docked body 40 cells wide.
const PANE_PROPS = {
  title: 'Tasks',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

const TODOS = [
  { content: 'Write failing test', status: 'completed', activeForm: 'Writing failing test' },
  { content: 'Fix parser', status: 'in_progress', activeForm: 'Fixing parser' },
  { content: 'Update docs', status: 'pending', activeForm: 'Updating docs' },
] as const

// Beneath the plugin, the pane host: lists what was opened, places every open.
const hostPanes = (on: On, opened: string[]) => {
  on('ui.panes', () => ({
    value: opened.map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
  }))
  on('ui.open', (_$, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
}

// Beneath the plugin, the task tools: ids minted in order, every update applied.
const hostTaskTools = (on: On) => {
  let lastId = 0
  on('tool.call', { tool: 'TaskCreate' }, (_$, e) => ({
    result: { task: { id: String(++lastId), subject: e.subject } },
  }))
  on('tool.call', { tool: 'TaskUpdate' }, (_$, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: [] },
  }))
}

const paneText = async ($: Engine, surface: (typeof SURFACES)[number]) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: PANE, props: PANE_PROPS })
  const texts = (await ui.findAll({ type: 'Text' })).map(found => found.text).join('\n')
  await ui.unmount()

  return texts
}

describe('pane', () => {
  test('says so before any task exists', async ($, on) => {
    hostPanes(on, [])

    for (const surface of SURFACES) {
      expect(await paneText($, surface)).toContain('No tasks yet.')
    }
  })

  test('TodoWrite: counts completed over total and shows the active form', async ($, on) => {
    hostPanes(on, [])
    on('tool.call', { tool: 'TodoWrite' }, (_$, e) => ({ result: { oldTodos: [], newTodos: e.todos } }))

    await $.tool.call({ tool: 'TodoWrite', todos: [...TODOS] })

    for (const surface of SURFACES) {
      const text = await paneText($, surface)
      expect(text).toContain('1/3 · 33%')
      expect(text).toContain('Fixing parser')
      expect(text).toContain('Update docs')
    }
  })

  test('TaskUpdate: completes one task and drops a deleted one', async ($, on) => {
    hostPanes(on, [])
    hostTaskTools(on)

    await $.tool.call({ tool: 'TaskCreate', subject: 'Plan', description: '' })
    await $.tool.call({ tool: 'TaskCreate', subject: 'Build', description: '' })
    await $.tool.call({ tool: 'TaskCreate', subject: 'Obsolete', description: '' })
    await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
    await $.tool.call({ tool: 'TaskUpdate', taskId: '3', status: 'deleted' })

    const text = await paneText($, 'terminal')
    expect(text).toContain('1/2 · 50%')
    expect(text).not.toContain('Obsolete')
  })

  test('TaskUpdate that failed leaves the list as it was', async ($, on) => {
    hostPanes(on, [])
    on('tool.call', { tool: 'TaskCreate' }, () => ({ result: { task: { id: '1', subject: 'Plan' } } }))
    on('tool.call', { tool: 'TaskUpdate' }, (_$, e) => ({
      result: { success: false, taskId: e.taskId, updatedFields: [], error: 'Task not found' },
    }))

    await $.tool.call({ tool: 'TaskCreate', subject: 'Plan', description: '' })
    await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })

    expect(await paneText($, 'terminal')).toContain('0/1 · 0%')
  })

  test('TaskList replaces what was tracked', async ($, on) => {
    hostPanes(on, [])
    hostTaskTools(on)
    on('tool.call', { tool: 'TaskList' }, () => ({
      result: { tasks: [{ id: '9', subject: 'Listed', status: 'completed', blockedBy: [] }] },
    }))

    await $.tool.call({ tool: 'TaskCreate', subject: 'Stale', description: '' })
    await $.tool.call({ tool: 'TaskList' })

    const text = await paneText($, 'terminal')
    expect(text).toContain('1/1 · 100%')
    expect(text).not.toContain('Stale')
  })
})

describe('opening', () => {
  test('opens itself on the first task', async ($, on) => {
    const opened: string[] = []
    hostPanes(on, opened)
    hostTaskTools(on)

    await $.tool.call({ tool: 'TaskCreate', subject: 'Plan', description: '' })

    expect(opened).toEqual([PANE])
  })

  test('does not reopen a pane already up', async ($, on) => {
    const opened: string[] = []
    hostPanes(on, opened)
    hostTaskTools(on)

    await $.tool.call({ tool: 'TaskCreate', subject: 'Plan', description: '' })
    await $.tool.call({ tool: 'TaskCreate', subject: 'Build', description: '' })

    expect(opened).toEqual([PANE])
  })
})
