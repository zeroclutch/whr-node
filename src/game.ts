import Player from 'player'
import { UnstableRatingException, RatingException } from 'base'
import PlayerDay from 'player-day'

export default class Game {

    day: number
    whitePlayer: Player
    blackPlayer: Player
    winner: string
    _handicap: number | Function
    wpd: PlayerDay | null
    bpd: PlayerDay | null
    extras: object

    constructor(black: Player, white: Player, winner: string, timeStep: number, handicap: number | Function, extras?: object) {
        this.day = timeStep
        this.whitePlayer = white
        this.blackPlayer = black
        this.winner = winner
        this._handicap = handicap || 0

        this.wpd = null
        this.bpd = null
        this.extras = extras || {}
    }

    get inspect(): string {
        return JSON.stringify(this)
    }

    get handicap(): number {
        if(this._handicap instanceof Function) return this._handicap()
        return this._handicap
    }

    opponentsAdjustedGamma(player: Player) {
      let blackAdvantage = this.handicap
      let opponentElo
      if (player === this.whitePlayer)
        opponentElo = this.bpd!.elo + blackAdvantage
      else if (player === this.blackPlayer)
        opponentElo = this.wpd!.elo - blackAdvantage
      else
        throw new RatingException(`No opponent for ${player.inspect}, since they're not in this game: ${this.inspect}.`)
      let rval = 10**(opponentElo/400.0)
      if (rval == 0 || !isFinite(rval) || isNaN(rval))
        throw new UnstableRatingException(`Bad adjusted gamma: ${this.inspect}`)
      return rval
    }

    opponent(player: Player) {
        if(player == this.whitePlayer)
            return this.blackPlayer
        return this.whitePlayer
    }

    get predictionScore(): number {
      if (this.whiteWinProbability == 0.5)
        return 0.5
      else
        return ((this.winner == "W" && this.whiteWinProbability > 0.5) || (this.winner == "B" && this.whiteWinProbability < 0.5)) ? 1.0 : 0.0
    }

    // This is the Bradley-Terry Model
    get whiteWinProbability() {
      return this.wpd!.gamma/(this.wpd!.gamma + this.opponentsAdjustedGamma(this.whitePlayer))
    }
  
    get blackWinProbability() {
        return this.wpd!.gamma/(this.wpd!.gamma + this.opponentsAdjustedGamma(this.whitePlayer))
    }
}