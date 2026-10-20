// The build skill's pipeline stages, in order.
export type Stage = 'plan' | 'tests' | 'gate' | 'build' | 'review' | 'pr' | 'merge' | 'ship' | 'post'

// Where a lane stands as a whole. `idle`: the main loop stopped mid-build
// with no report; `ready`: a PR waits for the founder's merge.
export type LaneState = 'running' | 'idle' | 'needs-you' | 'ready' | 'blocked' | 'failed' | 'done'

export type Activity = { text: string; at: number }

// One model loop: a subagent, or the main conversation (id `main`).
export type Loop = {
  id: string
  type: string
  description: string
  // The loop that spawned it; `main` for the main conversation.
  parentId?: string
  isDone: boolean
  startedAt: number
  endedAt?: number
  activity?: Activity
  // One line from its final report, once done: "7/7 pass", "gate PASS".
  outcome?: string
}

export type StageEntry = { stage: Stage; at: number }

// One task being built: by a lane agent of the next skill, or by the main
// conversation running the build skill itself.
export type Lane = {
  // Unique per task: the loop's id, or `<loop>:<issue>` once the loop moved on.
  id: string
  // The loop running the build skill.
  loop: string
  issue?: number
  title: string
  // The issue this lane builds next, from the next skill's lane prompt.
  then?: number
  state: LaneState
  question?: string
  // Stage changes, oldest first; the last is the current stage.
  history: StageEntry[]
  // Qualifies the current stage: "round 2/2", "fix round", "CI red".
  note?: string
  gateRounds: number
  reviewRounds: number
  wayBacks: number
  steps?: { done: number; total: number }
  plan?: string
  decision?: string
  pr?: number
  startedAt: number
}

export type Board = { lanes: Lane[]; loops: Record<string, Loop> }

declare module 'claude-code' {
  interface PluginState {
    lanes: { board: Board; selected: string | null; tick: number }
  }
}
