// JavaScript Document
(function ($) {

    // define references to dom elements
    // _ = private var
    // $ = some jquery object
    var _$gameStage,
        _$player,
        _$ball,
        _$bricksContainer,
        _$countdownDisplay;

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
        _gameLoopId = null,
        _gameState = "LOADING", // Possible states: LOADING, COUNTDOWN, WAITING_TO_LAUNCH, PLAYING, LEVELWON, GAMEOVER
        _countdownTimer = 0,
        _countdownMessage = "",
        _lastCountdownTick = 0;
        
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
            " S XXX S",
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
        
        // Create countdown display if it doesn't exist
        if ($("#countdown-message").length === 0) {
            _$gameStage.append('<div id="countdown-message" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 2.5em; color: white; text-align: center; z-index: 1000; text-shadow: 2px 2px 4px #000000; display: none;"></div>');
        }
        _$countdownDisplay = $("#countdown-message");

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

        _prepareNewGame();
    }

    /**
     * Prepare a new game from scratch
     * @private
     */
    function _prepareNewGame() {
        _currentLevel = 0;
        _remainingLives = 5;
        _ballSpeed = 4;
        _mouseX = _stageWidth / 2; // Center mouse for paddle start
        _mouseOldX = _mouseX;

        $('.lives').text(_remainingLives);
        _buildBricks(); // Build bricks for the first level
        _prepareRound(true); // true: indicates it's a new level start (or game start)
    }

    /**
     * Prepare a round (new level or after life loss)
     * @param {boolean} isNewLevel - Whether this is a new level
     * @private
     */
    function _prepareRound(isNewLevel) {
        _ballKicked = false;
        _$ball.show();
        _gameState = "COUNTDOWN";
        _countdownTimer = 3; // 3 seconds
        _lastCountdownTick = Date.now();
        _countdownMessage = "Level " + (_currentLevel + 1);
        
        // Center the paddle
        var centeredPlayerX = _stageWidth / 2 - _playerWidth / 2;
        _$player.css("left", centeredPlayerX);
        _mouseX = centeredPlayerX + _playerWidth / 2; // Align mouse with paddle center
        _mouseOldX = _mouseX;

        // Position ball on centered paddle
        _$ball.css({
            left: centeredPlayerX + _playerWidth * .5 - _ballWidth * .5,
            top: _playerYPos - _ballHeight
        });

        if (isNewLevel && _currentLevel > 0) { // Don't rebuild for level 0 if _prepareNewGame already did
             _buildBricks(); // Build bricks for the new level
        }
        // If !isNewLevel (lost life), bricks are already there.

        _$countdownDisplay.html(_countdownMessage + "<br/>Get Ready!<br/>" + _countdownTimer).show();

        // Clear previous game loop, mouse/click handlers
        if (_gameLoopId) {
            window.cancelAnimationFrame(_gameLoopId);
            _gameLoopId = null;
        }
        $(document).off("mousemove.game");
        _$gameStage.off("click.game");

        _gameLoopId = window.requestAnimationFrame(_countdownLoop);
    }

    /**
     * Countdown loop for "Get Ready" sequence
     * @private
     */
    function _countdownLoop() {
        if (_gameState !== "COUNTDOWN") return;

        var now = Date.now();
        if (now - _lastCountdownTick >= 1000) { // Update every second
            _countdownTimer--;
            _lastCountdownTick = now;
            _$countdownDisplay.html(_countdownMessage + "<br/>Get Ready!<br/>" + (_countdownTimer > 0 ? _countdownTimer : "Go!"));
        }

        if (_countdownTimer <= 0) {
            setTimeout(function() {
                _$countdownDisplay.hide();
                _gameState = "WAITING_TO_LAUNCH";
                
                // Activate paddle movement
                $(document).on("mousemove.game", function (event) {
                    // Ensure mouseX is relative to the game stage if _gameStagePos is accurate
                    if (_gameStagePos && typeof _gameStagePos.left !== 'undefined') {
                        _mouseX = event.clientX - _gameStagePos.left;
                    } else {
                        _mouseX = event.clientX; // Fallback, might need adjustment depending on CSS
                    }
                });

                // Activate ball launch
                _$gameStage.one("click.game", function() {
                    if (_gameState === "WAITING_TO_LAUNCH") {
                        _kickOffBall();
                    }
                });
                
                // Transition to main game loop
                if (_gameLoopId) { window.cancelAnimationFrame(_gameLoopId); }
                _gameLoopId = window.requestAnimationFrame(_gameLoop);
            }, 500); // Brief pause after countdown reaches 0
            return; // Exit countdown loop
        }

        _gameLoopId = window.requestAnimationFrame(_countdownLoop);
    }

    /**
     * the game loop
     * @private
     */
    function _gameLoop() {
        if (_gameState !== "PLAYING" && _gameState !== "WAITING_TO_LAUNCH") return;

        // get the current position of the ball
        var _ballPos = _$ball.position();

        // get the current position the the player
        var _playerPos = _$player.position();

        // get the width/height of the player
        var _playerHeight = _$player.height();
        var _playerWidth = _$player.width();

        // a variable that will help us control the collision detection
        var _collisionDetected = false;

        // Update player position based on mouse movement
        if (_gameState === "PLAYING" || _gameState === "WAITING_TO_LAUNCH") {
            _playerVelocityX = _mouseX - _mouseOldX;
            _mouseOldX = _mouseX;
            var newPlayerPosX = _playerPos.left + _playerVelocityX;
            var maxPlayerXPos = _gameStageWidth - _playerWidth;
            var _newPlayerXPostion = Math.max(0, Math.min(newPlayerPosX, maxPlayerXPos));
            _$player.css("left", _newPlayerXPostion);
        }

        // we only need collision detection if the ball is in play
        if (_gameState === "PLAYING") {

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
                                _gameState = "LEVELWON";
                                if (_gameLoopId) {
                                    window.cancelAnimationFrame(_gameLoopId);
                                    _gameLoopId = null;
                                }
                                _$ball.hide();
                                $.sounds.play('hitmulti'); 
                                
                                $('#playAgainButtonWin').off('click').one('click', function() {
                                    $('#gamewin').hide();
                                    _currentLevel = 0; 
                                    _prepareNewGame(); // Full reset and restart
                                });
                        
                                $('#nextLevelButton').off('click').one('click', function() {
                                    $('#gamewin').hide();
                                    _currentLevel++;
                                    if (_currentLevel >= _levels.length) {
                                        _$countdownDisplay.html("GAME COMPLETE!<br/>Starting Over...").show();
                                        _currentLevel = 0; 
                                        // Short delay before starting new game to show message
                                        setTimeout(function() { 
                                            _$countdownDisplay.hide();
                                            _prepareNewGame(); // This rebuilds bricks for level 0 and starts countdown
                                        }, 3000);
                                    } else {
                                        _prepareRound(true); // true: it's a new level
                                    }
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
        else if (_gameState === "WAITING_TO_LAUNCH") { // Ball follows paddle
            var playerCurrentX = _$player.position().left;
            _$ball.css({
                left: playerCurrentX + _playerWidth * .5 - _ballWidth * .5,
                top: _playerYPos - _ballHeight
            });
        }

        _nextLoopIteration();
    }

    function _nextLoopIteration() {
        // Only continue if game is in a state that requires the main loop
        if (_gameState === "PLAYING" || _gameState === "WAITING_TO_LAUNCH") {
            _gameLoopId = window.requestAnimationFrame(_gameLoop);
        } else {
            if (_gameLoopId) {
                window.cancelAnimationFrame(_gameLoopId);
                _gameLoopId = null;
            }
        }
    }

    function _kickOffBall() {
        var randomAngle = Math.random() * -90 - 45;
        var deg2rad = randomAngle / 180 * Math.PI;
        var cos = Math.cos(deg2rad);
        var sin = Math.sin(deg2rad);
        _ballVelocityX = cos * _ballSpeed;
        _ballVelocityY = sin * _ballSpeed;
        if (_ballVelocityX < 1 && _ballVelocityX > -1) { 
             _ballVelocityX = _ballVelocityX >= 0 ? 1 : -1;
        }
        _ballKicked = true;
        _gameState = "PLAYING";
    }

    function _resetBall() {
        _remainingLives--;
        $('.lives').text(_remainingLives);

        if (_gameLoopId) { // Stop current game loop activity immediately
            window.cancelAnimationFrame(_gameLoopId);
            _gameLoopId = null;
        }
        $(document).off("mousemove.game"); // Stop paddle movement
        _$gameStage.off("click.game");    // Stop ball launch

        if (_remainingLives <= 0) {
            _gameState = "GAMEOVER";
            _$ball.hide();
            $.sounds.play('gameover');
            _$countdownDisplay.hide(); // Ensure countdown isn't stuck

            $('#gameover').slideDown().one('click', function () {
                $('#gameover').hide();
                _prepareNewGame(); // This will reset level to 0 and call _prepareRound
            });
        } else {
            // Lives remaining, prepare for the next ball on the current level
            _prepareRound(false); // false: not a new level, just lost a life
        }
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
