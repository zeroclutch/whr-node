import { WholeHistoryRating } from '../src/index';
import { UnstableRatingException } from '../src/whr'


let whr: WholeHistoryRating
const setupGameWithRating = (blackRating: number, whiteRating: number, handicap: number) => {
  let game = whr.createGame("black", "white", "W", 1, handicap)
  game.blackPlayer.days[0].elo = blackRating
  game.whitePlayer.days[0].elo = whiteRating
  return game
}

const setup = () => {
  whr = new WholeHistoryRating()
}

beforeAll(setup)

test('even game with no handicap should draw', () => {
  let game = setupGameWithRating(500, 500, 0)
  expect(game.whiteWinProbability).toBeCloseTo(0.5)
  expect(game.blackWinProbability).toBeCloseTo(0.5)
})

test('even game with a handicap should confer advantage', () => {
  let game = setupGameWithRating(500, 500, 10)
  expect(game.blackWinProbability).toBeGreaterThan(0.5)
  expect(game.whiteWinProbability).toBeLessThan(0.5)
})

test('higher rank should confer advantage', () => {
  let game = setupGameWithRating(600, 500, 0)
  expect(game.blackWinProbability).toBeGreaterThan(0.5)
  expect(game.whiteWinProbability).toBeLessThan(0.5)
})

describe('winrate', () => {
  test('is equal for two games with the same rating delta', () => {
    let winProbability1 = setupGameWithRating(100, 200, 0).whiteWinProbability
    let winProbability2 = setupGameWithRating(200, 300, 0).whiteWinProbability
    expect(winProbability1).toBeCloseTo(winProbability2)
  })

  test('for a player twice as strong is expected result', () => {
    let game = setupGameWithRating(200, 100, 0)
    expect(game.whiteWinProbability).toBeCloseTo(0.359935)
  })

  test('should be inversely proportional', () => {
    let game = setupGameWithRating(500, 600, 0)
    expect(game.whiteWinProbability).toBeCloseTo(1 - game.blackWinProbability)
  })
})

describe('output', () => {
  test('over a series of games is expected result', () => {
    whr.createGame('shusaku', 'shusai', "B", 1, 0)
    whr.createGame('shusaku', 'shusai', "W", 2, 0)
    whr.createGame('shusaku', 'shusai', "W", 3, 0)
    whr.createGame('shusaku', 'shusai', "W", 4, 0)
    whr.createGame('shusaku', 'shusai', "W", 4, 0)
    whr.iterate(50)
    expect(whr.ratingsForPlayer('shusaku')).toEqual([[1, -92, 71], [2, -94, 71], [3, -95, 71], [4, -96, 72]])
    expect(whr.ratingsForPlayer('shusai')).toEqual([[1, 92, 71], [2, 94, 71], [3, 95, 71], [4, 96, 72]])
  })

  test('throws unstable rating exception in certain cases', () => {
    for(let i = 1; i <= 10; i++) {
      whr.createGame("anchor", "player", "B", 1, 0)
      whr.createGame("anchor", "player", "W", 1, 0)
    }

    for(let i = 1; i <= 10; i++) {
      whr.createGame("anchor", "player", "B", 180, 600)
      whr.createGame("anchor", "player", "W", 180, 600)
    }
    
    expect(() => { whr.iterate(10) }).toThrowError(UnstableRatingException)
  })

  test('rejects infinite values', () => {
    setupGameWithRating(0, Infinity, 0)
    expect(() => { whr.iterate(10) }).toThrowError(UnstableRatingException)
  })
})