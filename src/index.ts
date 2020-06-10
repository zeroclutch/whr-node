import WholeHistoryRating from './whr-base'

const whr: WholeHistoryRating = new WholeHistoryRating()

console.log(whr)

// WholeHistoryRating::Base#create_game arguments: black player name, white player name, winner, day number, handicap
// Handicap should generally be less than 500 elo
console.log(whr.inspect)

whr.createGame("shusaku", "shusai", "B", 1, 0) 
whr.createGame("shusaku", "shusai", "W", 2, 0)
whr.createGame("shusaku", "shusai", "W", 3, 0)

// Iterate the WHR algorithm towards convergence with more players/games, more iterations are needed.
whr.iterate(50)

// Results are stored in one triplet for each day: [day_number, elo_rating, uncertainty]
const printRatings = (player: string):void => {
    console.log(`Ratings for ${player}`)
    console.log('Day\t|Elo\t|Uncertainty\t')
    whr.ratingsForPlayer(player).forEach(r => console.log(`${r[0]}\t|${r[1]}\t|${r[2]}`))
}

printRatings('shusaku')
printRatings('shusai')