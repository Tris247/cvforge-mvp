import { describe, it, expect } from 'vitest'
import { matchesKeywords, matchesLocation, matchesRemote, normalizeText } from '../workers/autoApplyWorker'

describe('autoapply matching helpers', () => {
  it('normalizeText lowercases and returns empty for null', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText('Hello')).toBe('hello')
  })

  it('matchesKeywords handles string and arrays', () => {
    const text = 'Senior Backend Engineer — Node.js, Typescript, Redis'
    expect(matchesKeywords(text, 'node')).toBe(true)
    expect(matchesKeywords(text, 'python')).toBe(false)
    expect(matchesKeywords(text, ['go','typescript'])).toBe(true)
    expect(matchesKeywords(text, '')).toBe(true)
  })

  it('matchesLocation does substring match case-insensitive', () => {
    expect(matchesLocation('New York, NY', 'new')).toBe(true)
    expect(matchesLocation('Remote', 'remote')).toBe(true)
    expect(matchesLocation('San Francisco', 'York')).toBe(false)
    expect(matchesLocation(null, 'any')).toBe(false)
  })

  it('matchesRemote checks job.remote or location', () => {
    expect(matchesRemote({ remote: true }, true)).toBe(true)
    expect(matchesRemote({ remote: false }, true)).toBe(false)
    expect(matchesRemote({ location: 'Remote - US' }, true)).toBe(true)
    expect(matchesRemote({ location: 'New York' }, false)).toBe(true)
  })
})
