import type { Task, TaskStatus } from '../types'

// Task list domain: folds each task tool's call into one list, and measures it.
//
//   TodoWrite ──(whole list)──┐
//   TaskCreate ──(append)─────┼──▶ Task[] ──▶ progressOf ──▶ { done, total, percent }
//   TaskUpdate ──(patch)──────┤
//   TaskList ──(authoritative)┘

// TodoWrite items carry no id: position is identity, e.g. "todo-0".
const TODO_ID_PREFIX = 'todo-'
const DELETED = 'deleted'
const BAR_FILLED = '█'
const BAR_EMPTY = '░'

export type Todo = { content: string; status: TaskStatus; activeForm: string }

export type NewTask = { id: string; subject: string; activeForm?: string }

export type TaskPatch = {
  taskId: string
  subject?: string
  activeForm?: string
  status?: TaskStatus | typeof DELETED
}

export type ListedTask = { id: string; subject: string; status: TaskStatus }

export type Progress = { done: number; total: number; percent: number }

// Optional field kept out of the value when absent: state holds plain JSON.
const withActiveForm = (activeForm: string | undefined) =>
  activeForm === undefined ? {} : { activeForm }

// TodoWrite sends the whole list on every call: replace.
export const fromTodos = (todos: readonly Todo[]): Task[] =>
  todos.map((todo, index) => ({
    id: `${TODO_ID_PREFIX}${index}`,
    subject: todo.content,
    activeForm: todo.activeForm,
    status: todo.status,
  }))

// TaskCreate: a new task starts pending; a repeated id replaces the old one.
export const addTask = (tasks: readonly Task[], task: NewTask): Task[] => [
  ...tasks.filter(one => one.id !== task.id),
  { id: task.id, subject: task.subject, ...withActiveForm(task.activeForm), status: 'pending' },
]

// TaskUpdate: patch one task's fields; status "deleted" drops it.
export const patchTask = (tasks: readonly Task[], patch: TaskPatch): Task[] => {
  const { status } = patch
  if (status === DELETED) {
    return tasks.filter(one => one.id !== patch.taskId)
  }

  return tasks.map(one => {
    if (one.id !== patch.taskId) {
      return one
    }

    return {
      ...one,
      subject: patch.subject ?? one.subject,
      ...withActiveForm(patch.activeForm ?? one.activeForm),
      status: status ?? one.status,
    }
  })
}

// TaskList is the source of truth: adopt its set and order, keep known activeForms.
export const syncTasks = (tasks: readonly Task[], listed: readonly ListedTask[]): Task[] => {
  const known = new Map(tasks.map(one => [one.id, one]))

  return listed.map(item => ({
    id: item.id,
    subject: item.subject,
    ...withActiveForm(known.get(item.id)?.activeForm),
    status: item.status,
  }))
}

export const progressOf = (tasks: readonly Task[]): Progress => {
  const total = tasks.length
  const done = tasks.filter(one => one.status === 'completed').length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return { done, total, percent }
}

// Bar of `width` cells filled by share done, e.g. 3/8 at 8 → "███░░░░░".
export const progressBar = (progress: Progress, width: number): string => {
  const filled = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * width)

  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(width - filled)
}
