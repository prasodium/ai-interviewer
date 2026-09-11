import { describe, expect, it } from 'vitest'
import { parseJsonRecovering } from '../src/main/backend/ai/jsonRecovery'
import { AIResponseError } from '../src/main/backend/ai/aiErrors'

describe('parseJsonRecovering', () => {
  it('parses clean JSON directly', () => {
    expect(parseJsonRecovering('{"action":"ask_question"}')).toEqual({ action: 'ask_question' })
  })

  it('recovers JSON wrapped in prose', () => {
    const content = 'Sure, here is the question:\n{"action":"ask_question","question":"Hi"}\nLet me know!'
    expect(parseJsonRecovering(content)).toEqual({ action: 'ask_question', question: 'Hi' })
  })

  it('recovers JSON wrapped in markdown code fences', () => {
    const content = '```json\n{"score": 7}\n```'
    expect(parseJsonRecovering(content)).toEqual({ score: 7 })
  })

  it('throws AIResponseError when no JSON object can be found', () => {
    expect(() => parseJsonRecovering('not json at all')).toThrow(AIResponseError)
  })
})
