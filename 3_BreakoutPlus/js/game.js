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
        
    var _levels = [
        // Level 1: 9x7
        [
            "XXXXXXX",
            "XXXXXXX",
            "XX S XX",
            "X SSS X",
            "XX S XX",
            "XXXXXXX",
            "XXXXXXX",
            " S S S ",
            "S S S S" // This row has 7 chars, last S is for visual balance if needed
        ].map(row => row.padEnd(7, ' ')), // Ensure all rows are 7 chars, pad with space if shorter
        // Level 2: 9x7
        [
            "X S X S", // 7 chars (last X removed for 7 col)
            " S   S ",
            "X     X",
            "S XXX S",
            "X     X",
            " S   S ",
            "X S X S",
            " SS SS ",
            "XXXXXXX"
        ].map(row => row.padEnd(7, ' ')),
        // Level 3: 9x7
        [
            "S S S S", // 7 chars
            " XXXXX ",
            "S S X S",
            " XXXXX ",
            "S S X S",
            " XXXXX ",
            "S S X S",
            " XXXXX ",
            "S S S S"
        ].map(row => row.padEnd(7, ' ')),
        // Level 4: 9x7 (Using C as X)
        [
            "XSXCXSX",
            "S C S C", 
            "X C X C",
            "C S S C",
            "X C X C",
            "S C S C",
            "XSXCXSX",
            " CCCCC ",
            "S S S S"
        ].map(row => row.replace(/C/g, 'X').padEnd(7, ' ')) // Corrected: Process each row of Level 4
    ];
    var _currentLevel = 0; // 0-indexed

function _performFullReset(savedState) {
    console.log("Performing full reset with savedState:", savedState);

    // Remove namespaced event listeners
    $(document).off("mousemove.game");
    if (_$gameStage) { // Ensure _$gameStage is defined before trying to use it
        _$gameStage.off("click.game");
    } else {
        console.error("_$gameStage is not defined in _performFullReset. This might indicate an issue if events were attached to it.");
    }

    // Call _startGame, passing the savedState.
    // _startGame will need to be modified to handle this argument.
    _startGame(savedState);
}

function _restoreBricks(brickData) {
    if (_$gameStage) _$gameStage.find('.brick').remove(); // Clear existing bricks from DOM
    _bricks = []; // Clear the internal _bricks array
    var brickTpl = "<div class='brick'><div class='light'></div></div>";

    brickData.forEach(function(brickInfo) {
        var $brick = $(brickTpl);
        if (brickInfo.type === 'normal') {
            $brick.addClass('brick-normal yellow');
            $brick.data('type', 'normal');
            $brick.data('hits', 1); // Normal bricks are fully intact if they are in saved state
        } else if (brickInfo.type === 'strong') {
            $brick.addClass('brick-strong');
            $brick.data('type', 'strong');
            $brick.data('hits', brickInfo.hits); // Restore actual remaining hits
            if (brickInfo.hits === 1) {
                $brick.addClass('damaged'); // Add damaged class if it has 1 hit left
            }
        }

        if (_$gameStage) _$gameStage.append($brick);
        $brick.css({ top: brickInfo.top, left: brickInfo.left });
        _bricks.push($brick);
    });

    if (_$gameStage) $('.brickcount').text(_bricks.length);

    if (_bricks.length > 0) {
        // Ensure _$gameStage is available and brick is attached for width/height calculation
        if(_$gameStage && _bricks[0].closest(document.documentElement).length > 0) {
             _brickWidth = (_bricks[0].width() + 3); // Assuming 3px is for margin/border
             _brickHeight = (_bricks[0].height() + 3);
        } else if (_bricks[0].width() !== null) { // Fallback if not in DOM but properties exist (less likely for new elements)
            _brickWidth = (_bricks[0].width() + 3);
            _brickHeight = (_bricks[0].height() + 3);
        } else {
            // Further fallback or default if width/height can't be determined
            // For now, we'll rely on them being determinable if bricks exist.
            // console.warn("Bricks exist but dimensions could not be determined in _restoreBricks.");
        }
    } else {
        // Handle case with no bricks if necessary (e.g. set default _brickWidth/_brickHeight or leave them as is)
        // For now, if no bricks, these don't strictly need to be accurate for gameplay logic that follows.
    }
}

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
            if (_ballPos.top < 0) {
                _ballVelocityY *= -1;
                _$ball.css("top", 0);
                $.sounds.play('hitwall');
                _collisionDetected = true;
            }
            else if (_ballPos.top > _stageHeight) { // Ball fell off bottom
                $.sounds.play('balldrop');
                // _collisionDetected = true; // Not strictly a collision with an object, but ends the turn for the ball
                _remainingLives--;
                $('.lives').text(_remainingLives);
                _resetBall(); // This will call _init if lives are 0, which restarts the loop.
                return; // Important: Exit _gameLoop as the ball is reset or game is over.
            }

            if (! _collisionDetected) { // Only check other collisions if not already handled
                if (_ballPos.left < 0) {
                    _ballVelocityX *= -1;
                    _$ball.css("left", 0);
                    $.sounds.play('hitwall');
                    _collisionDetected = true;
                }
                else if (_ballPos.left + _ballWidth > _stageWidth) {
                    _ballVelocityX *= -1;
                    _$ball.css("left", _stageWidth - _ballWidth);
                    $.sounds.play('hitwall');
                    _collisionDetected = true;
                }
            }


            if (_collisionDetected == false) {
                if (_ballPos.left + _ballWidth > _playerPos.left && _ballPos.left < _playerPos.left + _playerWidth) {
                    if (_ballPos.top + _ballHeight > _playerYPos && _ballPos.top < _playerYPos + _playerHeight ) { 
                        _ballVelocityY *= -1;
                        _$ball.css("top", _playerYPos - _ballHeight); // Move ball out of player
                        $.sounds.play('hitwall');
                         _collisionDetected = true; 
                    }
                }
            }

            if (_collisionDetected == false) {
                for (var i = 0; i < _bricks.length; i++) {
                    var $brick = _bricks[i];
                    if (!$brick || $brick.length === 0 || !$brick.get(0).parentNode) continue; 
                    
                    var brickPos = $brick.position();
                    var hitOnXAxis = false;
                    var hitOnYAxis = false;

                    if (_ballPos.left + _ballWidth >= brickPos.left && _ballPos.left <= brickPos.left + _brickWidth) {
                        hitOnXAxis = true;
                    }
                    if (_ballPos.top + _ballHeight >= brickPos.top && _ballPos.top <= brickPos.top + _brickHeight) {
                        hitOnYAxis = true;
                    }

                    if (hitOnXAxis == true && hitOnYAxis == true) {
                        var remainingHits = $brick.data('hits');
                        var brickType = $brick.data('type');

                        remainingHits--;
                        $brick.data('hits', remainingHits);

                        if (remainingHits > 0) {
                            if (brickType === 'strong') {
                                $brick.addClass('damaged');
                                $.sounds.play('hitmulti'); 
                            }
                        } else {
                            $brick.remove(); 
                            _bricks.splice(i, 1); 
                            i--; 
                            $.sounds.play('hitbrick'); 
                            $('.brickcount').text(_bricks.length);

                            if (_bricks.length === 0) { // WIN CONDITION
                                if (_gameLoopId) {
                                    window.cancelAnimationFrame(_gameLoopId);
                                    _gameLoopId = null;
                                }
                                _$ball.hide();
                                $.sounds.play('hitmulti'); 
                                
                                $('#playAgainButtonWin').off('click').one('click', function(event) {
                                    event.stopPropagation(); // Prevent click from bubbling to game stage
                                    $('#gamewin').hide();
                                    _currentLevel = 0;
                                    _ballKicked = false; // Explicitly set before init
                                    _init(); // Full reset and restart
                                });
                        
                                $('#nextLevelButton').off('click').one('click', function(event) {
                                    event.stopPropagation(); // Prevent click from bubbling to game stage
                                    $('#gamewin').hide();
                                    _currentLevel++;
                                    if (_currentLevel >= _levels.length) {
                                        alert("GAME COMPLETE! Congratulations! Starting over from Level 1.");
                                        _currentLevel = 0; 
                                    }
                                    _ballKicked = false; // Explicitly set before init
                                    _init(); // Full reset and restart for next level
                                });
                                $('#gamewin').slideDown();
                                return; 
                            }
                        }
                        
                        // Ball reflection logic (common for both damaged and destroyed brick hits)
                        var ballCenterX = _ballPos.left + _ballWidth * .5;
                        var ballCenterY = _ballPos.top + _ballHeight * .5;
                        var brickCenterX = brickPos.left + _brickWidth * .5;
                        var brickCenterY = brickPos.top + _brickHeight * .5;
                        var distanceX = Math.abs(ballCenterX - brickCenterX);
                        var distanceY = Math.abs(ballCenterY - brickCenterY);
                        var totalWidth = (_ballWidth + _brickWidth) * .5;
                        var totalHeight = (_ballHeight + _brickHeight) * .5;
                        var overlapX = totalWidth - distanceX;
                        var overlapY = totalHeight - distanceY;

                        if (overlapX < overlapY) {
                            _ballVelocityX *= -1;
                            // Move ball out of brick
                            _$ball.css("left", _ballPos.left + overlapX * (_ballPos.left < brickPos.left ? -1 : 1));
                        } else {
                            _ballVelocityY *= -1;
                            // Move ball out of brick
                            _$ball.css("top", _ballPos.top + overlapY * (_ballPos.top < brickPos.top ? -1 : 1));
                        }
                        break; 
                    }
                }
            }

            _$ball.css({
                left: _ballPos.left + _ballVelocityX,
                top: _ballPos.top + _ballVelocityY
            });
        }
        else {
             var currentX = (_$player.position() && _$player.position().left !== undefined) ? _$player.position().left : _newPlayerXPostion;
            _$ball.css({
                left: currentX + _playerWidth * .5 - _ballWidth * .5,
                top: _playerYPos - _ballHeight
            });
        }

        _$player.css("left", _newPlayerXPostion);
        _nextLoopIteration();
    }

    function _nextLoopIteration() {
        // Ensure _gameLoopId is checked before requesting new frame
        if (_gameLoopId !== null) { 
            _gameLoopId = window.requestAnimationFrame(function () {
                _gameLoop();
            });
        }
    }

    function _startGame(savedState) {
        if (savedState && savedState.brickGrid) {
            console.log("Starting game with savedState:", savedState);
            _currentLevel = savedState.currentLevel;
            _remainingLives = savedState.remainingLives;

            _restoreBricks(savedState.brickGrid);
            // $('.brickcount').text(_bricks.length); // _restoreBricks now handles this
        } else {
            console.log("Starting game fresh or for new level. Current level:", _currentLevel);
            // This is the original logic for a new game or next level
            _remainingLives = 5; // Default lives for a fresh start or new level
            // _buildBricks() will be called below, only if not restoring from savedState.
            // However, _buildBricks also clears bricks, so we need to ensure it's called correctly.
            // Let's adjust: _buildBricks clears and builds. If savedState, we clear, then will restore.
            // If no savedState, we call _buildBricks.
            _buildBricks(); // Build bricks for the current level
        }

        // Common setup for both scenarios (new game or restored game)
        _ballSpeed = 4;
        _ballKicked = false;
        _ballVelocityX = 0;
        _ballVelocityY = 0;
        _mouseX = 0;
        _mouseOldX = 0;

        if (_gameLoopId) {
            window.cancelAnimationFrame(_gameLoopId);
            _gameLoopId = null;
        }

        $(document).off("mousemove.game").on("mousemove.game", function (event) {
            _mouseX = event.clientX - _gameStagePos.left;
        });
        _$gameStage.off("click.game");

        _$player.css("top", _playerYPos);
        $('.lives').text(_remainingLives); // Update lives display based on savedState or default

        // If not restoring from savedState, _buildBricks was already called.
        // If restoring, bricks are cleared, and _restoreBricks placeholder is noted.
        // _resetBall will handle initial ball position, but only if not restoring from a saved state.
        // REMOVED: if (!savedState) {
        //    _resetBall();
        // }
        
        _prepareBallForLaunch(); // Centralized ball preparation and launch listener setup

        // Ensure game loop starts if not already active (e.g. after _performFullReset or initial start)
        if (_gameLoopId !== true && _gameLoopId !== null && typeof _gameLoopId !== 'number') { // Check if it's not already a valid loop ID or true
             _gameLoopId = true; // Set a placeholder true to indicate it's pending the first animation frame
        }
        _nextLoopIteration(); // This will request animation frame if _gameLoopId is not null
    }

    function _prepareBallForLaunch() {
        _ballKicked = false;
        _$ball.show(); // Ensure ball is visible

        // Position ball on paddle
        // Ensure player position is valid before using it.
        var playerLeft = (_$player.position() && typeof _$player.position().left !== 'undefined') ? _$player.position().left : (_stageWidth / 2 - _playerWidth / 2);
        _$ball.css({
            left: playerLeft + _playerWidth * .5 - _ballWidth * .5,
            top: _playerYPos - _ballHeight
        });

        _$gameStage.off('click.game'); // Remove any existing namespaced click handlers
        _$gameStage.one("click.game", function(event) {
            // console.log("Game stage clicked to kick off ball. Event:", event); // For debugging
            if (!_ballKicked) { // Double check state, though .one() should prevent multiple kicks
                _kickOffBall();
            }
        });
        // console.log("Click handler for ball kick-off attached by _prepareBallForLaunch."); // For debugging
    }

    function _kickOffBall() {
        console.log("Attempting to kick off ball..."); // For debugging
        var randomAngle = Math.random() * -90 - 45;
        var deg2rad = randomAngle / 180 * Math.PI;
        var cos = Math.cos(deg2rad);
        var sin = Math.sin(deg2rad);
        _ballVelocityX = cos * _ballSpeed;
        _ballVelocityY = sin * _ballSpeed;
        console.log('Ball Speed: '+_ballSpeed+' VelocityX: '+_ballVelocityX+' VelocityY: '+_ballVelocityY);
        if (_ballVelocityX < 1 && _ballVelocityX > -1) { 
             _ballVelocityX = _ballVelocityX >= 0 ? 1 : -1;
        }
        _ballKicked = true;
        console.log("_ballKicked set to true."); // For debugging
    }

    function _resetBall() {
        _$ball.show(); 

        if (_remainingLives > 0) {
            var savedState = {};
            savedState.currentLevel = _currentLevel;
            savedState.remainingLives = _remainingLives; // Intentionally save the decremented value
            savedState.brickGrid = [];

            for (var i = 0; i < _bricks.length; i++) {
                var $brick = _bricks[i];
                // Ensure brick is valid and attached to DOM, otherwise skip.
                // For this implementation, we assume bricks in _bricks array are active.
                // Destroyed bricks are spliced out. Damaged ones have their 'hits' count updated.
                if ($brick && $brick.length > 0 && $brick.closest(document.documentElement).length > 0) {
                    var brickPos = $brick.position();
                    var brickType = $brick.data('type');
                    var remainingHits = $brick.data('hits');

                    savedState.brickGrid.push({
                        top: brickPos.top,
                        left: brickPos.left,
                        type: brickType,
                        hits: remainingHits
                    });
                }
            }
            _performFullReset(savedState);
            return; // Prevent old ball reset logic when a life is lost and game continues
        }

        if (_remainingLives === 0) {
            if (_gameLoopId) {
                window.cancelAnimationFrame(_gameLoopId);
                _gameLoopId = null;
            }
            _$ball.hide(); 
            $.sounds.play('gameover');
            
            // Unbind specific game event handlers
            $(document).off("mousemove.game");
            _$gameStage.off("click.game");

            $('#gameover').slideDown().one('click', function () {
                $('#gameover').hide();
                _currentLevel = 0; 
                _init(); // This will call _startGame which resets all necessary states
            });
            return; 
        }

        // Ball positioning and listener attachment are now handled by _prepareBallForLaunch()
        // called from _startGame().
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
        $.sounds.mute(false)
        $('.soundswitch').click(function (e) {
            if ($('.soundswitch').hasClass('soundoff')) {
                $('.soundswitch').removeClass('soundoff').addClass('soundon').text('On');
                $.sounds.mute(false);
            } else if ($('.soundswitch').hasClass('soundon')) {
                $('.soundswitch').removeClass('soundon').addClass('soundoff').text('Off');
                $.sounds.mute(true);
            }
        });
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
        _$gameStage.find('.brick').remove(); 
        _bricks = []; 
        var brickTpl = "<div class='brick'><div class='light'></div></div>"; 
        var currentLevelData = _levels[_currentLevel];
        // Stage width is 650px. Brick width is 65px + 3px margin/border = 68px.
        // Total grid width for 7 bricks = 7 * 68px = 476px.
        // OffsetX = (650 - 476) / 2 = 87px.
        var brickOffsetX = 87; // Centered offset from left for 7 columns
        var brickOffsetY = 60;  // Initial offset from top (suitable for 9 rows)

        for (var r = 0; r < currentLevelData.length; r++) {
            for (var c = 0; c < currentLevelData[r].length; c++) {
                var brickTypeChar = currentLevelData[r][c];
                if (brickTypeChar === 'X' || brickTypeChar === 'S') {
                    var $brick = $(brickTpl);
                    if (brickTypeChar === 'X') {
                        $brick.addClass('brick-normal yellow'); 
                        $brick.data('type', 'normal');
                        $brick.data('hits', 1);
                    } else if (brickTypeChar === 'S') {
                        $brick.addClass('brick-strong');
                        $brick.data('type', 'strong');
                        $brick.data('hits', 2);
                    }

                    _$gameStage.append($brick);
                    // Calculate brickWidth and brickHeight only once using the first brick
                    if (_bricks.length === 0) { 
                        _brickWidth = ($brick.width() + 3); // Assuming 3px is for margin/border
                        _brickHeight = ($brick.height() + 3);
                    }
                    $brick.css({
                        left: _brickWidth * c + brickOffsetX, 
                        top: _brickHeight * r + brickOffsetY  
                    });
                    _bricks.push($brick);
                }
            }
        }
        $('.brickcount').text(_bricks.length);
    }

    $(document).ready(_init);

})(jQuery);
