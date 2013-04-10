/**
 * Copyright 2013 Michael N. Gagnon
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Instead of using D3 selectAll, just do D3 select(node) for a given node
 * reference.
 */

// Maps each BotColor to a hue 
// The hue value (between 0 and 100)
var BotColorHue = {
  NUM_COLORS: 2,
  0: 84,
  1: 100
}

function directionToAngle(direction) {
  if (direction == Direction.UP) {
    return 0
  } else if (direction == Direction.DOWN) {
    return 180
  } else if (direction == Direction.LEFT) {
    return -90
  } else if (direction == Direction.RIGHT) {
    return 90
  } else {
    // assert false
  }
}

// Returns an svg translation command to update the bot's __pixel__ position on
// the board and it's direction
function botTransformPixels(x, y, facing) {
  return "translate(" + x + ", " + y + ") " +
    "rotate(" + directionToAngle(facing) + " 16 16)"
}

// Like botTransformPixels, except using __cell__ position instead of __pixel__
function botTransform(bot) {
  var x = bot.cellX * CELL_SIZE
  var y = bot.cellY * CELL_SIZE
  return botTransformPixels(x, y, bot.facing)
}

function nonBotAnimate() {
  // TODO: animate coins rotating or something
  // IDEA: perhaps the reason nonBotAnimate and animateCoinCollection were
  // interferring is because they were both operating on the same svg elements
  // but they were using different transition objects.
}

function animateCoinCollection(coins, bots) {

  /**
   * NOTE: I found that animations would interfere with each other on fast
   * speeds if I used d3.selectAll (presumably due to race conditions).
   * I fixed this issue by using d3.select to only select the svg elements
   * that will actually be animated. It will probably be good to follow this
   * approach elsewhere.
   */

  _(bots)
    .map( function(b) {
      if ("coin_collect" in b.animations) {
        // need to serialize coin objects as strings so they can be used as keys
        // in the collectedCoins object
        return b.animations.coin_collect
      } else {
        return null
      }
    })
    .compact()
    .forEach( function(coin) {
      d3.select("#" + coinId(coin)).transition()
        .attr("r", COIN_EXPLODE_RADIUS)
        .attr("opacity", "0.0")
        .delay(ANIMATION_DUR / 4)
        .ease("cubic")
        .duration(ANIMATION_DUR)
    })
}

function animateFailMove(board) {

  // number of pixels to move the bot forward before stopping
  var MOVE_DEPTH = 6

  transitionBot(board, "failMove", function(transition, failMove, bot) {
    transition
      // First, move the bot forward MOVE_DEPTH pixels
      .attr("transform", function(bot) {
        // dx == number of pixels bot will move in x direction
        var dx = 0
        // similar for dy
        var dy = 0
        if (bot.cellX != failMove.destX) {
          var diff = failMove.destX - bot.cellX
          assert(diff == 0 || Math.abs(diff) == 1, "X: diff == 0 || diff == 1")
          dx = diff * MOVE_DEPTH
        }
        if (bot.cellY != failMove.destY) {
          var diff = failMove.destY - bot.cellY
          assert(diff == 0 || Math.abs(diff) == 1, "Y: diff == 0 || diff == 1")
          dy = diff * MOVE_DEPTH
        }
        var x = bot.cellX * CELL_SIZE + dx
        var y = bot.cellY * CELL_SIZE + dy
        return botTransformPixels(x, y, bot.facing)
      })
      .ease("cubic")
      .duration(ANIMATION_DUR / 2)
      .each("end", function() {
        // now back the bot up to where it was before
        d3.select(this).transition() 
          .attr("transform", botTransform)
      })
      .ease(EASING)
      .duration(ANIMATION_DUR / 2)
  })

  
}

function animateRotate(board) {
  transitionBot(board, "rotate", function(transition) {
    transition
      .attr("transform", botTransform)
      .ease(EASING)
      .duration(ANIMATION_DUR)
  })
}

/**
 * For each bot with the specified visualization, execute:
 *    fn(transition, viz, bot)
 * where:
 *   transition is a d3 transition with only that bot selected
 *   viz == board.visualize.step.bot[bot.id][visualizeKey]
 */
function transitionBot(board, visualizeKey, fn) {
  return _(board.bots)
    .filter(function(bot){
      return bot.id in board.visualize.step.bot &&
        visualizeKey in board.visualize.step.bot[bot.id]
    })
    .forEach(function(bot){
      var transition = d3.select("#" + botId(bot)).transition()
      var viz = board.visualize.step.bot[bot.id][visualizeKey]
      console.dir(transition)
      fn(transition, viz, bot)
    })
}

function animateMoveNonTorus(board) {
  transitionBot(board, "nonTorusMove", function(transition) {
    transition
      .attr("transform", botTransform)
      .ease(EASING)
      .duration(ANIMATION_DUR)
  })
}

function animateProgramDone(bots) {


  doneBots = bots.filter( function(bot) {
    return "programDone" in bot.animations
  })

  VIS.selectAll(".programDone")
    .data(doneBots)
    .enter()
    .append("svg:use")
    .attr("class", "xTemplate")
    .attr("xlink:href", "#xTemplate")
    .attr("transform", function(bot) {
      var x = bot.cellX * CELL_SIZE
      var y = bot.cellY * CELL_SIZE
      return botTransform(x, y, bot.facing)
    })
    .attr("opacity", "0.0")
  .transition()
    .attr("opacity", "0.75")
    .delay(ANIMATION_DUR)
    .ease(EASING)
    .duration(ANIMATION_DUR / 2)
    .each("end", function(){
      d3.select("#restart").attr("class", "btn btn-primary")
    })


}

function animateMoveTorus(board) {

  transitionBot(board, "torusMove", function(transition, torusMove, bot) {

    var cloneBotId = botId(bot) + "_clone"

    console.log("VIS")
    console.dir(VIS)

    // Step 1: clone the bot and slide it out of view
    // TODO: for some reason this works with selectAll but not select
    VIS.selectAll("#" + cloneBotId)
      .data([bot])
      .enter()
      .append("svg:use")
      // The clone starts at the previous location of the bot
      .attr("id", cloneBotId)
      .attr("class", "bot")
      .attr("xlink:href", "#botTemplate")
      .attr("transform", function(bot) {
        return botTransform({
            cellX: torusMove.prevX,
            cellY: torusMove.prevY,
            facing: bot.facing
          })
      })
      .transition()
      // the clone slides out of view
      .attr("transform", function(bot) {
        return botTransform({
            cellX: torusMove.oobNextX,
            cellY: torusMove.oobNextY,
            facing: bot.facing
          })
      })
      .ease(EASING)
      .duration(ANIMATION_DUR)
      // garbage collect the bot clone
      .each("end", function() {
        d3.select(this).remove()
      })


    // Step 2: move the original bot to the other side of the screen, and
    // slide it into view
    transition
      // First, immediately move the bot to the other side of the board (out
      // of bounds)
      .attr("transform", function(bot) {
        return botTransform({
          cellX: torusMove.oobPrevX,
          cellY: torusMove.oobPrevY,
          facing: bot.facing
        })
      })
      .ease(EASING)
      .duration(0)
      // once the bot is on the other side of the screen, move it like normal
      .each("end", function() {
        console.log("second move")
        d3.select(this).transition() 
          .attr("transform", botTransform)
          .ease(EASING)
          .duration(ANIMATION_DUR)
      })
  })

}

// animate the program's text
function animateProgram(board) {

  var cm = CODE_MIRROR_BOX

  // if animation is too fast, don't highlight lines
  if (CYCLE_DUR < MAX_HIGHLIGHT_SPEED) {
    // TODO: remove _activeLine field from cm
    if ("_activeLine" in cm) {
      cm.removeLineClass(cm._activeLine, "background", BACK_CLASS);
    }
    return
  }

  // TODO: find the bot currently being traced and only animate that bot's prog
  if (board.bots.length == 0) {
    return
  }

  var bot = board.bots[0]
  if (!("lineIndex" in bot.animations)) {
    return
  }

  var lineNum = bot.animations.lineIndex

  // inspired by http://codemirror.net/demo/activeline.html
  var lineHandle = cm.getLineHandle(lineNum);
  if (cm._activeLine != lineHandle) {
    if ("_activeLine" in cm) {
      cm.removeLineClass(cm._activeLine, "background", BACK_CLASS);
    }
    cm.addLineClass(lineHandle, "background", BACK_CLASS);
    cm._activeLine = lineHandle;
  }
}

function animateMarkers(board) {

  _(getMarkers(board))
  .groupBy(markerId)
  // convert markers into colors
  .map( function(markers) {

    // markers is an array of all marker objects that have the same
    // x, y, and quadrant values (but different botColor values)

    // But for now there is only one color
    // TODO: implement multiple bot colors
    assert(markers.length <= 1, "in animateMarkers, markers.length <= 1")

    if (markers.length == 0) {
      return null
    } else {
      // First normalize the strength by converting it to a value in the range
      // [0.0, 1.0], where the weakest strength gets mapped to zero
      // and the strongest strength gets mapped to 1.0
      var marker = markers[0]

      var strength = marker.strength
      var strengthNormalized = (strength - MIN_MARKER_STRENGTH) /
        MAX_MARKER_STRENGTH

      var saturation = Math.floor(strengthNormalized * 100) + "%"
      var hue = BotColorHue[marker.botColor] + "%"
      var hsvString = "hsv(" + hue + "," + saturation + ", 100%)"
      var rgbString = "#" + tinycolor(hsvString).toHex()
      marker.rgb = rgbString

      return marker
    }

  })
  .compact()
  .forEach( function(marker) {
    d3.select("#" + markerId(marker)).transition()
      .attr("fill", marker.rgb)
      .ease("linear")
      .duration(ANIMATION_DUR)
  })

}

// upperBound is exclusive
function randInt(upperBound) {
  return Math.floor(Math.random()*upperBound)
} 

// This is kind of hacky
function animateVictory(board, state) {
  if (!("victory" in board.animations)) {
    return
  }

  // array of  cell coordinates
  var victoryBalls = _(Array(10))
    .forEach(function() {

      VIS.selectAll("#victoryBall_" + randInt(999999))
        .data([1])
        .enter()
        .append("svg:circle")
        .attr("class", "victory-ball")
        .attr("stroke", "limegreen")
        .attr("stroke-width", "50")
        .attr("fill", "lime")
        .attr("opacity", "1.0")
        .attr("r", 0)
        .attr("cx", function(){ return Math.floor(board.num_cols / 2) * CELL_SIZE + CELL_SIZE/2} )
        .attr("cy", function(){ return Math.floor(board.num_rows / 2) * CELL_SIZE + CELL_SIZE/2} )
        .transition()
        .delay(ANIMATION_DUR + ANIMATION_DUR * Math.random())
        .attr("cx", function(){ return randInt(board.num_cols) * CELL_SIZE + CELL_SIZE/2} )
        .attr("cy", function(){ return randInt(board.num_rows) * CELL_SIZE + CELL_SIZE/2} )
        .attr("opacity", "0.0")
        .attr("stroke-width", "0")
        .attr("r", board.num_rows * CELL_SIZE * 2 / 3)
        .ease(EASING)
        .duration(VICTORY_DUR)
    })

  setTimeout(function(){
    doPause()
  }, ANIMATION_DUR);

  setTimeout(function(){
    doPause()
    if (board.num_victory_announcements > 0) {
      $("#victoryModal").modal('show')
      setupLevelSelect(state)
    }
  }, VICTORY_DUR * 2);

}

function animateLevelMenu(board, campaign, state) {

  if ("checkOffLevel" in board.animations) {
    var world_index = board.animations.checkOffLevel.world_index
    var level_index = board.animations.checkOffLevel.level_index
    worldMenuCheckLevel(campaign, world_index, level_index)
  }

  if ("checkOffWorld" in board.animations) {
    var world_index = board.animations.checkOffWorld.world_index
    worldMenuCheckWorld(campaign, world_index)
  }

  if ("addWorld" in board.animations) {
    for (var i = 0; i < board.animations.addWorld.length; i++) {
      var world_index = board.animations.addWorld[i]
      addWorldToMenu(campaign, state, world_index)      
    }
  }

  if ("addLevel" in board.animations) {
    for (var i = 0; i < board.animations.addLevel.length; i++) {
      var world_index = board.animations.addLevel[i].world_index
      var level_index = board.animations.addLevel[i].level_index
      addLevelToMenu(campaign, state, world_index, level_index)
    }
  }
}

// TODO: breakup into smaller functions
function animate() {
  if (PLAY_STATUS != PlayStatus.PLAYING) {
    return;
  } else {
    stepAndAnimate()
  }
}
 
function drawBoardContainer(board) {
  VIS = d3.select("#board")
    .attr("class", "vis")
    .attr("width", board.num_cols * CELL_SIZE)
    .attr("height", board.num_rows * CELL_SIZE)
}

function drawCells(board) {

  var cells = new Array()
  for (var x = 0; x < board.num_cols; x++) {
    for (var y = 0 ; y < board.num_rows; y++) {
      cells.push({'x': x, 'y': y })
    }
  }

  VIS.selectAll(".cell")
    .data(cells)
    .enter().append("svg:rect")
    .attr("class", "cell")
    .attr("stroke", "lightgray")
    .attr("fill", "white")
    .attr("x", function(d) { return d.x * CELL_SIZE })
    .attr("y", function(d) { return d.y * CELL_SIZE })
    .attr("width", CELL_SIZE)
    .attr("height", CELL_SIZE)

 }

function coinId(coin) {
  return "coin_" + coin.x + "_" + coin.y
}

function botId(bot) {
  return "bot_" + bot.id
}

function markerId(marker) {
  return "marker_" + marker.x + "_" + marker.y + "_" + marker.quadrant
}

function drawCoins() {
  VIS.selectAll(".coin")
    .data(BOARD.coins)
    .enter().append("svg:circle")
    .attr("class", "coin")
    .attr("id", function(coin){ return coinId(coin)} )
    .attr("stroke", "goldenrod")
    .attr("fill", "gold")
    .attr("opacity", "1.0")
    .attr("r", COIN_RADIUS)
    .attr("cx", function(d){ return d.x * CELL_SIZE + CELL_SIZE/2 } )
    .attr("cy", function(d){ return d.y * CELL_SIZE + CELL_SIZE/2} )
}

function drawInitMarkers(board) {

  var markers = _(getMarkers(board, true)).filter( function (m) {
    // All bot colors share one graphical element, so we do this filtering
    return m.botColor == BotColor.BLUE
  }).value()

  VIS.selectAll(".marker")
    .data(markers)
    .enter().append("svg:circle")
    .attr("class", "marker")
    .attr("id", markerId)
    .attr("fill", "white")
    .attr("r", "5")
    .attr("cx", function(m) {
      var x = m.x * CELL_SIZE + CELL_SIZE/2
      if (m.quadrant == Direction.LEFT) {
        x -= 8
      } else if (m.quadrant == Direction.RIGHT) {
        x += 8
      }
      return x
    })
    .attr("cy", function(m) {
      var y = m.y * CELL_SIZE + CELL_SIZE/2
      if (m.quadrant == Direction.UP) {
        y -= 8
      } else if (m.quadrant == Direction.DOWN) {
        y += 8
      }
      return y
    })
}

function drawBlocks() {
  VIS.selectAll(".block")
    .data(BOARD.blocks)
    .enter().append("svg:rect")
    .attr("class", "block")
    .attr("stroke", "darkgray")
    .attr("fill", "darkgray")
    .attr("width", CELL_SIZE)
    .attr("height", CELL_SIZE)
    .attr("x", function(d){ return d.x * CELL_SIZE } )
    .attr("y", function(d){ return d.y * CELL_SIZE } )
}

function drawBots() {

  VIS.selectAll(".bot")
    .data(BOARD.bots)
    .enter().append("svg:use")
    .attr("id", botId)
    .attr("class", "bot")
    .attr("xlink:href", "#botTemplate")
    .attr("transform", botTransform)
}

function cleanUpVisualization() {
  d3.selectAll(".cell").remove()
  d3.selectAll(".bot").remove()
  d3.selectAll(".coin").remove()
  d3.selectAll(".botClone").remove()
  d3.selectAll(".block").remove()
  d3.selectAll(".marker").remove()
  d3.selectAll(".victory-ball").remove()
  d3.selectAll(".xTemplate").remove()

  // TODO: turn off line highlighting
  if ("_activeLine" in CODE_MIRROR_BOX) {
    CODE_MIRROR_BOX.removeLineClass(
      CODE_MIRROR_BOX._activeLine, "background", BACK_CLASS);
  }
}

// called periodically by a timer
function stepAndAnimate() {
  var board = BOARD

  console.log("stepAndAnimate")
  // advance the simulation by one "step"
  step(board, PUZZLE_CAMPAIGN, PUZZLE_CAMPAIGN_STATE)

  //animateProgram(board)

  // must pass initCoins for d3 transitions to work. Since the svg-coin
  // elements are never removed from the board (until the simulation ends)
  // the d3 transition must operate on BOARD.initCoins, not BOARD.coins
  //animateCoinCollection(BOARD.initCoins, BOARD.bots)

  //var transition = d3.selectAll(".bot").data(board.bots).transition()

  // TODO: consider an alternative design, where instead of passing the board
  // to each animation function pass it only the bots for that animation.
  // This way you can do board.bots.groupBy(animation) in one pass.
  animateFailMove(board)
  animateRotate(board)
  animateMoveNonTorus(board)
  animateMoveTorus(board)
  //animateProgramDone(BOARD.bots)
  //animateMarkers(BOARD)
  //animateVictory(BOARD, PUZZLE_CAMPAIGN_STATE)
  //animateLevelMenu(BOARD, PUZZLE_CAMPAIGN, PUZZLE_CAMPAIGN_STATE)
}
