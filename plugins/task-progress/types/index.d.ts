export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type Task = {
  id: string
  subject: string
  activeForm?: string
  status: TaskStatus
}

declare module 'claude-code' {
  interface PluginState {
    'task-progress': { tasks: Task[]; isDismissed: boolean }
  }
}
