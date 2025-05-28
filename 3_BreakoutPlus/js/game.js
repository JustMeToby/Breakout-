// JavaScript Document
(function ($) {

    // define references to dom elements
    // _ = private var
    // $ = some jquery object
    var _$gameStage,
        _$player,
        _$ball,
        _$bricksContainer;

    // vars used within the game logic
    var _bricks = [],
        _remainingLives = 5,
        _ballSpeed = 4,
        _ballVelocityX = 0,
        _ballVelocityY = 0,
        _ballMaxSpeed = 10,
        _ballWidth = 0,
        _ballHeight = 0,
        _ballKicked = false,
        _playerWidth = 0,
        _playerYPos = 0,
        _playerVelocityX = 0,
        _brickWidth = 0,
        _brickHeight = 0,
        _stageWidth = 0,
        _stageHeight = 0,
        _mouseX = 0,
        _mouseOldX = 0,
        _gameStagePos = null,
        _gameStageWidth = 0,
        _gameLoopId = null;

    /**
     * initialize the game
     * @private
     */
    function _init() {
        // get the stage
        _$gameStage = $("#game-stage");

        // get the ball
        _$ball = $("#ball");

        // get the player
        _$player = $("#player");

        // get the bricks container
        _$bricksContainer = $("#bricks-container");

        // store some never changing vars
        _ballWidth = _$ball.width();
        _ballHeight = _$ball.height();
        _stageWidth = _$gameStage.width();
        _stageHeight = _$gameStage.height();
        _playerWidth = _$player.width();
        // we want the players y-position to be 95% percent of the stage height
        _playerYPos = _stageHeight * .95;
        _gameStagePos = _$gameStage.offset();
        _gameStageWidth = _$gameStage.width();

        _startSound();

        _startGame();
    }

    /**
     * the game loop
     * @private
     */
    function _gameLoop() {
        // get the current position of the ball
        var _ballPos = _$ball.position();

        // get the current position the the player
        var _playerPos = _$player.position();

        // get the width/height of the player
        var _playerHeight = _$player.height();
        var _playerWidth = _$player.width();

        // a variable that will help us control the collision detection
        var _collisionDetected = false;

        // first thing to do is updating the players position by its x velocity
        // the players x velocity is the delta between the current and the old mouse x position
        _playerVelocityX = _mouseX - _mouseOldX;

        // to keep getting correct mouse x position deltas we need to set the old mouse x position equal to the current
        _mouseOldX = _mouseX;

        // now we can update the players position by the players x velocity
        // but since we dont want the player to left the stage we also need to constrain its position
        // first we need the new position of the player
        var newPlayerPosX = _playerPos.left + _playerVelocityX;
        // then we need the maximum position of the player
        var maxPlayerXPos = _gameStageWidth - _playerWidth;
        // constrain the position with Math.min and Math.max
        var _newPlayerXPostion = Math.max(0, Math.min(newPlayerPosX, maxPlayerXPos));

        // we only need collision detection if the ball was kicked off
        if (_ballKicked == true) {

            // check if ball is outside or on our stage boundaries
            // keep in mind that we check the top left point of the ball
            //
            //  TL--TR     0,0 - 1,0
            //  |    |      |     |
            //  BL--BR     0,1 - 1,1
            //
            // check top boundary
            if (_ballPos.top < 0) {
                // ball is outside or on the top boundary
                // reflect its Y velocity
                _ballVelocityY *= -1;
                // also we need to reset the position of the ball to the position of the boundary
                _$ball.css("top", 0);

                // we have a collision
                $.sounds.play('hitwall');
                _collisionDetected = true;
            }
            // ball could never be at top and bottom at the same time
            // so we only need to check the top OR bottom boundary
            //
            // check bottom boundary
            // this is the only boundary with a different hit testing
            // the ball can fall off the stage and the player looses a live
            // therefore we check if the ball is completely below the stage
            else if (_ballPos.top > _stageHeight) {
                // we have a collision (we hit the void)
                $.sounds.play('balldrop');
                _collisionDetected = true;

                // ball fell off the stage, reset it
                _remainingLives--;

                //Display current lives count
                $('.lives').text(_remainingLives);
                _resetBall();
            }

            // next we need to check the left and right boundaries
            // note: the ball could be on or over a horizontal and a vertical
            // axis at the same time
            //
            // check the left side
            if (_ballPos.left < 0) {
                // ball is outside or on the left boundary
                // reflect its X velocity
                _ballVelocityX *= -1;
                // also we need to reset the position of the ball to the position of the boundary
                _$ball.css("left", 0);

                // we have a collision
                $.sounds.play('hitwall');
                _collisionDetected = true;
            }
            // same with the horizontal axis, the ball could be only left OR right
            else if (_ballPos.left + _ballWidth > _stageWidth) {
                // ball is outside or on the right boundary
                // reflect its X velocity
                _ballVelocityX *= -1;
                // also we need to reset the position of the ball to the position of the boundary
                _$ball.css("left", _stageWidth - _ballWidth);

                // we have a collision
                $.sounds.play('hitwall');
                _collisionDetected = true;
            }

            // we only need to do the next test if until now none collision occurred
            if (_collisionDetected == false) {

                // we checked now the boundaries of our stage
                // next we should check if the ball is colliding with the player
                // therefore we use almost the same logic as with our stage boundaries
                // but in a slightly different way
                //
                // first we check if the ball's left position + its width is greater than
                // the players left position and if the ball's left position is smaller than
                // the players left position + its width
                if (_ballPos.left + _ballWidth > _playerPos.left && _ballPos.left < _playerPos.left + _playerWidth) {
                    // the ball is within the range we tested
                    // no we only need to check if the balls top position and it's height is greater
                    // than the players y-position
                    if (_ballPos.top + _ballHeight > _playerYPos) {
                        // ball hits the player because it is within the range of the players left position + it's width
                        // and the balls top position + it's height is greater than the players top position
                        //
                        //  HIT TEST = TRUE
                        //
                        //      player left         player left + player width
                        //                |         |
                        //                |         |
                        //                |         |
                        //                |  ball   |
                        //                |  XXXX   |
                        //  player top ------XXXX------------
                        //
                        //
                        //
                        //  HIT TEST = FALSE
                        //
                        //      player left         player left + player width
                        //                |         |
                        //                |         |
                        //                |         |
                        //                |         | ball
                        //                |         | XXXX
                        //  player top ---------------XXXX---
                        //
                        //
                        // now we only need to reflect the balls y velocity
                        _ballVelocityY *= -1;
                        $.sounds.play('hitwall');


                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        // NEEDS CHECK IF BALL IS BELOW THE PLAYER TO PREVENT BOUNCING WITHIN THE PLAYER !
                        // Same logic to move it out of the player as with the bricks?
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        // now we need to find out where exactly the ball hits the player
                        // therefore we can use the same logic which is used between circle and circle collisions
                        // first: we need the distance between the balls and the player center
                        /*						var ballCenterX = _ballPos.left + _ballWidth * .5;
                        						var ballCenterY = _ballPos.top + _ballHeight * .5;
                        						var playerCenterX = _playerPos.left + _playerWidth * .5;
                        						var playerCenterY = _playerPos.top + _playerHeight * .5;
                        						// calc the absolute distance
                        						var distanceX = Math.abs(playerCenterX - brickCenterX);
                        						var distanceY = Math.abs(playerCenterY - brickCenterY);
                        						// then we need the total width and height of both objects diveded by 2
                        						var totalWidth = (_ballWidth + _playerWidth) * .5;
                        						var totalHeight = (_ballHeight + _playerHeight) * .5;
                        						// when we subtract the total width and height from our distance we can
                        						// check which delta (overlap) is smaller and get our hit axis
                        						var overlapX = totalWidth - distanceX;
                        						var overlapY = totalHeight - distanceY;

                        						if (overlapX < overlapY) {
                        							_ballVelocityX *= -1;
                        							// move the ball out of the collision
                        							_$ball.css("left", _ballPos.left + overlapX);
                        						} else {
                        							_ballVelocityY *= -1;
                        							// move the ball out of the collision
                        							_$ball.css("top", _ballPos.top + overlapY);
                        						}                        
                                                */




                        /*						// the next step within the loop is to check if the ball hits the player
                        						// if true we want to rise the difficulty and increase the speed of the ball
                        						// therefore we need to scale the balls velocity vector (x,y)
                        						// first: increase the current speed within its constrains
                        						_ballSpeed = Math.min(_ballMaxSpeed, ++_ballSpeed);

                        						// second: get the unit vector of the velocity vector
                        						var lVector = Math.sqrt(Math.pow(_ballVelocityX, 2) + Math.pow(_ballVelocityY, 2));
                        						var uVectorX = _ballVelocityX / (lVector);
                        						var uVectorY = _ballVelocityY / (lVector);
                        						// third: multiply the speed with the unit vector, the result will be the increased veolcity
                        						_ballVelocityX = uVectorX * _ballSpeed;
                        						_ballVelocityY = uVectorY * _ballSpeed;*/
                    }
                }
            }

            // we only need to do the next test if until now none collision occurred
            if (_collisionDetected == false) {

                // we iterate through all stored brick objects
                for (var i = 0; i < _bricks.length; i++) {
                    // get the brick to test against
                    var $brick = _bricks[i];
                    var brickPos = $brick.position();

                    // we check against both axes
                    var hitOnXAxis = false;
                    var hitOnYAxis = false;

                    // first we check the x axis
                    // is the balls left position + its width greater than or equal to the bricks left position
                    // and is the balls left position smaller than or equal to the bricks left position + its width
                    if (_ballPos.left + _ballWidth >= brickPos.left && _ballPos.left <= brickPos.left + _brickWidth) {
                        // then we have a collision
                        hitOnXAxis = true;
                    }

                    // same for the other axis
                    if (_ballPos.top + _ballHeight >= brickPos.top && _ballPos.top <= brickPos.top + _brickHeight) {
                        // then we have a collision
                        hitOnYAxis = true;
                    }

                    // if we have a collision on both axes remove the brick
                    if (hitOnXAxis == true && hitOnYAxis == true) {


                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        // TESTING OF BRICK TYPE HAPPENS HERE !!!!!!!!!!!!
                        // Using classes for the different types
                        // And multiple classes for the multi-hit type
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################
                        //###########################################################################################

                        // mark the dom object as hit
                        // do not unset its reference (beware the gc)
                        $brick.addClass("hit");

                        //remove the brick from the bricks array
                        _bricks.splice(i, 1);
                        $.sounds.play('hitbrick');

                        //Display current brick count
                        $('.brickcount').text(_bricks.length);

                        // now we need to find out where exactly the ball hits the brick
                        // therefore we can use the same logic which is used between circle and circle collisions
                        // first: we need the distance between the balls and the bricks center
                        var ballCenterX = _ballPos.left + _ballWidth * .5;
                        var ballCenterY = _ballPos.top + _ballHeight * .5;
                        var brickCenterX = brickPos.left + _brickWidth * .5;
                        var brickCenterY = brickPos.top + _brickHeight * .5;
                        // calc the absolute distance
                        var distanceX = Math.abs(ballCenterX - brickCenterX);
                        var distanceY = Math.abs(ballCenterY - brickCenterY);
                        // then we need the total width and height of both objects diveded by 2
                        var totalWidth = (_ballWidth + _brickWidth) * .5;
                        var totalHeight = (_ballHeight + _brickHeight) * .5;
                        // when we subtract the total width and height from our distance we can
                        // check which delta (overlap) is smaller and get our hit axis
                        var overlapX = totalWidth - distanceX;
                        var overlapY = totalHeight - distanceY;

                        if (overlapX < overlapY) {
                            _ballVelocityX *= -1;
                            // move the ball out of the collision
                            _$ball.css("left", _ballPos.left + overlapX);
                        } else {
                            _ballVelocityY *= -1;
                            // move the ball out of the collision
                            _$ball.css("top", _ballPos.top + overlapY);
                        }

                        // break the for-loop because we want only one hit per loop
                        break;
                    }


                }

            }

            // we checked if the ball intersects with the stage boundaries,
            // the player or a brick. during the check we altered the
            // position of the ball and its velocity if one of the listed events occurred
            // the final step is to move the ball by its updated velocity
            _$ball.css({
                left: _ballPos.left + _ballVelocityX,
                top: _ballPos.top + _ballVelocityY
            });
        }
        // if the ball wasn't kicked yet we just put it again into the center of the player
        else {
            _$ball.css({
                // tipp: instead of dividing by 2 it is faster to multiply by .5
                left: _newPlayerXPostion + _playerWidth * .5 - _ballWidth * .5,
                top: _playerYPos - _ballHeight
            });
        }

        // at last, update the players position
        _$player.css("left", _newPlayerXPostion);

        // the game loop is finished and we can call the next loop iteration
        _nextLoopIteration();
    }

    /**
     * call the next loop iteration
     * @private
     */
    function _nextLoopIteration() {
        // get the next possible time to render the next frame
        // replaces the old setTimeout Method
        // usually keeps fps steady at 60fps if possible
        // optimized by the vendors, huge performance boost when used instead of setTimeout
        //
        // get request the next animation frame and store the requests id
        _gameLoopId = window.requestAnimationFrame(function () {
            _gameLoop();
        });
    }

    /**
     * start the game loop
     * @private
     */
    function _startGame() {
        // only start the game loop if it is not currently running
        if (_gameLoopId == null) {
            // the loop has not been started

            // we want to control our player with the mouse
            // therefore we need a mousemove listener to get the
            // the current position of the mouse from the returned event
            $(document).on("mousemove", function (event) {
                // we only need the x position of the mouse
                // because our player can only move at the x axis
                // we need to store the old x value to get our players x velocity
                _mouseX = event.clientX;
            });

            // put the player into its place
            _$player.css("top", _playerYPos);

            //Display current lives count
            $('.lives').text(_remainingLives);

            // build the bricks
            _buildBricks();

            // reset the ball
            _resetBall();

            // call the next loop iteration
            _nextLoopIteration();
        }
    }

    function _kickOffBall() {
        // we want the ball to kick off in a random direction
        // therefore we need a angle between 45 and 135
        var randomAngle = Math.random() * -90 - 45;
        var deg2rad = randomAngle / 180 * Math.PI;
        var cos = Math.cos(deg2rad);
        var sin = Math.sin(deg2rad);

        // multiply the sin and cos values with the initial speed value
        _ballVelocityX = cos * _ballSpeed;
        _ballVelocityY = sin * _ballSpeed; // we want to start of in the upper direction
        
        console.log('Ball Speed: '+_ballSpeed+' VelocityX: '+_ballVelocityX+' VelocityY: '+_ballVelocityY);

        // If kickoff direction is too close to 90 degrees, which is boring, change it a little        
        if (_ballVelocityX < 1) {
            if (_ballVelocityX >= 0) {
                ++_ballVelocityX
            } else if (_ballVelocityX >= -1) {
                --_ballVelocityX
            }
        }

        // set the kickoff control value ot true
        _ballKicked = true;
    }

    function _resetBall() {

        // Checking if Game Over
        if (_remainingLives === 0) {
            $.sounds.play('gameover');
            $('#gameover').slideDown().click(function () {
                $('#gameover').hide();
                _bricks = [];
                _remainingLives = 5;
                _ballSpeed = 4;
                _ballVelocityX = 0;
                _ballVelocityY = 0;
                _ballMaxSpeed = 10;
                _ballWidth = 0;
                _ballHeight = 0;
                _ballKicked = false;
                _playerWidth = 0;
                _playerYPos = 0;
                _playerVelocityX = 0;
                _brickWidth = 0;
                _brickHeight = 0;
                _stageWidth = 0;
                _stageHeight = 0;
                _mouseX = 0;
                _mouseOldX = 0;
                _gameStagePos = null;
                _gameStageWidth = 0;
                _gameLoopId = null;
                $('.brick').remove();
                $("body").off("click", "*");
                $("body").off("mousemove", "*");
                _init();
            })
            return;


        }

        // reset the kickoff
        _ballKicked = false;

        // at start we want the ball to be on top of the player
        _$ball.css("top", _playerYPos - _ballHeight);

        // we want the ball to be kicked only once when we clicked on the stage
        // therefore we add an event listener which removes itself after the first execution
        _$gameStage.one("click", function () {
            _kickOffBall();
        });
    }

    function _startSound() {
        $.sounds({
                sounds: [
                    'balldrop',
                    'gameover',
                    'hitbrick',
                    'hitwall',
                    'hitexplode',
                    'hitmulti',
                    'music'
                ],
                path: 'sounds/'
            })
            // Setting Sound to on
        $.sounds.mute(false)

        // Adding Event Handler for soundFX switch
        $('.soundswitch').click(function (e) {
            if ($('.soundswitch').hasClass('soundoff')) {
                $('.soundswitch').removeClass('soundoff').addClass('soundon').text('On');
                $.sounds.mute(false);
            } else if ($('.soundswitch').hasClass('soundon')) {
                $('.soundswitch').removeClass('soundon').addClass('soundoff').text('Off');
                $.sounds.mute(true);
            }
        });

        // Adding Event Handler for music switch
        $('.musicswitch').click(function (e) {
            if ($('.musicswitch').hasClass('musicoff')) {
                $('.musicswitch').removeClass('musicoff').addClass('musicon').text('On');
                $.sounds.loop('music', 0.3)
            } else if ($('.musicswitch').hasClass('musicon')) {
                $('.musicswitch').removeClass('musicon').addClass('musicoff').text('Off');
                $.sounds.loop('music', 0.0)
            }
        });

    }

    function _buildBricks() {
        // the brick template
        var brickTpl = "<div class='brick yellow'><div class='light'></div></div>";

        // remove leftover bricks from previous games


        // we want 7 bricks in a row
        for (var r = 0; r < 7; r++) {
            // and 10 in a column
            for (var c = 0; c < 10; c++) {
                // create the brick div through $(html-tag)
                var $brick = $(brickTpl);

                // append the brick
                _$gameStage.append($brick);

                // if it is the first brick we need the width and height from it
                if (r == 0 && c == 0) {
                    _brickWidth = ($brick.width() + 3);
                    _brickHeight = ($brick.height() + 3);
                }

                // set its correct position
                $brick.css({
                    left: _brickWidth * r + 100,
                    top: _brickHeight * c + 60
                });
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                // Inserting the different types of bricks happens here
                // Using classes for the different types
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################
                //###########################################################################################

                // add the brick obj into the bricks array
                _bricks.push($brick);


                //Display current brick count
                $('.brickcount').text(_bricks.length)
            }
        }
    }

    // wait until the document is ready
    $(document).ready(_init);

})(jQuery);
