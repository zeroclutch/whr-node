import Base from 'base'

const whr = new Base()

// WholeHistoryRating::Base#create_game arguments: black player name, white player name, winner, day number, handicap
// Handicap should generally be less than 500 elo
whr.createGame("shusaku", "shusai", "B", 1, 0)
whr.createGame("shusaku", "shusai", "W", 2, 0)
whr.createGame("shusaku", "shusai", "W", 3, 0)

// Iterate the WHR algorithm towards convergence with more players/games, more iterations are needed.
whr.iterate(50)

// Results are stored in one triplet for each day: [day_number, elo_rating, uncertainty]
console.log(whr.ratingsForPlayer("shusaku"))
console.log(whr.ratingsForPlayer("shusai"))