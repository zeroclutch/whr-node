import Player from './player'
import Game from './game'
import PlayerDay from './player-day'

export interface Config {
    debug?: boolean
    w2?: number
    players?: Map<string, Player>
    games?: Array<Game>
}

export class RatingException extends Error {}

export class UnstableRatingException extends RatingException {}

/**
 * Base class for WHR.
 */
export default class WholeHistoryRating {
    config: Config
    players: Map<string, Player>
    games: Game[]
    constructor(config?: Config) {
        this.config    = config          || {}
        this.config.w2 = this.config.w2      || 300.0
        this.games     = this.config.games   || []
        this.players   = this.config.players || new Map<string, Player>()
    }

    get inspect() {
        return this
    }

    printOrderedRatings() {
        let players = Array.from(this.players.values()).filter(p => p.days.length > 0)
        players.forEach(p => console.log(`${p.name} => ${p.days.map(day => day.elo).join(', ')}`))
    }

    logLikelihood(): number {
        let score = 0.0
        Object.values(this.players).forEach((p: Player) => {
        if(p.days.length > 0)
            score += p.logLikelihood
        })
        return score
    }

    playerByName(name: string): Player {
        let player = this.players.get(name)
        if(!player) {
            player = new Player(name, this.config)
            this.players.set(name, player)
        }
        return player
    }
    
    ratingsForPlayer(name: string) {
        let player: Player = this.playerByName(name)
        return player.days.map((d: PlayerDay) => [d.day, Math.round(d.elo), Math.round(d.uncertainty!*100)])
    }
  
    setupGame(black: string, white: string, winner: string, timeStep: number, handicap: number, extras = {}) {
        // Avoid self-played games (no info)
        if (black == white) {
            throw new RatingException("Invalid game, player cannot play with themself")
        }
        let whitePlayer = this.playerByName(white)
        let blackPlayer = this.playerByName(black)

        return new Game(blackPlayer, whitePlayer, winner, timeStep, handicap, extras)
    }
  
    createGame(black: string, white: string, winner: string, timeStep: number, handicap: number, extras: object = {}) {
        const game: Game = this.setupGame(black, white, winner, timeStep, handicap, extras)
        return this.addGame(game)
    }

    addGame(game: Game) {
        game.whitePlayer.addGame(game)
        game.blackPlayer.addGame(game)
        if(!game.bpd) {
            throw new RatingException(`Bad game: ${game.inspect}`)
        }
        this.games.push(game)
        return game
    }
  
    iterate(count: number): void {
        for(let i = 0; i < count; i++) {
            this.runOneIteration()
        }
        this.players.forEach((p: Player) => p.updateUncertainty())
    }

    runOneIteration(): void {
        this.players.forEach((p: Player) => p.runOneNewtonIteration())
    }
}