// One pending decision, e.g. { id: 3, title: 'Pick auth: JWT or sessions?', options: ['JWT', 'sessions'] }
export type Decision = { id: number; title: string; options?: string[] }

// Open decisions plus the next id; ids never repeat within a session.
export type Board = { nextId: number; items: Decision[] }

declare module 'claude-code' {
  interface PluginState {
    'needs-you': { board: Board }
  }
}
