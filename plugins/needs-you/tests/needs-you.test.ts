import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const FLAG_TOOL = 'mcp__needs-you__flag'
const RESOLVE_TOOL = 'mcp__needs-you__resolve'
const SURFACES = ['terminal', 'desktop'] as const
const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 20,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 19 },
  view: {},
}

// The engine's own behaviour beneath the plugin: the band draws nothing, prompts pass.
const bottoms = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'engine', ref: 0 }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
}

const start = ($: Engine) => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

describe('needs-you', () => {
  test('a flagged decision shows in the band until marked done', async ($, on) => {
    bottoms(on)
    await start($)
    const flagged = await $.tool.call({ tool: FLAG_TOOL, title: 'Pick auth', options: ['JWT', 'sessions'] })
    expect(flagged.result).toContain('#1')

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'needs-you', surface, component: 'AbovePrompt', props: BAND_PROPS })
      expect((await ui.find({ key: 'answer-1' }))?.text).toContain('#1 Pick auth (JWT / sessions)')
      await ui.unmount()
    }

    const ui = await $.ui.mount({ plugin: 'needs-you', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
    await ui.press({ key: 'done-1' })
    expect(await ui.find({ key: 'answer-1' })).toBeUndefined()
  })

  test('the band yields to a survey', async ($, on) => {
    bottoms(on)
    await start($)
    await $.tool.call({ tool: FLAG_TOOL, title: 'Pick auth' })

    const ui = await $.ui.mount({
      plugin: 'needs-you',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { ...BAND_PROPS, hasSurvey: true },
    })
    expect(await ui.find({ key: 'answer-1' })).toBeUndefined()
  })

  test('resolve removes only open ids and ids are never reused', async ($, on) => {
    bottoms(on)
    await start($)
    await $.tool.call({ tool: FLAG_TOOL, title: 'First' })
    await $.tool.call({ tool: FLAG_TOOL, title: 'Second' })

    expect((await $.tool.call({ tool: RESOLVE_TOOL, ids: [1, 9] })).result).toBe('Resolved #1.')
    expect((await $.tool.call({ tool: RESOLVE_TOOL, ids: [1] })).result).toBe('None of those ids were open.')
    expect((await $.tool.call({ tool: FLAG_TOOL, title: 'Third' })).result).toContain('#3')
  })

  test('a flag without a title is refused', async ($, on) => {
    bottoms(on)
    await start($)

    const refused = await $.tool.call({ tool: FLAG_TOOL, title: '  ' })
    expect(refused.isError ?? refused.deny !== undefined).toBe(true)
  })

  test('the system prompt guides Claude to flag only where it can call the tool', async ($, on) => {
    bottoms(on)
    on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' }] }))
    const compose = (tools: string[]) =>
      $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools, outputStyle: null, traits: [] })

    const guided = await compose([FLAG_TOOL])
    expect(guided.sections.map(section => section.id)).toEqual(['intro', 'needs-you:guide'])

    const unguided = await compose(['Read'])
    expect(unguided.sections.map(section => section.id)).toEqual(['intro'])
  })

  test('each prompt carries the open items, and none when the list is empty', async ($, on) => {
    bottoms(on)
    await start($)
    const quiet = await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    expect(quiet.context ?? []).toHaveLength(0)

    await $.tool.call({ tool: FLAG_TOOL, title: 'Pick auth' })
    const reminded = await $.prompt.submit({ text: 'JWT', wait: false, origin: { kind: 'composer' } })
    expect(reminded.context?.[0]).toContain('#1 Pick auth')
  })
})
