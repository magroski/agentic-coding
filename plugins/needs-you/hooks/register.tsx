import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type { Board, Decision } from '../types'

//  Claude ──flag──▶ board ($.state) ──▶ band above the prompt ──press──▶ "Re #3: " in prompt
//    ▲                 │
//    └──resolve◀── reminder of open items attached to each user prompt
const PLUGIN = 'needs-you'
const FLAG_TOOL = 'mcp__needs-you__flag'
const RESOLVE_TOOL = 'mcp__needs-you__resolve'
const GUIDE_SECTION = `${PLUGIN}:guide`

// System prompt section: makes Claude flag decisions as they arise, not at the end of its reply.
const GUIDE = `# Decisions that need the user
The user watches a live list of decisions that need them, above their prompt, and can answer while you work.
- The moment you need something only the user can give (a choice between approaches, approval for a risky or irreversible step, missing information, credentials, a manual action), call ${FLAG_TOOL} with a one-line title. Do it mid-task; do not hold it for the end of your reply.
- Then keep going with any work the decision does not block.
- When the user settles an item, or it no longer applies, call ${RESOLVE_TOOL} with its id.
- Do not flag what you can reasonably decide yourself, and do not flag the same thing twice.`

const FLAG_SPEC = {
  name: 'flag',
  description:
    "Adds a decision that needs the user to the live list above their prompt. Call it as soon as the need arises, then continue with unblocked work. Not for choices you can reasonably make yourself, or for an item already open. Returns the item's id; the user's answer arrives in a later message, often starting 'Re #<id>:'.",
  isDeferred: false,
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: "One line, at most 80 characters, phrased as the question. E.g. 'Pick auth: JWT or sessions?'",
      },
      options: { type: 'array', items: { type: 'string' }, description: 'Short choices, when there are any.' },
    },
    required: ['title'],
  },
}

const RESOLVE_SPEC = {
  name: 'resolve',
  description:
    "Removes decisions from the user's list once they are settled or moot: the user answered, or the work no longer needs the answer. Ids that are not open are skipped; the result lists the ones removed.",
  isDeferred: false,
  inputSchema: {
    type: 'object',
    properties: {
      ids: { type: 'array', items: { type: 'integer' }, minItems: 1, description: 'Ids returned by flag, e.g. [3].' },
    },
    required: ['ids'],
  },
}

// --- Board: the session's pending decisions. Hooks go through these
// functions only, never through $.state directly. (The engine refuses
// `$` passed across an import, so this layer lives in this file.)
const board = atom({ plugin: 'needs-you', key: 'board' } as const, { nextId: 1, items: [] })

const listOpen = async ($: StateDollar): Promise<Decision[]> => (await read($, board)).items

// Appends a decision under a fresh id and returns it.
async function addDecision($: StateDollar, title: string, options?: string[]): Promise<Decision> {
  // update() may rerun the change on a version miss; the last run is the one stored.
  let added: Decision = { id: 0, title }
  await update($, board, (current): Board => {
    added = options ? { id: current.nextId, title, options } : { id: current.nextId, title }
    return { nextId: current.nextId + 1, items: [...current.items, added] }
  })

  return added
}

// Removes the given ids; returns the ones that were open.
async function resolveDecisions($: StateDollar, ids: number[]): Promise<number[]> {
  let removed: number[] = []
  await update($, board, (current): Board => {
    removed = current.items.filter(item => ids.includes(item.id)).map(item => item.id)
    return { ...current, items: current.items.filter(item => !ids.includes(item.id)) }
  })

  return removed
}

const clearDecisions = ($: StateDollar): Promise<Board> => update($, board, current => ({ ...current, items: [] }))

// --- Hooks
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

const describe = (item: Decision): string =>
  item.options ? `#${item.id} ${item.title} (${item.options.join(' / ')})` : `#${item.id} ${item.title}`

export const register: Register = on => {
  // Tools registered at start so the first turn can flag.
  on('session.start', async ($, e, next) => {
    await $.tool.register(FLAG_SPEC)
    await $.tool.register(RESOLVE_SPEC)

    return next(e)
  })

  // Guide only prompts that can call the tool (a subagent may not have it).
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.tools.includes(FLAG_TOOL)) {
      return composed
    }

    return { sections: [...composed.sections, { id: GUIDE_SECTION, text: GUIDE, scope: 'session' }] }
  })

  on('tool.call', { tool: FLAG_TOOL }, async ($, e) => {
    const input = e as { title?: unknown; options?: unknown }
    if (!isString(input.title)) {
      return { deny: 'title must be a non-empty string.' }
    }

    const options = Array.isArray(input.options) ? input.options.filter(isString) : []
    const item = await addDecision($, input.title.trim(), options.length > 0 ? options : undefined)

    return {
      result: `Flagged as #${item.id}; the user sees it now. Continue with work it does not block. Call ${RESOLVE_TOOL} with id ${item.id} once settled.`,
    }
  })

  on('tool.call', { tool: RESOLVE_TOOL }, async ($, e) => {
    const input = e as { ids?: unknown }
    const ids = Array.isArray(input.ids) ? input.ids.filter(Number.isInteger) : []
    if (ids.length === 0) {
      return { deny: 'ids must be a non-empty list of integers.' }
    }

    const removed = await resolveDecisions($, ids)
    if (removed.length === 0) {
      return { result: 'None of those ids were open.' }
    }

    return { result: `Resolved ${removed.map(id => `#${id}`).join(', ')}.` }
  })

  // Remind Claude what is still open, so the user's reply can close items
  // even after the flag calls were compacted away.
  on('prompt.submit', async ($, e, next) => {
    const items = await listOpen($)
    if (items.length === 0) {
      return next(e)
    }

    const reminder = `Open ${PLUGIN} items: ${items.map(describe).join('; ')}. If this message settles any, call ${RESOLVE_TOOL}.`

    return next({ ...e, context: [...(e.context ?? []), reminder] })
  })

  // /clear starts a fresh conversation; stale decisions go with it.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await clearDecisions($)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const items = await listOpen($)
    if (e.props.hasSurvey || items.length === 0) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text key="header" color="warning" bold>
          Needs you · {String(items.length)}
        </Text>
        {items.map(item => (
          <Box key={`row-${item.id}`} gap={1}>
            <Button
              key={`answer-${item.id}`}
              plain
              onPress={() => void $.prompt.fill({ text: `Re #${item.id}: `, mode: 'insert' })}
            >
              {describe(item)}
            </Button>
            <Button
              key={`done-${item.id}`}
              plain
              dimColor
              label="done"
              onPress={() => void resolveDecisions($, [item.id])}
            />
          </Box>
        ))}
      </Box>
    )
  })
}
