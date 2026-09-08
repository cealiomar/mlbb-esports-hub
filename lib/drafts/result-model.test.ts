import { describe, expect, it } from 'vitest'
import { predictDraftOutcome, trainDraftOutcomeModel, type OutcomeGame } from './result-model'

const team1 = ['a', 'b', 'c', 'd', 'e']
const team2 = ['f', 'g', 'h', 'i', 'j']
const game = (winner: 1 | 2): OutcomeGame => ({ team1, team2, winner })

describe('offline learned draft-outcome challenger', () => {
  it('learns actual results deterministically, without preset hero tier scores', () => {
    const first = trainDraftOutcomeModel([game(1), game(1), game(2)])
    const repeat = trainDraftOutcomeModel([game(1), game(1), game(2)])
    expect(predictDraftOutcome(first, team1, team2)).toBeGreaterThan(0.5)
    expect(first.weights).toEqual(repeat.weights)
    expect(predictDraftOutcome(trainDraftOutcomeModel([game(2), game(2), game(1)]), team1, team2)).toBeLessThan(0.5)
  })

  it('does not claim an advantage for unseen or invalid drafts', () => {
    expect(predictDraftOutcome(trainDraftOutcomeModel([]), team1, team2)).toBe(0.5)
    expect(predictDraftOutcome(trainDraftOutcomeModel([game(1)]), team1, team1)).toBe(0.5)
    expect(predictDraftOutcome(trainDraftOutcomeModel([game(1)]), ['k', 'l', 'm', 'n', 'o'], ['p', 'q', 'r', 's', 't'])).toBe(0.5)
  })

  it('is complementary when teams swap and requires three games for pair coefficients', () => {
    const model = trainDraftOutcomeModel([game(1), game(1), game(2)])
    expect(predictDraftOutcome(model, team1, team2) + predictDraftOutcome(model, team2, team1)).toBeCloseTo(1, 12)
    expect([...model.weights.keys()].some((key) => key.startsWith('pair:'))).toBe(true)
    expect([...trainDraftOutcomeModel([game(1)]).weights.keys()].some((key) => key.startsWith('pair:'))).toBe(false)
  })
})
