# Whole History Rating

A system for ranking game players by skill, based on Rémi Coulom's [Whole History Rating](http://remi.coulom.free.fr/WHR/WHR.pdf) algorithm, with modifications to support handicaps.

This is a port of [GoShrine's implementation](https://github.com/goshrine/whole_history_rating) in Typescript. 

Installation
------------

* npm install whole_history_rating


Usage
-----
```js
import WholeHistoryRating from 'whole_history_rating'

const whr = new WholeHistoryRating()

// WholeHistoryRating#createGame arguments: black player name, white player name, winner, day number, handicap
// Handicap should generally be less than 500 elo
whr.createGame("shusaku", "shusai", "B", 1, 0)
whr.createGame("shusaku", "shusai", "W", 2, 0)
whr.createGame("shusaku", "shusai", "W", 3, 0)

// Iterate the WHR algorithm towards convergence with more players/games, more iterations are needed.
whr.iterate(50)

// Results are stored in one triplet for each day: [day_number, elo_rating, uncertainty]
whr.ratings_for_player("shusaku")
/*  Output:
    [[1, -43, 84], 
    [2, -45, 84], 
    [3, -45, 84]]
*/

whr.ratings_for_player("shusai")
/*  Output:
    [[1, -43, 84], 
    [2, -45, 84], 
    [3, -45, 84]]
*/
```

Optional Configuration
----------------------

One of the meta parameters to WHR is the variance of rating change over one time step, :w2,
which determines how much that a player's rating is likely change in one day.  Higher numbers allow for faster progress.
The default value is 300, which is fairly high.
```js
whr = new WholeHistoryRating.new({w2: 17})
```
