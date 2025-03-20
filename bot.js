// Ye Olde Tic-Tac-Toe Discord Bot - Discord.js v14 Compatible
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Hard-coded token
const DISCORD_TOKEN = 'MTM1MTk5OTE0ODAzNTAxODgyMg.GRBBRh.bpWIR0SNtEZ_rITn9CagE8NrA-cO36lA_PDz7I';
const CLIENT_ID = '1351999148035018822';

// File paths
const GAME_DIR = './game_states';
const DATA_DIR = './data';
const LEADERBOARD_FILE = path.join(DATA_DIR, 'tictactoe-leaderboard.json');

// Difficulty levels
const DIFFICULTY_LEVELS = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// Create client with required intents for Discord.js v14
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Game states storage
const games = {};

// Leaderboard system
const leaderboard = {
    users: {},
    games: [],
    initialized: false,

    // Initialize the leaderboard
    init() {
        if (this.initialized) return true;
        
        try {
            // Ensure data directory exists
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
                console.log('Created data directory');
            }
            
            // Check if leaderboard file exists and load it
            if (fs.existsSync(LEADERBOARD_FILE)) {
                const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
                const parsedData = JSON.parse(data);
                
                this.users = parsedData.users || {};
                this.games = parsedData.games || [];
                
                console.log(`Loaded ${Object.keys(this.users).length} users and ${this.games.length} games from leaderboard`);
            } else {
                console.log('No leaderboard file found, starting with empty leaderboard');
                // Create an empty leaderboard file
                this.save();
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error("Error initializing leaderboard:", error);
            return false;
        }
    },

    // Save the leaderboard to file
    save() {
        try {
            // Ensure directory exists before saving
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            
            fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify({
                users: this.users,
                games: this.games
            }, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error("Error saving leaderboard:", error);
            return false;
        }
    },

    // Get user data, create if doesn't exist
    getUser(userId, username = null) {
        if (!this.users[userId]) {
            this.users[userId] = {
                userId,
                username,
                isBot: false,
                stats: {
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    totalGames: 0,
                    points: 0
                },
                lastPlayed: null
            };
        } else if (username && this.users[userId].username !== username) {
            // Update username if it changed
            this.users[userId].username = username;
        }
        
        return this.users[userId];
    },

    // Record a game result
    recordGame(gameData) {
        const { playerOneId, playerTwoId, winnerId, gameType, timestamp = Date.now(), difficulty } = gameData;
        
        // Get player data
        const playerOne = this.getUser(playerOneId, gameData.playerOneUsername);
        const playerTwo = this.getUser(playerTwoId, gameData.playerTwoUsername);
        
        // Update isBot if provided
        if (gameData.playerOneIsBot !== undefined) playerOne.isBot = gameData.playerOneIsBot;
        if (gameData.playerTwoIsBot !== undefined) playerTwo.isBot = gameData.playerTwoIsBot;
        
        // Record the game
        const gameRecord = {
            id: this.games.length + 1,
            playerOneId,
            playerTwoId,
            winnerId, // null for draw
            gameType,
            difficulty, // Add difficulty to the record
            timestamp
        };
        
        this.games.push(gameRecord);
        
        // Update player stats
        playerOne.lastPlayed = timestamp;
        playerTwo.lastPlayed = timestamp;
        
        playerOne.stats.totalGames++;
        playerTwo.stats.totalGames++;
        
        if (winnerId === null) {
            // Draw
            playerOne.stats.draws++;
            playerTwo.stats.draws++;
            playerOne.stats.points += 1;
            playerTwo.stats.points += 1;
        } else if (winnerId === playerOneId) {
            // Player One won
            playerOne.stats.wins++;
            playerTwo.stats.losses++;
            playerOne.stats.points += 3;
        } else if (winnerId === playerTwoId) {
            // Player Two won
            playerOne.stats.losses++;
            playerTwo.stats.wins++;
            playerTwo.stats.points += 3;
        }
        
        // Save changes
        this.save();
        
        return gameRecord;
    },

    // Get leaderboard sorted by points
    getLeaderboard(options = {}) {
        const { limit = 10, sort = 'points', filterBots = false, gameType = null, difficulty = null } = options;
        
        let users = Object.values(this.users);
        
        // Apply filters
        if (filterBots) {
            users = users.filter(user => !user.isBot);
        }
        
        if (gameType || difficulty) {
            // Filter users who have played the specified game type and/or difficulty
            const userIdsWithCriteria = new Set();
            for (const game of this.games) {
                if ((gameType && game.gameType !== gameType) || 
                    (difficulty && game.difficulty !== difficulty)) {
                    continue;
                }
                userIdsWithCriteria.add(game.playerOneId);
                userIdsWithCriteria.add(game.playerTwoId);
            }
            users = users.filter(user => userIdsWithCriteria.has(user.userId));
        }
        
        // Sort users
        users.sort((a, b) => {
            if (sort === 'wins') return b.stats.wins - a.stats.wins;
            if (sort === 'winRate') {
                const aRate = a.stats.totalGames > 0 ? a.stats.wins / a.stats.totalGames : 0;
                const bRate = b.stats.totalGames > 0 ? b.stats.wins / b.stats.totalGames : 0;
                return bRate - aRate;
            }
            // Default: sort by points
            return b.stats.points - a.stats.points;
        });
        
        // Limit results
        return users.slice(0, limit);
    },

    // Get statistics for a specific user
    getUserStats(userId, options = {}) {
        const { difficulty = null } = options;
        
        if (!this.users[userId]) {
            return null;
        }
        
        const user = this.users[userId];
        let games = this.games.filter(
            game => game.playerOneId === userId || game.playerTwoId === userId
        );
        
        // Filter by difficulty if provided
        if (difficulty) {
            games = games.filter(game => game.difficulty === difficulty);
        }
        
        return {
            user,
            games,
            recentGames: games.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
        };
    }
};

// Game functions
function initializeGame(userId) {
    games[userId] = {
        board: [null, null, null, null, null, null, null, null, null],
        isPlayerTurn: true,
        winner: null,
        gameOver: false,
        playerSymbol: "X",
        botSymbol: "O",
        lastMessageId: null,
        lastChannelId: null,
        difficulty: DIFFICULTY_LEVELS.MEDIUM // Default to medium difficulty
    };
}

function loadGameState(userId) {
    const filePath = `${GAME_DIR}/tictactoe_${userId}.json`;
    
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            games[userId] = JSON.parse(data);
            
            // Ensure difficulty is set (for backwards compatibility)
            if (!games[userId].difficulty) {
                games[userId].difficulty = DIFFICULTY_LEVELS.MEDIUM;
            }
            
            return "Previous game state hath been restored, noble player.";
        } catch (err) {
            console.error("Error loading game state:", err);
            initializeGame(userId);
            return "The previous record of our game hath been corrupted. We shall begin anew.";
        }
    } else {
        initializeGame(userId);
        return "No previous contest found. Let us begin a fresh battle.";
    }
}

function saveGameState(userId) {
    const filePath = `${GAME_DIR}/tictactoe_${userId}.json`;
    
    try {
        // Ensure directory exists
        if (!fs.existsSync(GAME_DIR)) {
            fs.mkdirSync(GAME_DIR, { recursive: true });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(games[userId], null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Failed to save game state:", err);
        return false;
    }
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case DIFFICULTY_LEVELS.EASY:
            return "Thou facest a squire in training. 'Tis a simple challenge.";
        case DIFFICULTY_LEVELS.MEDIUM:
            return "Thou facest a knight of moderate skill. A worthy opponent.";
        case DIFFICULTY_LEVELS.HARD:
            return "Thou facest the royal champion! Only the best shall prevail.";
        default:
            return "Thy opponent awaits.";
    }
}

function checkWinner(board, symbol) {
    // Check rows
    for (let i = 0; i < 9; i += 3) {
        if (board[i] === symbol && board[i + 1] === symbol && board[i + 2] === symbol) {
            return true;
        }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
        if (board[i] === symbol && board[i + 3] === symbol && board[i + 6] === symbol) {
            return true;
        }
    }
    
    // Check diagonals
    if (board[0] === symbol && board[4] === symbol && board[8] === symbol) {
        return true;
    }
    if (board[2] === symbol && board[4] === symbol && board[6] === symbol) {
        return true;
    }
    
    return false;
}

function checkDraw(board) {
    return board.every(cell => cell !== null);
}

function makeRandomMove(board) {
    // Find all empty cells
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            emptyCells.push(i);
        }
    }
    
    // Return a random empty cell
    if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }
    
    return null; // No moves possible
}

function findWinningMove(board, symbol) {
    // Check rows
    for (let i = 0; i < 9; i += 3) {
        if (board[i] === symbol && board[i + 1] === symbol && board[i + 2] === null) {
            return i + 2;
        } else if (board[i] === symbol && board[i + 1] === null && board[i + 2] === symbol) {
            return i + 1;
        } else if (board[i] === null && board[i + 1] === symbol && board[i + 2] === symbol) {
            return i;
        }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
        if (board[i] === symbol && board[i + 3] === symbol && board[i + 6] === null) {
            return i + 6;
        } else if (board[i] === symbol && board[i + 3] === null && board[i + 6] === symbol) {
            return i + 3;
        } else if (board[i] === null && board[i + 3] === symbol && board[i + 6] === symbol) {
            return i;
        }
    }
    
    // Check diagonals
    if (board[0] === symbol && board[4] === symbol && board[8] === null) {
        return 8;
    } else if (board[0] === symbol && board[4] === null && board[8] === symbol) {
        return 4;
    } else if (board[0] === null && board[4] === symbol && board[8] === symbol) {
        return 0;
    } else if (board[2] === symbol && board[4] === symbol && board[6] === null) {
        return 6;
    } else if (board[2] === symbol && board[4] === null && board[6] === symbol) {
        return 4;
    } else if (board[2] === null && board[4] === symbol && board[6] === symbol) {
        return 2;
    }
    
    return null; // No winning move found
}

function createBoardEmbed(userId, message = "") {
    const game = games[userId];
    
    // Create board representation
    let boardString = "Current board:\n";
    boardString += `${game.board[0] || ' '} | ${game.board[1] || ' '} | ${game.board[2] || ' '}\n`;
    boardString += "---+---+---\n";
    boardString += `${game.board[3] || ' '} | ${game.board[4] || ' '} | ${game.board[5] || ' '}\n`;
    boardString += "---+---+---\n";
    boardString += `${game.board[6] || ' '} | ${game.board[7] || ' '} | ${game.board[8] || ' '}`;
    
    const embed = new EmbedBuilder()
        .setTitle('Ye Olde Tic-Tac-Toe')
        .setDescription(message || "Make thy move, noble challenger!")
        .setColor(0x0099FF)
        .addFields(
            { name: 'The Field of Battle', value: '```' + boardString + '```' },
            { name: 'Challenge Level', value: `${game.difficulty.toUpperCase()} - ${getDifficultyText(game.difficulty)}`, inline: true }
        );
    
    if (game.gameOver) {
        if (game.winner === game.playerSymbol) {
            embed.addFields({ name: 'Outcome', value: 'Thou hast emerged victorious! The kingdom shall sing songs of thy triumph.' });
        } else if (game.winner === game.botSymbol) {
            embed.addFields({ name: 'Outcome', value: 'Alas, thou hast been defeated! My strategy hath prevailed this day.' });
        } else {
            embed.addFields({ name: 'Outcome', value: 'Lo! A stalemate! Neither warrior could best the other.' });
        }
    } else {
        embed.addFields({ name: 'Turn', value: game.isPlayerTurn ? 'Thy turn to move!' : 'I am contemplating my strategy...' });
    }
    
    return embed;
}

function createLeaderboardEmbed(title, users, difficulty = null) {
    const embed = new EmbedBuilder()
        .setTitle(title + (difficulty ? ` (${difficulty.toUpperCase()})` : ''))
        .setColor(0x2ECC71)
        .setTimestamp();
    
    if (users.length === 0) {
        embed.setDescription("No warriors have yet been recorded in the annals of history.");
        return embed;
    }
    
    let description = "";
    users.forEach((user, index) => {
        const winRate = user.stats.totalGames > 0 
            ? (user.stats.wins / user.stats.totalGames * 100).toFixed(1) 
            : '0.0';
        
        description += `${index + 1}. **${user.username || user.userId}**: ${user.stats.wins} victories, ` +
                       `${user.stats.losses} defeats, ${user.stats.draws} stalemates ` +
                       `(${winRate}% Win Rate)\n`;
    });
    
    embed.setDescription(description);
    return embed;
}

function createUserStatsEmbed(userId, stats, difficulty = null) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB);
        
    if (!stats || !stats.user) {
        embed.setTitle('Warrior Record')
            .setDescription('This warrior has not yet taken the field of battle.');
        return embed;
    }
    
    const user = stats.user;
    const winRate = user.stats.totalGames > 0 
        ? (user.stats.wins / user.stats.totalGames * 100).toFixed(1) 
        : '0.0';
    
    embed.setTitle(`Battle Record of ${user.username || user.userId}` + 
                  (difficulty ? ` (${difficulty.toUpperCase()})` : ''))
        .addFields(
            { name: 'Total Contests', value: user.stats.totalGames.toString(), inline: true },
            { name: 'Victories', value: user.stats.wins.toString(), inline: true },
            { name: 'Defeats', value: user.stats.losses.toString(), inline: true },
            { name: 'Stalemates', value: user.stats.draws.toString(), inline: true },
            { name: 'Win Rate', value: `${winRate}%`, inline: true },
            { name: 'Royal Points', value: user.stats.points.toString(), inline: true }
        );
    
    if (stats.recentGames.length > 0) {
        let recentGamesText = '';
        stats.recentGames.forEach((game, index) => {
            const opponent = game.playerOneId === userId ? 
                leaderboard.users[game.playerTwoId]?.username || 'Unknown Opponent' : 
                leaderboard.users[game.playerOneId]?.username || 'Unknown Opponent';
            
            let result;
            if (game.winnerId === null) {
                result = 'Stalemate';
            } else if (game.winnerId === userId) {
                result = 'Victory';
            } else {
                result = 'Defeat';
            }
            
            const difficultyText = game.difficulty ? ` (${game.difficulty})` : '';
            const date = new Date(game.timestamp).toLocaleDateString();
            recentGamesText += `${index + 1}. vs ${opponent} - ${result}${difficultyText} (${date})\n`;
        });
        
        embed.addFields({ name: 'Recent Contests', value: recentGamesText });
    }
    
    return embed;
}

async function recordGameResult(userId, result) {
    try {
        const user = await client.users.fetch(userId);
        const game = games[userId];
        
        // Record the game result in the leaderboard
        leaderboard.recordGame({
            playerOneId: userId,
            playerOneUsername: user.username,
            playerOneIsBot: false,
            playerTwoId: client.user.id,
            playerTwoUsername: client.user.username,
            playerTwoIsBot: true,
            // Set winner based on result ('player', 'bot', or 'draw')
            winnerId: result === 'player' ? userId : 
                      result === 'bot' ? client.user.id : 
                      null, // Draw
            gameType: 'tictactoe',
            difficulty: game.difficulty, // Add difficulty to the record
            timestamp: Date.now()
        });
        
        console.log(`Game result recorded: ${result}, difficulty: ${game.difficulty}`);
    } catch (error) {
        console.error('Error recording game result:', error);
    }
}

async function makeBotMove(userId, message) {
    const game = games[userId];
    let botMoveMessage = "";
    
    // Make move based on difficulty
    let moved = false;
    
    switch (game.difficulty) {
        case DIFFICULTY_LEVELS.EASY:
            // Easy: Make random moves
            const randomPosition = makeRandomMove(game.board);
            if (randomPosition !== null) {
                game.board[randomPosition] = game.botSymbol;
                botMoveMessage = "I have placed my mark at random! What shall be thy response?";
                moved = true;
            }
            break;
            
        case DIFFICULTY_LEVELS.MEDIUM:
            // Medium: Try to win, sometimes block, sometimes random
            const makeStrategicMove = Math.random() > 0.3; // 70% chance to make a strategic move
            
            if (makeStrategicMove) {
                // Try to win first
                const winningMove = findWinningMove(game.board, game.botSymbol);
                
                if (winningMove !== null) {
                    game.board[winningMove] = game.botSymbol;
                    botMoveMessage = "My strategy prevails! Behold my cunning move!";
                    moved = true;
                    break;
                }
                
                // Try to block sometimes
                const shouldBlock = Math.random() > 0.4; // 60% chance to block
                if (shouldBlock) {
                    const blockingMove = findWinningMove(game.board, game.playerSymbol);
                    
                    if (blockingMove !== null) {
                        game.board[blockingMove] = game.botSymbol;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        moved = true;
                        break;
                    }
                }
                
                // Take center if available
                if (game.board[4] === null) {
                    game.board[4] = game.botSymbol;
                    moved = true;
                    botMoveMessage = "I claim the center of the field! Thy move, noble challenger.";
                    break;
                }
            }
            
            // If no strategic move was made, make a random move
            if (!moved) {
                const randomFallbackPosition = makeRandomMove(game.board);
                if (randomFallbackPosition !== null) {
                    game.board[randomFallbackPosition] = game.botSymbol;
                    botMoveMessage = "I have placed my mark! What shall be thy response?";
                    moved = true;
                }
            }
            break;
            
        case DIFFICULTY_LEVELS.HARD:
        default:
            // Hard: Original AI logic - try to win
            // Row checks for winning
            for (let i = 0; i < 9; i += 3) {
                if (!moved) {
                    if (game.board[i] === game.botSymbol && game.board[i + 1] === game.botSymbol && game.board[i + 2] === null) {
                        game.board[i + 2] = game.botSymbol;
                        moved = true;
                    } else if (game.board[i] === game.botSymbol && game.board[i + 1] === null && game.board[i + 2] === game.botSymbol) {
                        game.board[i + 1] = game.botSymbol;
                        moved = true;
                    } else if (game.board[i] === null && game.board[i + 1] === game.botSymbol && game.board[i + 2] === game.botSymbol) {
                        game.board[i] = game.botSymbol;
                        moved = true;
                    }
                }
            }
            
            // Column checks for winning
            for (let i = 0; i < 3 && !moved; i++) {
                if (game.board[i] === game.botSymbol && game.board[i + 3] === game.botSymbol && game.board[i + 6] === null) {
                    game.board[i + 6] = game.botSymbol;
                    moved = true;
                } else if (game.board[i] === game.botSymbol && game.board[i + 3] === null && game.board[i + 6] === game.botSymbol) {
                    game.board[i + 3] = game.botSymbol;
                    moved = true;
                } else if (game.board[i] === null && game.board[i + 3] === game.botSymbol && game.board[i + 6] === game.botSymbol) {
                    game.board[i] = game.botSymbol;
                    moved = true;
                }
            }
            
            // Diagonal checks for winning
            if (!moved) {
                // Diagonal 1
                if (game.board[0] === game.botSymbol && game.board[4] === game.botSymbol && game.board[8] === null) {
                    game.board[8] = game.botSymbol;
                    moved = true;
                } else if (game.board[0] === game.botSymbol && game.board[4] === null && game.board[8] === game.botSymbol) {
                    game.board[4] = game.botSymbol;
                    moved = true;
                } else if (game.board[0] === null && game.board[4] === game.botSymbol && game.board[8] === game.botSymbol) {
                    game.board[0] = game.botSymbol;
                    moved = true;
                }
                
                // Diagonal 2
                else if (game.board[2] === game.botSymbol && game.board[4] === game.botSymbol && game.board[6] === null) {
                    game.board[6] = game.botSymbol;
                    moved = true;
                } else if (game.board[2] === game.botSymbol && game.board[4] === null && game.board[6] === game.botSymbol) {
                    game.board[4] = game.botSymbol;
                    moved = true;
                } else if (game.board[2] === null && game.board[4] === game.botSymbol && game.board[6] === game.botSymbol) {
                    game.board[2] = game.botSymbol;
                    moved = true;
                }
            }
            
            // If bot can't win, try to block player
            if (!moved) {
                // Block player - rows
                for (let i = 0; i < 9; i += 3) {
                    if (game.board[i] === game.playerSymbol && game.board[i + 1] === game.playerSymbol && game.board[i + 2] === null) {
                        game.board[i + 2] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    } else if (game.board[i] === game.playerSymbol && game.board[i + 1] === null && game.board[i + 2] === game.playerSymbol) {
                        game.board[i + 1] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    } else if (game.board[i] === null && game.board[i + 1] === game.playerSymbol && game.board[i + 2] === game.playerSymbol) {
                        game.board[i] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    }
                }
                
                // Block player - columns
                for (let i = 0; i < 3 && !moved; i++) {
                    if (game.board[i] === game.playerSymbol && game.board[i + 3] === game.playerSymbol && game.board[i + 6] === null) {
                        game.board[i + 6] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    } else if (game.board[i] === game.playerSymbol && game.board[i + 3] === null && game.board[i + 6] === game.playerSymbol) {
                        game.board[i + 3] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    } else if (game.board[i] === null && game.board[i + 3] === game.playerSymbol && game.board[i + 6] === game.playerSymbol) {
                        game.board[i] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                        break;
                    }
                }
                
                // Block player - diagonals
                if (!moved) {
                    // Diagonal 1
                    if (game.board[0] === game.playerSymbol && game.board[4] === game.playerSymbol && game.board[8] === null) {
                        game.board[8] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    } else if (game.board[0] === game.playerSymbol && game.board[4] === null && game.board[8] === game.playerSymbol) {
                        game.board[4] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    } else if (game.board[0] === null && game.board[4] === game.playerSymbol && game.board[8] === game.playerSymbol) {
                        game.board[0] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    }
                    
                    // Diagonal 2
                    else if (game.board[2] === game.playerSymbol && game.board[4] === game.playerSymbol && game.board[6] === null) {
                        game.board[6] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    } else if (game.board[2] === game.playerSymbol && game.board[4] === null && game.board[6] === game.playerSymbol) {
                        game.board[4] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    } else if (game.board[2] === null && game.board[4] === game.playerSymbol && game.board[6] === game.playerSymbol) {
                        game.board[2] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                    }
                }
            }
            
            // Take center if available
            if (!moved && game.board[4] === null) {
                game.board[4] = game.botSymbol;
                moved = true;
                botMoveMessage = "I claim the center of the field! Thy move, noble challenger.";
            }
            
            // Take corners
            if (!moved) {
                const corners = [0, 2, 6, 8];
                for (const corner of corners) {
                    if (game.board[corner] === null) {
                        game.board[corner] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "I shall fortify the corner! Proceed with thy countermove, good player.";
                        break;
                    }
                }
            }
            
            // Take any available space
            if (!moved) {
                for (let i = 0; i < 9; i++) {
                    if (game.board[i] === null) {
                        game.board[i] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "I have placed my mark! What shall be thy response?";
                        break;
                    }
                }
            }
            break;
    }
    
    // Auto-save after bot's move
    saveGameState(userId);
    
    // Check if bot has won
    if (checkWinner(game.board, game.botSymbol)) {
        game.winner = game.botSymbol;
        game.gameOver = true;
        botMoveMessage = "Alas, thou hast been defeated! My strategy hath prevailed this day. Type '!start' for a chance to restore thy honor.";
        
        // Record the game result
        await recordGameResult(userId, 'bot');
    } else if (checkDraw(game.board)) {
        game.gameOver = true;
        botMoveMessage = "Lo! A stalemate! Neither warrior could best the other. Type '!start' to break this impasse with another contest.";
        
        // Record the game as a draw
        await recordGameResult(userId, 'draw');
    }
    
    // Bot's move complete, back to player if game isn't over
    if (!game.gameOver) {
        game.isPlayerTurn = true;
    }
    
    // Create updated board
    const embed = createBoardEmbed(userId, botMoveMessage);
    
    // Send updated board
    try {
        await message.channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending bot move message:', error);
    }
    
    return game;
}

// Message-based commands
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const content = message.content.trim();
    
    // Command: start a new game
    if (content === '!start') {
        // Reset or create new game for this user
        initializeGame(message.author.id);
        saveGameState(message.author.id);
        
        // Display initial game board
        const embed = createBoardEmbed(message.author.id, "A new game begins! Make thy first move by typing '!move <position>' (positions 1-9).");
        message.channel.send({ embeds: [embed] });
    }
    
    // Command: make a move
    else if (content.startsWith('!move')) {
        const userId = message.author.id;
        
        // Check if there's an active game
        if (!games[userId]) {
            loadGameState(userId);
        }
        
        const game = games[userId];
        
        // Check if game is over
        if (game.gameOver) {
            message.reply("The battle is concluded! Type '!start' to begin anew.");
            return;
        }
        
        // Check if it's the player's turn
        if (!game.isPlayerTurn) {
            message.reply("Hold thy hand! 'Tis not thy turn to place a mark.");
            return;
        }
        
        // Get the position from the command
        const position = parseInt(content.split(' ')[1]);
        
        // Check if position is valid
        if (isNaN(position) || position < 1 || position > 9) {
            message.reply("Invalid move! Thou must choose a number between 1 and 9.");
            return;
        }
        
        // Convert to 0-indexed position
        const boardPosition = position - 1;
        
        // Check if the position is already taken
        if (game.board[boardPosition] !== null) {
            message.reply("That square is already occupied! Choose another, good player.");
            return;
        }
        
        // Make the player's move
        game.board[boardPosition] = game.playerSymbol;
        
        // Save the game state
        saveGameState(userId);
        
        // Check if player has won
        if (checkWinner(game.board, game.playerSymbol)) {
            game.winner = game.playerSymbol;
            game.gameOver = true;
            saveGameState(userId);
            
            // Record the game in leaderboard
            await recordGameResult(userId, 'player');
            
            // Display final board
            const embed = createBoardEmbed(userId, "Verily, thou hast emerged victorious! The kingdom shall sing songs of thy triumph.");
            message.channel.send({ embeds: [embed] });
            return;
        }
        
        // Check for draw
        if (checkDraw(game.board)) {
            game.gameOver = true;
            saveGameState(userId);
            
            // Record the draw in leaderboard
            await recordGameResult(userId, 'draw');
            
            // Display final board
            const embed = createBoardEmbed(userId, "Lo! A stalemate! Neither warrior could best the other.");
            message.channel.send({ embeds: [embed] });
            return;
        }
        
        // Display player's move
        const playerMoveEmbed = createBoardEmbed(userId, "Thy move is made! Now I shall contemplate my strategy...");
        const playerMoveMessage = await message.channel.send({ embeds: [playerMoveEmbed] });
        
        // Now it's bot's turn
        game.isPlayerTurn = false;
        
        // Wait a moment for "thinking"
        setTimeout(async () => {
            // Make bot's move
            await makeBotMove(userId, message);
        }, 1500);
    }
    
    // Command: change difficulty
    else if (content.startsWith('!difficulty')) {
        const userId = message.author.id;
        const args = content.split(' ');
        
        // If no difficulty specified, show current
        if (args.length === 1) {
            // Load game if doesn't exist
            if (!games[userId]) {
                loadGameState(userId);
            }
            
            const difficulty = games[userId].difficulty;
            message.reply(`Current difficulty: ${difficulty.toUpperCase()} - ${getDifficultyText(difficulty)}`);
            
            // Show available options
            message.channel.send(
                "Choose thy challenge level:\n" +
                "Type `!difficulty easy` - A squire in training, who makes random moves.\n" +
                "Type `!difficulty medium` - A knight of moderate skill, who sometimes makes mistakes.\n" +
                "Type `!difficulty hard` - The royal champion, who plays with perfect strategy."
            );
            return;
        }
        
        // Try to set difficulty
        const newDifficulty = args[1].toLowerCase();
        
        if (!Object.values(DIFFICULTY_LEVELS).includes(newDifficulty)) {
            message.reply(`Invalid difficulty! Choose from: ${Object.values(DIFFICULTY_LEVELS).join(', ')}`);
            return;
        }
        
        // Load game if doesn't exist
        if (!games[userId]) {
            loadGameState(userId);
        }
        
        // Set the difficulty
        games[userId].difficulty = newDifficulty;
        saveGameState(userId);
        
        // Confirm change
        let responseMessage = '';
        switch (newDifficulty) {
            case DIFFICULTY_LEVELS.EASY:
                responseMessage = "Thou hast chosen to face a squire in training. The challenge shall be light.";
                break;
            case DIFFICULTY_LEVELS.MEDIUM:
                responseMessage = "Thou hast chosen to face a knight of moderate skill. A fair challenge awaits.";
                break;
            case DIFFICULTY_LEVELS.HARD:
                responseMessage = "Thou hast chosen to face the royal champion! Only the most skilled shall prevail.";
                break;
        }
        
        message.reply(responseMessage);
    }
    
    // Command: view leaderboard
    else if (content.startsWith('!leaderboard')) {
        const args = content.split(' ');
        const limit = parseInt(args[1]) ||
        10;
        const difficulty = args[2] ? args[2].toLowerCase() : null;
        
        // Validate difficulty if provided
        if (difficulty && !Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
            message.reply(`Invalid difficulty! Choose from: ${Object.values(DIFFICULTY_LEVELS).join(', ')}`);
            return;
        }
        
        const topUsers = leaderboard.getLeaderboard({ 
            limit, 
            gameType: 'tictactoe',
            difficulty: difficulty 
        });
        
        const leaderboardEmbed = createLeaderboardEmbed(
            'Tic-Tac-Toe Hall of Fame', 
            topUsers,
            difficulty
        );
        
        message.channel.send({ embeds: [leaderboardEmbed] });
    }
    
    // Command: view stats
    else if (content.startsWith('!stats')) {
        const args = content.split(' ');
        const difficultyArg = args.find(arg => Object.values(DIFFICULTY_LEVELS).includes(arg.toLowerCase()));
        const difficulty = difficultyArg ? difficultyArg.toLowerCase() : null;
        
        // Default to message author, unless a user is mentioned
        let userId = message.author.id;
        let targetUser = message.author;
        
        // Check for mentioned user
        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
            userId = targetUser.id;
        }
        
        const stats = leaderboard.getUserStats(userId, {
            difficulty: difficulty
        });
        
        const statsEmbed = createUserStatsEmbed(
            userId, 
            stats,
            difficulty
        );
        
        message.channel.send({ embeds: [statsEmbed] });
    }
    
    // Command: help
    else if (content === '!help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Ye Olde Tic-Tac-Toe Help')
            .setColor(0x00FFFF)
            .addFields(
                { 
                    name: 'Game Commands', 
                    value: '`!start` - Begin a new game\n' +
                        '`!move <position>` - Make thy move (positions 1-9)\n' +
                        '`!difficulty` - View current difficulty\n' +
                        '`!difficulty <easy|medium|hard>` - Change game difficulty'
                },
                {
                    name: 'Leaderboard Commands',
                    value: '`!leaderboard [limit] [difficulty]` - View the hall of fame\n' +
                        '`!stats [@user] [difficulty]` - View battle statistics'
                },
                {
                    name: 'How to Play',
                    value: 'The grid positions are numbered 1-9 as follows:\n```\n' +
                        '1 | 2 | 3\n' +
                        '---+---+---\n' +
                        '4 | 5 | 6\n' +
                        '---+---+---\n' +
                        '7 | 8 | 9\n```'
                }
            );
        
        message.channel.send({ embeds: [helpEmbed] });
    }
});

// Ready event
client.on('ready', async () => {
    console.log(`Ye Olde Tic-Tac-Toe Bot has awakened! Logged in as ${client.user.tag}`);
    
    // Ensure game states directory exists
    if (!fs.existsSync(GAME_DIR)) {
        fs.mkdirSync(GAME_DIR, { recursive: true });
        console.log('Created game states directory');
    }
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('Created data directory');
    }
    
    // Initialize leaderboard
    leaderboard.init();
    console.log('Leaderboard system initialized');
    
    // Set bot status
    client.user.setActivity('!help for commands');
});

// Login to Discord with token
client.login(DISCORD_TOKEN);