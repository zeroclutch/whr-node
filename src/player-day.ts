import Player from './player'
import Game from './game';
import { UnstableRatingException } from './whr';

export default class PlayerDay {
    // attr_accessor :won_games, :lost_games, :name, :day, :player, :r, :is_first_day, :uncertainty
    player: Player
    day: number
    isFirstDay: boolean
    wonGames: Game[]
    lostGames: Game[]
    _wonGameTerms: number[][] | null
    _lostGameTerms: number[][] | null
    uncertainty: null | number
    r!: number

    // TODO: Find out what day type is
    constructor(player: Player, day: number) {
        this.player = player
        this.day = day
        this.isFirstDay = false
        this.wonGames = []
        this.lostGames = []
        this._wonGameTerms = null
        this._lostGameTerms = null
        this.uncertainty = null
    }

    set gamma(gamma: number) {
        this.r = Math.log(gamma)
    }

    get gamma(): number {
        return Math.exp(this.r)
    }

    set elo(elo: number) {
        this.r = elo * (Math.log(10) / 400.0)
    }

    get elo(): number {
        return (this.r * 400.0) / (Math.log(10))
    }

    get logLikelihood(): number {
        return 0
    }

    clearGameTermsCache() {
        this._wonGameTerms = null
        this._lostGameTerms = null
    }

    get wonGameTerms() {
        if (!this._wonGameTerms) {
            this._wonGameTerms = this.wonGames.map((g: Game) => {
                let otherGamma = g.opponentsAdjustedGamma(this.player)
                if (otherGamma === 0 || isNaN(otherGamma) || !isFinite(otherGamma)) {
                    throw new UnstableRatingException(`otherGamma (${g.opponent(this.player).inspect}) = ${otherGamma}`)
                }
                return [1.0, 0.0, 1.0, otherGamma]
            })
            if (this.isFirstDay) {
                this._wonGameTerms!.push([1.0, 0.0, 1.0, 1.0]) // win against virtual player ranked with gamma = 1.0
            }
        }
        return this._wonGameTerms
    }

    get lostGameTerms() {
        if (!this._lostGameTerms) {
            this._lostGameTerms = this.lostGames.map((g: Game) => {
                let otherGamma = g.opponentsAdjustedGamma(this.player)
                if (otherGamma === 0 || isNaN(otherGamma) || !isFinite(otherGamma)) {
                    console.log(`otherGamma (${g.opponent(this.player).inspect}) = ${otherGamma}`)
                }
                return [0.0, otherGamma, 1.0, otherGamma]
            })
            if (this.isFirstDay) {
                this._lostGameTerms!.push([0.0, 1.0, 1.0, 1.0]) // loss against virtual player ranked with gamma = 1.0
            }
        }
        return this._lostGameTerms
    }

    get logLikelihoodSecondDerivative(): number {
        let sum = 0.0
        let terms = this.wonGameTerms!.concat(this.lostGameTerms)
        terms.forEach((term: number[]) => {
            let c = term[2], d = term[3]
            sum += (c * d) / ((c * this.gamma + d) ** 2.0)
        })
        if(isNaN(this.gamma)) throw new UnstableRatingException(`Gamma cannot be NaN`)
        if(isNaN(sum)) throw new UnstableRatingException(`Sum cannot be NaN`)
        return -1 * this.gamma * sum
    }

    get logLikelihoodDerivative(): number {
        let tally = 0
        let terms = this.wonGameTerms!.concat(this.lostGameTerms)
        terms.forEach((term: number[]) => {
            let c = term[2], d = term[3]
            tally += c / (c * this.gamma + d)
        })
        return this.wonGameTerms!.length - this.gamma * tally
    }

    addGame(game: Game) {
        if ((game.winner == "W" && game.whitePlayer === this.player) ||
            (game.winner == "B" && game.blackPlayer === this.player)) {
            this.wonGames.push(game)
        } else {
            this.lostGames.push(game)
        }
    }

    updateBy1DNewtonsMethod() {
        let dlogp = this.logLikelihoodDerivative
        let d2logp = this.logLikelihoodSecondDerivative
        let dr = (dlogp / d2logp)
        let new_r = this.r - dr
        this.r = new_r
    }

}