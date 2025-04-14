        // Game state
        const gameState = {
            currentPlayer: 1,
            player1Stones: 6,
            player2Stones: 6,
            currentRoll: null,
            board: {
                1: null, // top point
                2: null, // right top point
                3: null, // right bottom point
                4: null, // left bottom point
                5: null, // left top point
                6: null  // center
            },
            gameOver: false,
            centerStones: 0 // Track the number of stones in the center spot
        };

        // Point positions (in percentages relative to the board)
        const pointPositions = {
            1: { top: '-5%', left: '42.5%' },      // Top point
            2: { top: '28%', left: '90%' },     // Right top
            3: { top: '82%', left: '70%' },     // Right bottom
            4: { top: '82%', left: '15%' },     // Left bottom
            5: { top: '28%', left: '-5%' },      // Left top
            6: { top: '42%', left: '42.5%' }      // Center
        };

        // Initialize game board
        function initializeBoard() {
            const gameBoard = document.querySelector('.game-board');
            
            // Create points
            for (let i = 1; i <= 6; i++) {
                const point = document.createElement('div');
                point.className = 'point';
                point.id = `point-${i}`;
                point.textContent = i;
                
                // Position the point
                point.style.top = pointPositions[i].top;
                point.style.left = pointPositions[i].left;
                
                // Add click handler
                point.addEventListener('click', () => handlePointClick(i));
                
                gameBoard.appendChild(point);
            }

            // Add counter for center spot
            const centerCounter = document.createElement('div');
            centerCounter.id = 'center-counter';
            centerCounter.textContent = `Center Stones: ${gameState.centerStones}`;
            gameBoard.appendChild(centerCounter);
        }

        // Handle rolling the dice
        document.getElementById('roll-btn').addEventListener('click', rollDice);

        function rollDice() {
            if (gameState.gameOver) return;
            
            // Disable the roll button temporarily
            const rollBtn = document.getElementById('roll-btn');
            rollBtn.disabled = true;
            
            // Animate the dice
            const dice = document.getElementById('dice');
            dice.classList.add('rolling');
            let rollCount = 0;
            const maxRolls = 10;
            const rollInterval = setInterval(() => {
                dice.textContent = Math.floor(Math.random() * 6) + 1;
                rollCount++;
                
                if (rollCount >= maxRolls) {
                    clearInterval(rollInterval);
                    dice.classList.remove('rolling');
                    gameState.currentRoll = Math.floor(Math.random() * 6) + 1;
                    dice.textContent = gameState.currentRoll;
                    checkMoveAvailability();
                }
            }, 100);
        }

        // Check if a move is available after rolling
        function checkMoveAvailability() {
            const roll = gameState.currentRoll;
            const position = gameState.board[roll];
            
            const status = document.getElementById('status');
            
            if (roll === 6 && gameState.centerStones >= 11) {
                status.textContent = `Player ${gameState.currentPlayer} rolled a 6, but the center spot already has 11 stones.`;
                document.getElementById('roll-btn').disabled = false;
                return;
            }

            if (roll === 6 && gameState.centerStones < 11) {
                status.textContent = `Player ${gameState.currentPlayer} rolled a 6. Click on position 6 to place your stone.`;
                highlightPoint(6);
                return;
            }

            if (position === null) {
                // Position is empty, player can place a stone
                status.textContent = `Player ${gameState.currentPlayer} rolled a ${roll}. Click on position ${roll} to place your stone.`;
                // Highlight the point for clicking
                highlightPoint(roll);
            } else {
                // Position is occupied by any stone (own or opponent), must take it
                const stoneOwner = position === 1 ? "Player 1's" : "Player 2's";
                status.textContent = `Player ${gameState.currentPlayer} rolled a ${roll}. Taking ${stoneOwner} stone from position ${roll}.`;
                
                // Flash the point to show it's being taken
                flashPoint(roll);
                
                // Automatically take the stone after a delay
                setTimeout(() => {
                    // Add the stone to current player's total
                    if (gameState.currentPlayer === 1) {
                        gameState.player1Stones++;
                        document.getElementById('player1-stones').textContent = gameState.player1Stones;
                        // Add visual feedback of stone being added
                        addStoneFeedback('player1-stones');
                    } else {
                        gameState.player2Stones++;
                        document.getElementById('player2-stones').textContent = gameState.player2Stones;
                        // Add visual feedback of stone being added
                        addStoneFeedback('player2-stones');
                    }
                    
                    // Clear the position
                    gameState.board[roll] = null;
                    updateBoard();
                    switchPlayer();
                    document.getElementById('roll-btn').disabled = false;
                }, 1500);
                return;
            }
        }

        // Flash a point when stone is being taken
        function flashPoint(pointNumber) {
            const point = document.getElementById(`point-${pointNumber}`);
            let flashCount = 0;
            const maxFlashes = 3;
            const flashInterval = setInterval(() => {
                point.style.backgroundColor = flashCount % 2 === 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)';
                flashCount++;
                
                if (flashCount >= maxFlashes * 2) {
                    clearInterval(flashInterval);
                    point.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                }
            }, 200);
        }

        // Visual feedback when stone count increases
        function addStoneFeedback(elementId) {
            const element = document.getElementById(elementId);
            element.style.transform = 'scale(1.3)';
            element.style.color = '#FFD700';
            
            setTimeout(() => {
                element.style.transform = '';
                element.style.color = '';
            }, 700);
        }

        // Highlight a point that can be clicked
        function highlightPoint(pointNumber) {
            const point = document.getElementById(`point-${pointNumber}`);
            point.style.boxShadow = '0 0 20px gold, 0 0 30px gold';
            point.style.transform = 'scale(1.15)';
            
            // Add a pulsing animation
            point.style.animation = 'highlight-pulse 1s infinite alternate';
            if (!document.querySelector('#highlight-pulse-keyframes')) {
                const style = document.createElement('style');
                style.id = 'highlight-pulse-keyframes';
                style.textContent = `
                    @keyframes highlight-pulse {
                        from { box-shadow: 0 0 15px gold, 0 0 25px gold; }
                        to { box-shadow: 0 0 20px gold, 0 0 30px gold; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Remove highlight from all points
        function removeHighlights() {
            for (let i = 1; i <= 6; i++) {
                const point = document.getElementById(`point-${i}`);
                point.style.boxShadow = '';
                point.style.transform = '';
                point.style.animation = '';
            }
        }

        // Handle clicking on a point
        function handlePointClick(pointNumber) {
            // Only allow clicking if we rolled this number
            if (pointNumber !== gameState.currentRoll || gameState.gameOver) {
                return;
            }
            
            // If position is empty, place a stone
            if (gameState.board[pointNumber] === null || (pointNumber === 6 && gameState.centerStones < 11)) {
                // Check if the center spot already has 11 stones
                if (pointNumber === 6 && gameState.centerStones >= 11) {
                    const status = document.getElementById('status');
                    status.textContent = `Player ${gameState.currentPlayer} cannot place a stone in the center spot (position 6) as it already has 11 stones.`;
                    return;
                }

                gameState.board[pointNumber] = gameState.currentPlayer;
                
                // Decrease stone count for current player
                if (gameState.currentPlayer === 1) {
                    gameState.player1Stones--;
                    document.getElementById('player1-stones').textContent = gameState.player1Stones;
                } else {
                    gameState.player2Stones--;
                    document.getElementById('player2-stones').textContent = gameState.player2Stones;
                }

                // Increment centerStones if the stone is placed in the center spot
                if (pointNumber === 6) {
                    gameState.centerStones++;
                    document.getElementById('center-counter').textContent = `Center Stones: ${gameState.centerStones}`;
                }
                
                // Check win condition
                if (gameState.player1Stones === 0 || gameState.player2Stones === 0) {
                    gameState.gameOver = true;
                    showWinner();
                    return;
                }
                
                // Update board and switch player
                updateBoard();
                removeHighlights();
                switchPlayer();
                document.getElementById('roll-btn').disabled = false;
            }
        }

        // Update the visual representation of the board
        function updateBoard() {
            // Clear all stones first
            const existingStones = document.querySelectorAll('.stone');
            existingStones.forEach(stone => stone.remove());
            
            // Place stones based on board state
            for (let position = 1; position <= 6; position++) {
                const player = gameState.board[position];
                if (player !== null) {
                    const point = document.getElementById(`point-${position}`);
                    const stone = document.createElement('div');
                    stone.className = `stone player${player}-stone`;
                    point.appendChild(stone);
                }
            }

            // Update center counter
            document.getElementById('center-counter').textContent = `Center Stones: ${gameState.centerStones}`;
        }

        // Switch to the next player
        function switchPlayer() {
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            
            // Update UI to show current player
            document.querySelector('.player1').classList.toggle('active-player');
            document.querySelector('.player2').classList.toggle('active-player');
            
            const status = document.getElementById('status');
            status.textContent = `Player ${gameState.currentPlayer}'s turn. Roll the dice!`;
        }

        // Show winner modal
        function showWinner() {
            let winner;
            if (gameState.player1Stones === 0) {
                winner = 1;
            } else if (gameState.player2Stones === 0) {
                winner = 2;
            }
            
            document.getElementById('winner-text').textContent = `Player ${winner} Wins!`;
            document.getElementById('win-modal').style.display = 'block';
            
            const status = document.getElementById('status');
            status.textContent = `Game over! Player ${winner} wins!`;
        }

        // Reset the game
        function resetGame() {
            // Reset game state
            gameState.currentPlayer = 1;
            gameState.player1Stones = 6;
            gameState.player2Stones = 6;
            gameState.currentRoll = null;
            gameState.gameOver = false;
            gameState.centerStones = 0; // Reset the centerStones property
            
            // Clear the board
            for (let i = 1; i <= 6; i++) {
                gameState.board[i] = null;
            }
            
            // Update UI
            document.getElementById('player1-stones').textContent = '6';
            document.getElementById('player2-stones').textContent = '6';
            document.getElementById('dice').textContent = '?';
            document.getElementById('status').textContent = "Player 1's turn. Roll the dice!";
            
            // Hide modal
            document.getElementById('win-modal').style.display = 'none';
            
            // Make sure player 1 is active
            document.querySelector('.player1').classList.add('active-player');
            document.querySelector('.player2').classList.remove('active-player');
            
            // Enable roll button
            document.getElementById('roll-btn').disabled = false;
            
            // Update board visual
            updateBoard();
            removeHighlights();
        }

        // Toggle instructions visibility
        function toggleInstructions() {
            const instructions = document.getElementById('instructions');
            const toggle = document.querySelector('.instructions-toggle');
            
            if (instructions.style.display === 'block') {
                instructions.style.display = 'none';
                toggle.textContent = 'Show Game Rules';
            } else {
                instructions.style.display = 'block';
                toggle.textContent = 'Hide Game Rules';
            }
        }

        // Initialize the game
        window.onload = function() {
            initializeBoard();
        };
