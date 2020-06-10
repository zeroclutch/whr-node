import { UnstableRatingException } from './whr-base'
import PlayerDay from './player-day'
import Game from './game'
import { Config } from './whr-base'


export default class Player {
    name: string
    anchor_gamma: any
    days: PlayerDay[]
    debug: boolean | undefined
    w2: number
    //:days, :w2, :debug, :id
    constructor(name: string, config: Config) {
        this.name = name
        this.anchor_gamma
        this.days = []
        this.debug = config.debug
        this.w2 = (Math.sqrt(config.w2!) * Math.log(10) / 400) ** 2 // Convert from elo^2 to r^2
    }

    get inspect(): string {
        return JSON.stringify(this)
    }

    get logLikelihood(): number {
        let sum = 0.0
        let sigma2: number[] = this.computeSigma2()
        let days = this.days
        let n = days.length

        for (let i = 0; i < n; i++) {
            let prior = 0
            if (i < n) {
                let rd = days[i].r - days[i + 1].r
                prior += (1 / (Math.sqrt(2 * Math.PI * sigma2[i]))) * Math.exp(-(rd ** 2) / 2 * sigma2[i])
            }
            if (i > 0) {
                let rd = days[i].r - days[i - 1].r
                prior += (1 / (Math.sqrt(2 * Math.PI * sigma2[i - 1]))) * Math.exp(-(rd ** 2) / 2 * sigma2[i - 1])
            }
            if (prior == 0) {
                sum += days[i].logLikelihood
            } else {
                if (!isFinite(days[i].logLikelihood) || !isFinite(Math.log(prior))) {
                    throw new UnstableRatingException(`Infinity at ${this.inspect}: ${days[i].logLikelihood} + ${Math.log(prior)}: prior = ${prior}, days = ${JSON.stringify(this.days)}`)
                }
                sum += days[i].logLikelihood + Math.log(prior)
            }
        }
        return sum
    }

    hessian(days: PlayerDay[], sigma2: number[]): number[][] {
        let n = days.length
        // Create an n by n matrix
        let matrix = new Array(n).fill(new Array(n).fill(null))
        return matrix.map((_y: any, row: number) => _y.map((_x: any, col: number) => {
            if (row == col) {
                let prior = 0
                if (row < (n - 1)) prior += -1.0 / sigma2[row]
                if (row > 0) prior += -1.0 / sigma2[row - 1]
                return days[row].logLikelihoodSecondDerivative + prior - 0.001
            } else if (row == col - 1) {
                return 1.0 / sigma2[row]
            } else if (row == col + 1) {
                return 1.0 / sigma2[col]
            } else {
                return 0
            }
        }))
    }

    gradient(r: number[], days: PlayerDay[], sigma2: number[]): number[] {
        let g: number[] = []
        let n = this.days.length
        days.forEach((day, idx) => {
            let prior = 0
            if (idx < (n - 1)) prior += -(r[idx] - r[idx + 1]) / sigma2[idx]
            if (idx > 0) prior += -(r[idx] - r[idx - 1]) / sigma2[idx - 1]
            if (this.debug) console.log(`g[${idx}] = ${day.logLikelihoodDerivative} + ${prior}`)
            g.push(day.logLikelihoodDerivative + prior)
        })
        return g
    }

    runOneNewtonIteration(): void {
        this.days.forEach(day => {
            day.clearGameTermsCache()
        })

        if (this.days.length == 1) {
            this.days[0].updateBy1DNewtonsMethod()
        } else if (this.days.length > 1) {
            this.updateByNDimNewton()
        }
    }

    computeSigma2(): number[] {
        let sigma2: number[] = []
        this.days.forEach((d1, i) => {
            if (i == 0) return
            let d2 = this.days[i - 1]
            sigma2.push(Math.abs(d2.day - d1.day) * this.w2)
        })
        return sigma2
    }


    updateByNDimNewton() {
        // r
        let r = this.days.map(day => day.r)
    
        if (this.debug) {
            console.log(`Updating ${this.inspect}`)
            this.days.forEach(day => {
                console.log(`day[${day.day}] r = #{day.r}`)
                console.log(`day[${day.day}] win terms = ${day.wonGameTerms}`)
                console.log(`day[${day.day}] win games = ${day.wonGames}`)
                console.log(`day[${day.day}] lose terms = ${day.lostGameTerms}`)
                console.log(`day[${day.day}] lost games = ${day.lostGames}`)
                console.log(`day[${day.day}] log(p) = ${day.logLikelihood}`)
                console.log(`day[${day.day}] dlp = ${day.logLikelihoodDerivative}`)
                console.log(`day[${day.day}] dlp2 = ${day.logLikelihoodSecondDerivative}`)
            })
        }
    
        // sigma squared (used in the prior)
        let sigma2 = this.computeSigma2()
    
        let h = this.hessian(this.days, sigma2)
        let g = this.gradient(r, this.days, sigma2)
    
        let a: number[] = []
        let d = [h[0][0]]
        let b = [h[0][1]]
    
        let n = r.length
        for(let i = 1; i < n; i++) {
            a[i] = h[i][i-1] / d[i-1]
            d[i] = h[i][i] - a[i] * b[i-1]
            b[i] = h[i][i+1]
        }
    
        let y: number[] = [g[0]]
        for(let i = 1; i < n; i++) {
            y[i] = g[i] - a[i] * y[i-1]
        }
    
        let x: number[] = []
        x[n-1] = y[n-1] / d[n-1]
        for(let i = n-2; i >= 0; i--){
            x[i] = (y[i] - b[i] * x[i+1]) / d[i]
        }

        // JS Array.zip implementation
        let newR = a.map((e, i) => [e, x[i]]).map(i => i[0] - i[1])
    
        newR.forEach(r => {
            if (r > 650)
                throw new UnstableRatingException(`Unstable r (${newR}) on player ${this.inspect}`)
        })
    
        if (this.debug) {
            console.log(`Hessian = ${h}`)
            console.log(`gradient = ${g}`)
            console.log(`a = ${a}`)
            console.log(`d = ${d}`)
            console.log(`b = ${b}`)
            console.log(`y = ${y}`)
            console.log(`x = ${x}`)
            console.log(`${this.inspect} (${r}) => (${newR})`)
        }
    
        this.days.forEach((day,idx) => {
            day.r = day.r - x[idx]
        })
    }

    get covariance() {
      let r = this.days.map(day => day.r)
    
      let sigma2 = this.computeSigma2()
      let h = this.hessian(this.days, sigma2)
      // let g = this.gradient(r, this.days, sigma2)
    
      let n = this.days.length
    
      let a: number[] = []
      let d = [h[0][0]]
      let b = [h[0][1]]
    
      n = r.length
      for(let i = 0; i < n; i++) {
        // Reset values from default
        a = []
        d = []
        b = []

        a.push(h[i][i-1] / d[i-1])
        d.push(h[i][i] - a[i] * b[i-1])
        b.push(h[i][i+1])
      }

      let dp = []
      dp[n-1] = h[n-1][n-1]    
      let bp = []
      bp[n-1] = h[n-1][n-2]
      let ap = []
      for(let i = n - 2; i >= 0; i--) {
        ap[i] = h[i][i+1] / dp[i+1]
        dp[i] = h[i][i] - ap[i]*bp[i+1]
        bp[i] = h[i][i-1]
      }
    
      let v: number[] = []
      for(let i = 0; i < n-1; i++) {
        v[i] = dp[i+1]/(b[i]*bp[i+1] - d[i]*dp[i+1])
      }
      v[n-1] = -1/d[n-1]
    
      let matrix = new Array(n).fill(new Array(n).fill(null))
      return matrix.map((_y: any, row: number) => _y.map((_x: any, col: number) => {
        if(row == col)
            return v[row]
        else if(row == col-1)
            return -1*a[col]*v[col]
        else
          return 0
      }))
    }
    
    updateUncertainty() {
      if(this.days.length > 0) {
        let c = this.covariance
        let u = this.days.map((_e,i) => c[i][i])
        return this.days.map((d, i) => [d, u[i]]).map(e => e[0].uncertainty = e[1])
      }
      else
        return 5
    }

    addGame(game: Game) {
        let lastDay = this.days.slice(-1)[0]
        if(!lastDay || lastDay.day != game.day) {
            let newPday = new PlayerDay(this, game.day)
            if(this.days.length === 0) {
                newPday.isFirstDay = true
                newPday.gamma = 1
            } else {
                newPday.gamma = lastDay.gamma
            }
            lastDay = newPday
            this.days.push(newPday)
        }

        if (game.whitePlayer === this) {
            game.wpd = lastDay
        } else {
            game.bpd = lastDay
            lastDay.addGame(game)
        }
    }

}