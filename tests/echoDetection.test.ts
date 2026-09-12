import { describe, expect, it } from 'vitest'
import { isLikelyEchoOfQuestion, isLikelySilenceHallucination } from '../src/renderer/src/services/echoDetection'

describe('isLikelyEchoOfQuestion', () => {
  it('flags a near-verbatim echo of the question as not a real answer', () => {
    const question =
      'Can you share your educational background and any relevant projects or experiences that sparked your interest in software engineering?'
    const echoedAnswer =
      'Your educational background and any relevant projects or experiences that sparked your interest in software engineering.'
    expect(isLikelyEchoOfQuestion(question, echoedAnswer)).toBe(true)
  })

  it('flags a reworded but still mostly-repeated echo', () => {
    const question =
      "Hi, thanks for taking the time today. I'll be conducting your Software Engineer interview. Before we get into specifics, tell me a bit about yourself and what interests you about this role."
    const echoedAnswer =
      "Thanks for taking the time today. I'll be conducting your software engineer interview before we get into specifics tell me a bit about yourself and what interests you about this"
    expect(isLikelyEchoOfQuestion(question, echoedAnswer)).toBe(true)
  })

  it('does not flag a genuine, unrelated answer', () => {
    const question = 'Tell me a bit about yourself and what interests you about this role.'
    const realAnswer =
      "I'm a backend engineer with three years of experience building APIs in Python and Go, and I'm drawn to this role because I love solving distributed systems problems."
    expect(isLikelyEchoOfQuestion(question, realAnswer)).toBe(false)
  })

  it('does not flag a short genuine answer even if a few words overlap', () => {
    const question = 'What interests you about software engineering?'
    const realAnswer = "I've always loved building things and solving puzzles."
    expect(isLikelyEchoOfQuestion(question, realAnswer)).toBe(false)
  })

  it('ignores very short answers regardless of overlap', () => {
    expect(isLikelyEchoOfQuestion('Tell me about software engineering.', 'software engineering')).toBe(false)
  })
})

describe('isLikelySilenceHallucination', () => {
  it('flags the exact Whisper hallucination seen in a real silent recording', () => {
    expect(isLikelySilenceHallucination('Thank you for watching!')).toBe(true)
    expect(isLikelySilenceHallucination('Thank you for watching.')).toBe(true)
  })

  it('flags other known silence-hallucination phrases', () => {
    expect(isLikelySilenceHallucination('Please subscribe')).toBe(true)
    expect(isLikelySilenceHallucination('bye bye')).toBe(true)
  })

  it('does not flag a genuine answer that happens to start with thanks', () => {
    expect(
      isLikelySilenceHallucination(
        "Thank you for the question - I've worked mostly with React and Node over the past two years."
      )
    ).toBe(false)
  })
})
