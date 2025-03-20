// Ye Olde Tic-Tac-Toe Discord Bot - Discord.js v14+ Compatible with Slash Commands
// ==========================================
// 1. Imports and Dependencies
// ==========================================
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes,
    ActivityType
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ==========================================
// 2. Console Logging Utility (Google Chrome DevTools style)
// ==========================================
const logger = {
    colors: {
        reset: '\x1b[0m',
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
        brightRed: '\x1b[91m',
        brightGreen: '\x1b[92m',
        brightYellow: '\x1b[93m',
        brightBlue: '\x1b[94m',
        brightMagenta: '\x1b[95m',
        brightCyan: '\x1b[96m',
        brightWhite: '\x1b[97m',
        bgBlack: '\x1b[40m',
        bgRed: '\x1b[41m',
        bgGreen: '\x1b[42m',
        bgYellow: '\x1b[43m',
        bgBlue: '\x1b[44m',
        bgMagenta: '\x1b[45m',
        bgCyan: '\x1b[46m',
        bgWhite: '\x1b[47m'
    },
    
    timestamp() {
        return `[${new Date().toISOString()}]`;
    },
    
    error(message, ...args) {
        console.error(`${this.colors.red}${this.timestamp()} [ERROR] ${message}${this.colors.reset}`, ...args);
    },
    
    warn(message, ...args) {
        console.warn(`${this.colors.yellow}${this.timestamp()} [WARN] ${message}${this.colors.reset}`, ...args);
    },
    
    info(message, ...args) {
        console.info(`${this.colors.blue}${this.timestamp()} [INFO] ${message}${this.colors.reset}`, ...args);
    },
    
    success(message, ...args) {
        console.log(`${this.colors.green}${this.timestamp()} [SUCCESS] ${message}${this.colors.reset}`, ...args);
    },
    
    debug(message, ...args) {
        console.debug(`${this.colors.gray}${this.timestamp()} [DEBUG] ${message}${this.colors.reset}`, ...args);
    },
    
    event(message, ...args) {
        console.log(`${this.colors.cyan}${this.timestamp()} [EVENT] ${message}${this.colors.reset}`, ...args);
    },
    
    game(message, ...args) {
        console.log(`${this.colors.magenta}${this.timestamp()} [GAME] ${message}${this.colors.reset}`, ...args);
    },
    
    network(message, ...args) {
        console.log(`${this.colors.brightBlue}${this.timestamp()} [NETWORK] ${message}${this.colors.reset}`, ...args);
    },
    
    command(message, ...args) {
        console.log(`${this.colors.brightGreen}${this.timestamp()} [COMMAND] ${message}${this.colors.reset}`, ...args);
    },
    
    table(data) {
        console.table(data);
    }
};

// ==========================================
// 3. Constants
// ==========================================
// Hard-coded token - keep this secret!
const DISCORD_TOKEN = 'Secrethere';
const CLIENT_ID = 'cli id here';

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

// ==========================================
// 4. Client Initialization
// ==========================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Game states storage
const games = {};

// ==========================================
// 5. Game State Management
// ==========================================
function initializeGame(userId) {
    logger.game(`Initializing new game for user ${userId}`);
    games[userId] = {
        board: [null, null, null, null, null, null, null, null, null],
        isPlayerTurn: true,
        winner: null,
        gameOver: false,
        playerSymbol: "X",
        botSymbol: "O",
        lastInteractionId: null,
        difficulty: DIFFICULTY_LEVELS.MEDIUM // Default to medium difficulty
    };
}

function loadGameState(userId) {
    const filePath = `${GAME_DIR}/tictactoe_${userId}.json`;
    
    if (fs.existsSync(filePath)) {
        try {
            logger.debug(`Loading game state for user ${userId}`);
            const data = fs.readFileSync(filePath, 'utf8');
            games[userId] = JSON.parse(data);
            
            // Ensure difficulty is set (for backwards compatibility)
            if (!games[userId].difficulty) {
                games[userId].difficulty = DIFFICULTY_LEVELS.MEDIUM;
                logger.debug(`Set default difficulty for user ${userId}`);
            }
            
            logger.success(`Game state loaded for user ${userId}`);
            return "Previous game state hath been restored, noble player.";
        } catch (err) {
            logger.error(`Error loading game state for user ${userId}:`, err);
            initializeGame(userId);
            return "The previous record of our game hath been corrupted. We shall begin anew.";
        }
    } else {
        logger.debug(`No saved game found for user ${userId}, initializing new game`);
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
            logger.info(`Created game states directory: ${GAME_DIR}`);
        }
        
        fs.writeFileSync(filePath, JSON.stringify(games[userId], null, 2), 'utf8');
        logger.debug(`Game state saved for user ${userId}`);
        return true;
    } catch (err) {
        logger.error(`Failed to save game state for user ${userId}:`, err);
        return false;
    }
}

// ==========================================
// 6. Game Logic Functions
// ==========================================
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

// ==========================================
// 7. UI Components
// ==========================================
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
    
    logger.debug(`Created board embed for user ${userId}`);
    return embed;
}

function createBoardComponents(userId) {
    const game = games[userId];
    
    // Create the button grid for making moves
    const rows = [];
    
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const position = i * 3 + j;
            const value = game.board[position];
            
            // Determine button style and label based on board value
            let style = ButtonStyle.Secondary; // Grey button for empty
            let label = String(position + 1); // Use cell number instead of space
            let disabled = false;
            
            if (value === game.playerSymbol) {
                style = ButtonStyle.Primary; // Blue button for player
                label = 'X';
                disabled = true;
            } else if (value === game.botSymbol) {
                style = ButtonStyle.Danger; // Red button for bot
                label = 'O';
                disabled = true;
            }
            
            // Disable all buttons if game is over
            if (game.gameOver) {
                disabled = true;
            }
            
            // Add the button to the row
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_${position}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(disabled)
            );
        }
        rows.push(row);
    }
    
    // Add difficulty buttons
    const difficultyRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('difficulty_easy')
                .setLabel('Easy')
                .setStyle(game.difficulty === DIFFICULTY_LEVELS.EASY ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('difficulty_medium')
                .setLabel('Medium')
                .setStyle(game.difficulty === DIFFICULTY_LEVELS.MEDIUM ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('difficulty_hard')
                .setLabel('Hard')
                .setStyle(game.difficulty === DIFFICULTY_LEVELS.HARD ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('reset_game')
                .setLabel('New Game')
                .setStyle(ButtonStyle.Primary)
        );
    
    rows.push(difficultyRow);
    logger.debug(`Created board components for user ${userId}`);
    return rows;
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
    logger.debug(`Created leaderboard embed for ${users.length} users`);
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
                  (difficulty ? ` (${difficulty.toUpperCase()})` : ''));
                  
    embed.addFields(
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
    
    logger.debug(`Created stats embed for user ${userId}`);
    return embed;
}

// ==========================================
// 8. Leaderboard System
// ==========================================
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
                logger.info(`Created data directory: ${DATA_DIR}`);
            }
            
            // Check if leaderboard file exists and load it
            if (fs.existsSync(LEADERBOARD_FILE)) {
                const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
                const parsedData = JSON.parse(data);
                
                this.users = parsedData.users || {};
                this.games = parsedData.games || [];
                
                logger.success(`Loaded leaderboard: ${Object.keys(this.users).length} users and ${this.games.length} games`);
                
                // Debug: Show top 3 players
                if (Object.keys(this.users).length > 0) {
                    const topUsers = Object.values(this.users)
                        .sort((a, b) => b.stats.points - a.stats.points)
                        .slice(0, 3);
                    
                    logger.debug('Top 3 players on leaderboard:');
                    logger.table(topUsers.map(user => ({
                        Username: user.username || user.userId,
                        Wins: user.stats.wins,
                        Losses: user.stats.losses,
                        Draws: user.stats.draws,
                        Points: user.stats.points
                    })));
                }
            } else {
                logger.warn('No leaderboard file found, starting with empty leaderboard');
                // Create an empty leaderboard file
                this.save();
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            logger.error("Error initializing leaderboard:", error);
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
            
            logger.debug(`Leaderboard saved to ${LEADERBOARD_FILE}`);
            return true;
        } catch (error) {
            logger.error("Error saving leaderboard:", error);
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
            logger.debug(`Created new user in leaderboard: ${username || userId}`);
        } else if (username && this.users[userId].username !== username) {
            // Update username if it changed
            logger.debug(`Updated username in leaderboard: ${this.users[userId].username} -> ${username}`);
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
        
        let resultText = "";
        if (winnerId === null) {
            // Draw
            playerOne.stats.draws++;
            playerTwo.stats.draws++;
            playerOne.stats.points += 1;
            playerTwo.stats.points += 1;
            resultText = "Draw";
        } else if (winnerId === playerOneId) {
            // Player One won
            playerOne.stats.wins++;
            playerTwo.stats.losses++;
            playerOne.stats.points += 3;
            resultText = `${playerOne.username || playerOneId} won`;
        } else if (winnerId === playerTwoId) {
            // Player Two won
            playerOne.stats.losses++;
            playerTwo.stats.wins++;
            playerTwo.stats.points += 3;
            resultText = `${playerTwo.username || playerTwoId} won`;
        }
        
        logger.game(`Game recorded: ${resultText}, difficulty: ${difficulty}`);
        
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
        
        logger.debug(`Retrieved leaderboard: ${users.length} users, limit ${limit}, difficulty ${difficulty || 'all'}`);
        
        // Limit results
        return users.slice(0, limit);
    },

    // Get statistics for a specific user
    getUserStats(userId, options = {}) {
        const { difficulty = null } = options;
        
        if (!this.users[userId]) {
            logger.debug(`User ${userId} not found in leaderboard`);
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
        
        logger.debug(`Retrieved stats for user ${userId}: ${games.length} games, difficulty ${difficulty || 'all'}`);
        
        return {
            user,
            games,
            recentGames: games.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
        };
    }
};

// ==========================================
// 9. Game Logic - Bot Move
// ==========================================
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
        
        logger.game(`Game result recorded: ${result}, difficulty: ${game.difficulty}`);
    } catch (error) {
        logger.error('Error recording game result:', error);
    }
}

async function makeBotMove(userId, interaction) {
    const game = games[userId];
    let botMoveMessage = "";
    let moveType = "";
    
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
                moveType = "Random";
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
                    moveType = "Winning";
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
                        moveType = "Blocking";
                        break;
                    }
                }
                
                // Take center if available
                if (game.board[4] === null) {
                    game.board[4] = game.botSymbol;
                    moved = true;
                    botMoveMessage = "I claim the center of the field! Thy move, noble challenger.";
                    moveType = "Center";
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
                    moveType = "Random Fallback";
                }
            }
            break;
            
        case DIFFICULTY_LEVELS.HARD:
        default:
            // Hard: Original AI logic - try to win
            // Try to win first (reusing findWinningMove)
            const winningMove = findWinningMove(game.board, game.botSymbol);
            if (winningMove !== null) {
                game.board[winningMove] = game.botSymbol;
                botMoveMessage = "My strategy prevails! Behold my cunning move!";
                moved = true;
                moveType = "Winning";
                break;
            }
            
            // If bot can't win, try to block player
            const blockingMove = findWinningMove(game.board, game.playerSymbol);
            if (blockingMove !== null) {
                game.board[blockingMove] = game.botSymbol;
                botMoveMessage = "My knight doth block thy advance! What shall be thy next stratagem?";
                moved = true;
                moveType = "Blocking";
                break;
            }
            
            // Take center if available
            if (game.board[4] === null) {
                game.board[4] = game.botSymbol;
                moved = true;
                botMoveMessage = "I claim the center of the field! Thy move, noble challenger.";
                moveType = "Center";
                break;
            }
            
            // Take corners
            const corners = [0, 2, 6, 8];
            for (const corner of corners) {
                if (game.board[corner] === null) {
                    game.board[corner] = game.botSymbol;
                    moved = true;
                    botMoveMessage = "I shall fortify the corner! Proceed with thy countermove, good player.";
                    moveType = "Corner";
                    break;
                }
            }
            
            // Take any available space
            if (!moved) {
                for (let i = 0; i < 9; i++) {
                    if (game.board[i] === null) {
                        game.board[i] = game.botSymbol;
                        moved = true;
                        botMoveMessage = "I have placed my mark! What shall be thy response?";
                        moveType = "Any Available";
                        break;
                    }
                }
            }
            break;
    }
    
    logger.game(`Bot made a ${moveType} move for user ${userId} at difficulty ${game.difficulty}`);
    
    // Auto-save after bot's move
    saveGameState(userId);
    
    // Check if bot has won
    if (checkWinner(game.board, game.botSymbol)) {
        game.winner = game.botSymbol;
        game.gameOver = true;
        botMoveMessage = "Alas, thou hast been defeated! My strategy hath prevailed this day. Press 'New Game' for a chance to restore thy honor.";
        
        // Record the game result
        logger.game(`Bot won the game against user ${userId}`);
        await recordGameResult(userId, 'bot');
    } else if (checkDraw(game.board)) {
        game.gameOver = true;
        botMoveMessage = "Lo! A stalemate! Neither warrior could best the other. Press 'New Game' to break this impasse with another contest.";
        
        // Record the game as a draw
        logger.game(`Game ended in a draw with user ${userId}`);
        await recordGameResult(userId, 'draw');
    }
    
    // Bot's move complete, back to player if game isn't over
    if (!game.gameOver) {
        game.isPlayerTurn = true;
    }
    
    // Create updated board
    const embed = createBoardEmbed(userId, botMoveMessage);
    const components = createBoardComponents(userId);
    
    // Update the message
    try {
        await interaction.editReply({ embeds: [embed], components });
        logger.debug(`Updated game board after bot's move for user ${userId}`);
    } catch (error) {
        logger.error('Error updating message after bot move:', error);
    }
    
    return game;
}

// ==========================================
// 10. Command Definitions
// ==========================================
const commands = [
    new SlashCommandBuilder()
        .setName('start')
        .setDescription('Begin a new game of Tic-Tac-Toe'),
    
    new SlashCommandBuilder()
        .setName('difficulty')
        .setDescription('Change the difficulty level')
        .addStringOption(option => 
            option.setName('level')
                .setDescription('The difficulty level')
                .setRequired(true)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )
        ),
    
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the Tic-Tac-Toe leaderboard')
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('Number of players to show')
                .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('difficulty')
                .setDescription('Filter by difficulty')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )
        ),
    
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View player statistics')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to view stats for (defaults to you)')
                .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('difficulty')
                .setDescription('Filter by difficulty')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                )
        ),
        
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('View information about how to play')
];

// ==========================================
// 11. Command Handlers
// ==========================================
async function handleStartCommand(interaction) {
    const userId = interaction.user.id;
    
    logger.command(`/start command invoked by user ${userId} (${interaction.user.tag})`);
    
    // Initialize a new game
    initializeGame(userId);
    saveGameState(userId);
    
    // Create and send the game board
    const embed = createBoardEmbed(userId, "A new game begins! Make thy move by clicking on the board below.");
    const components = createBoardComponents(userId);
    
    await interaction.reply({ embeds: [embed], components });
    logger.success(`New game started for user ${userId}`);
}

async function handleDifficultyCommand(interaction) {
    const userId = interaction.user.id;
    const newDifficulty = interaction.options.getString('level');
    
    logger.command(`/difficulty command invoked by user ${userId} (${interaction.user.tag}), level: ${newDifficulty}`);
    
    // Load or initialize game
    if (!games[userId]) {
        loadGameState(userId);
    }
    
    // Set the difficulty
    const oldDifficulty = games[userId].difficulty;
    games[userId].difficulty = newDifficulty;
    saveGameState(userId);
    
    logger.game(`Difficulty changed for user ${userId}: ${oldDifficulty} -> ${newDifficulty}`);
    
    // Prepare response message
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
    
    // If there's an active game, update the board
    if (games[userId] && !games[userId].gameOver) {
        const embed = createBoardEmbed(userId, responseMessage);
        const components = createBoardComponents(userId);
        await interaction.reply({ embeds: [embed], components });
    } else {
        // Otherwise, just confirm the change
        await interaction.reply({ content: responseMessage });
    }
    
    logger.success(`Difficulty set to ${newDifficulty} for user ${userId}`);
}

async function handleLeaderboardCommand(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const difficulty = interaction.options.getString('difficulty');
    
    logger.command(`/leaderboard command invoked by user ${interaction.user.id} (${interaction.user.tag}), limit: ${limit}, difficulty: ${difficulty || 'all'}`);
    
    // Get leaderboard data
    const topUsers = leaderboard.getLeaderboard({ 
        limit, 
        gameType: 'tictactoe',
        difficulty: difficulty 
    });
    
    // Create and send the leaderboard embed
    const leaderboardEmbed = createLeaderboardEmbed(
        'Tic-Tac-Toe Hall of Fame', 
        topUsers,
        difficulty
    );
    
    await interaction.reply({ embeds: [leaderboardEmbed] });
    logger.success(`Sent leaderboard to user ${interaction.user.id}`);
}

async function handleStatsCommand(interaction) {
    // Get options
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const difficulty = interaction.options.getString('difficulty');
    
    logger.command(`/stats command invoked by user ${interaction.user.id} (${interaction.user.tag}), target: ${targetUser.id}, difficulty: ${difficulty || 'all'}`);
    
    // Get user stats
    const stats = leaderboard.getUserStats(targetUser.id, {
        difficulty: difficulty
    });
    
    // Create and send the stats embed
    const statsEmbed = createUserStatsEmbed(
        targetUser.id, 
        stats,
        difficulty
    );
    
    await interaction.reply({ embeds: [statsEmbed] });
    logger.success(`Sent stats for user ${targetUser.id} to user ${interaction.user.id}`);
}

async function handleHelpCommand(interaction) {
    logger.command(`/help command invoked by user ${interaction.user.id} (${interaction.user.tag})`);
    
    const helpEmbed = new EmbedBuilder()
        .setTitle('Ye Olde Tic-Tac-Toe Help')
        .setColor(0x00FFFF)
        .addFields(
            { 
                name: 'Game Commands', 
                value: '`/start` - Begin a new game\n' +
                      '`/difficulty` - Change game difficulty\n' +
                      '`/leaderboard` - View the hall of fame\n' +
                      '`/stats` - View battle statistics\n' +
                      '`/help` - Show this help message'
            },
            {
                name: 'How to Play',
                value: 'Click on the buttons to make your move. The board positions are as follows:\n```\n' +
                       '1 | 2 | 3\n' +
                       '---+---+---\n' +
                       '4 | 5 | 6\n' +
                       '---+---+---\n' +
                       '7 | 8 | 9\n```'
            },
            {
                name: 'Difficulty Levels',
                value: '**Easy**: A squire in training, who makes random moves.\n' +
                       '**Medium**: A knight of moderate skill, who sometimes makes mistakes.\n' +
                       '**Hard**: The royal champion, who plays with perfect strategy.'
            }
        );
    
    await interaction.reply({ embeds: [helpEmbed] });
    logger.success(`Sent help information to user ${interaction.user.id}`);
}

// ==========================================
// 12. Button Handlers
// ==========================================
async function handleMoveButton(interaction, position) {
    const userId = interaction.user.id;
    
    logger.event(`Move button clicked by user ${userId} at position ${position}`);
    
    // Load game state if it doesn't exist
    if (!games[userId]) {
        loadGameState(userId);
    }
    
    const game = games[userId];
    
    // Check if game is over
    if (game.gameOver) {
        await interaction.reply({ 
            content: "The battle is concluded! Press 'New Game' to begin anew.", 
            ephemeral: true 
        });
        logger.debug(`User ${userId} tried to move in a completed game`);
        return;
    }
    
    // Check if it's the player's turn
    if (!game.isPlayerTurn) {
        await interaction.reply({ 
            content: "Hold thy hand! 'Tis not thy turn to place a mark.", 
            ephemeral: true 
        });
        logger.debug(`User ${userId} tried to move out of turn`);
        return;
    }
    
    // Check if the position is already taken
    if (game.board[position] !== null) {
        await interaction.reply({ 
            content: "That square is already occupied! Choose another, good player.", 
            ephemeral: true 
        });
        logger.debug(`User ${userId} tried to move to an occupied position (${position})`);
        return;
    }
    
    // Make the player's move
    game.board[position] = game.playerSymbol;
    logger.game(`User ${userId} placed ${game.playerSymbol} at position ${position}`);
    
    // Save the game state
    saveGameState(userId);
    
    // Check if player has won
    if (checkWinner(game.board, game.playerSymbol)) {
        game.winner = game.playerSymbol;
        game.gameOver = true;
        saveGameState(userId);
        
        // Record the game in leaderboard
        logger.game(`User ${userId} won the game`);
        await recordGameResult(userId, 'player');
        
        // Display final board
        const embed = createBoardEmbed(userId, "Verily, thou hast emerged victorious! The kingdom shall sing songs of thy triumph.");
        const components = createBoardComponents(userId);
        await interaction.update({ embeds: [embed], components });
        return;
    }
    
    // Check for draw
    if (checkDraw(game.board)) {
        game.gameOver = true;
        saveGameState(userId);
        
        // Record the draw in leaderboard
        logger.game(`Game ended in a draw with user ${userId}`);
        await recordGameResult(userId, 'draw');
        
        // Display final board
        const embed = createBoardEmbed(userId, "Lo! A stalemate! Neither warrior could best the other.");
        const components = createBoardComponents(userId);
        await interaction.update({ embeds: [embed], components });
        return;
    }
    
    // Now it's bot's turn
    game.isPlayerTurn = false;
    
    // Display player's move first
    const playerMoveEmbed = createBoardEmbed(userId, "Thy move is made! Now I shall contemplate my strategy...");
    const playerMoveComponents = createBoardComponents(userId);
    await interaction.update({ embeds: [playerMoveEmbed], components: playerMoveComponents });
    
    // Wait a moment for "thinking" then make bot's move
    setTimeout(async () => {
        try {
            logger.debug(`Bot making move for user ${userId}`);
            await makeBotMove(userId, interaction);
        } catch (error) {
            logger.error('Error making bot move:', error);
        }
    }, 1500);
}

async function handleDifficultyButton(interaction, difficulty) {
    const userId = interaction.user.id;
    
    logger.event(`Difficulty button clicked by user ${userId}: ${difficulty}`);
    
    // Load or initialize game
    if (!games[userId]) {
        loadGameState(userId);
    }
    
    // Set the difficulty
    const oldDifficulty = games[userId].difficulty;
    games[userId].difficulty = difficulty;
    saveGameState(userId);
    
    logger.game(`Difficulty changed via button for user ${userId}: ${oldDifficulty} -> ${difficulty}`);
    
    // Prepare response message
    let responseMessage = '';
    switch (difficulty) {
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
    
    // Update the game board
    const embed = createBoardEmbed(userId, responseMessage);
    const components = createBoardComponents(userId);
    await interaction.update({ embeds: [embed], components });
    logger.success(`Updated game board with new difficulty: ${difficulty}`);
}

// ==========================================
// 13. Interaction Handler
// ==========================================
client.on('interactionCreate', async interaction => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;
            logger.event(`Slash command received: /${commandName} from ${interaction.user.tag}`);
            
            switch (commandName) {
                case 'start':
                    // Start a new game
                    await handleStartCommand(interaction);
                    break;
                    
                case 'difficulty':
                    // Change difficulty
                    await handleDifficultyCommand(interaction);
                    break;
                    
                case 'leaderboard':
                    // View leaderboard
                    await handleLeaderboardCommand(interaction);
                    break;
                    
                case 'stats':
                    // View stats
                    await handleStatsCommand(interaction);
                    break;
                    
                case 'help':
                    // Show help
                    await handleHelpCommand(interaction);
                    break;
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            const customId = interaction.customId;
            logger.event(`Button interaction received: ${customId} from ${interaction.user.tag}`);
            
            // Handle move buttons
            if (customId.startsWith('move_')) {
                const position = parseInt(customId.split('_')[1]);
                await handleMoveButton(interaction, position);
            }
            
            // Handle difficulty buttons
            else if (customId.startsWith('difficulty_')) {
                const difficulty = customId.split('_')[1];
                await handleDifficultyButton(interaction, difficulty);
            }
            
            // Handle reset/new game button
            else if (customId === 'reset_game') {
                logger.event(`New game button clicked by user ${interaction.user.id}`);
                await handleStartCommand(interaction);
            }
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        
        // Reply with error if not already replied
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: 'Forsooth! An error hath occurred in the royal game system!', 
                    components: [] 
                });
            } else {
                await interaction.reply({ 
                    content: 'Forsooth! An error hath occurred in the royal game system!', 
                    ephemeral: true 
                });
            }
        } catch (replyError) {
            logger.error('Error sending error message:', replyError);
        }
    }
});

// ==========================================
// 14. Command Registration
// ==========================================
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        logger.info('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        logger.success('Successfully registered application (/) commands.');
    } catch (error) {
        logger.error('Error registering commands:', error);
    }
})();

// ==========================================
// 15. Ready Event & Bot Login
// ==========================================

// Ready event
client.on('ready', async () => {
    logger.success(`Bot online as ${client.user.tag}`);
    
    // Ensure game states directory exists
    if (!fs.existsSync(GAME_DIR)) {
        fs.mkdirSync(GAME_DIR, { recursive: true });
        logger.info(`Created game states directory: ${GAME_DIR}`);
    }
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        logger.info(`Created data directory: ${DATA_DIR}`);
    }
    
    // Initialize leaderboard
    leaderboard.init();
    logger.info('Leaderboard system initialized');
    
    // Log server count
    logger.info(`Bot is in ${client.guilds.cache.size} servers`);
    
    // Set bot status with proper activity type for Discord.js v14+
    client.user.setPresence({
        activities: [{ name: '/start to play', type: ActivityType.Playing }],
        status: 'online'
    });
    logger.info('Bot status set to: Playing /start to play');
    
    logger.success('Ye Olde Tic-Tac-Toe Bot is ready for battle!');
});

// Login to Discord with token
client.login(DISCORD_TOKEN).then(() => {
    logger.info('Bot is logging in...');
}).catch(error => {
    logger.error('Failed to login:', error);
});