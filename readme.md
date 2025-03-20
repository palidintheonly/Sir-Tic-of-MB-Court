# 🏰 Ye Olde Tic-Tac-Toe Discord Bot 🏰

A Discord.js v14+ compatible Tic-Tac-Toe bot with medieval-themed messaging, interactive buttons, difficulty levels, and a leaderboard system.

> *"In days of olde, when knights were bold, and tic-tac-toe not yet invented, the peasants played with sticks and stones... now thou can simply use buttons!"*

## ✨ Features

- **⚔️ Slash Commands**: Modern Discord interaction system (faster than a messenger on horseback!)
- **🔘 Interactive Button Interface**: Play directly with clickable buttons (no quill required)
- **🛡️ Multiple Difficulty Levels**:
  - **👶 Easy**: Bot makes random moves (like a jester who's had too much mead)
  - **🧙 Medium**: Bot sometimes makes strategic moves but still makes mistakes (a squire in training)
  - **👑 Hard**: Bot plays optimally with perfect strategy (as cunning as Merlin himself!)
- **📜 Persistent Leaderboard System**: Tracks wins, losses, draws, and points (ye royal records shall endure!)
- **📊 Game Statistics**: View individual player stats and match history (more detailed than the King's royal census)
- **🌈 Chrome DevTools-style Console Logging**: Color-coded logs for easy debugging (brighter than stained glass windows)
- **💾 Persistent Game State**: Games can be saved and resumed (not even a dragon attack will lose thy progress)

> *"Why did the medieval Discord bot refuse to move? It was knight time!"*

## 📋 Requirements

- Node.js v16.9.0 or newer
- Discord.js v14+
- Discord Bot Token
- `APPLICATION.COMMANDS` scope enabled for the bot

## 📦 Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/tic-tac-toe-discord-bot.git
cd tic-tac-toe-discord-bot
```

2. Install dependencies:
```bash
npm install discord.js@latest
```

3. Create required directories:
```bash
mkdir -p game_states data
```

4. Configure your bot token:
   - Open the bot.js file and replace `DISCORD_TOKEN` and `CLIENT_ID` with your own

5. Run the bot:
```bash
node bot.js
```

> *"How doth a medieval programmer debug? With a dragon, of course - it reads the code and breathes fire at the errors!"*

## 📜 Commands

- `/start` - Begin a new game of Tic-Tac-Toe (sound the trumpets!)
- `/difficulty [easy|medium|hard]` - Change the bot's difficulty level (choose thy worthy adversary)
- `/leaderboard [limit] [difficulty]` - View the top players (the royal court of champions)
- `/stats [user] [difficulty]` - View statistics for a player (check thy battle records)
- `/help` - Show game instructions and available commands (consult the wizard's tome)

## ⚔️ Gameplay

1. Use `/start` to begin a new game (raise thy banner!)
2. Click on the numbered buttons (1-9) to place thy mark (plant thy standard!)
3. The bot will respond with its move (the enemy advances!)
4. Change difficulty at any time using the buttons below the game board (summon allies or foes!)
5. Start a new game with the "New Game" button (a new quest begins!)

> *"What doth a medieval Discord user call a drawn game of Tic-Tac-Toe? A royal stalemate!"*

## 🏆 Leaderboard System

The bot tracks:
- Total games played (thy campaigns)
- Wins, losses, and draws (thy victories and defeats)
- Points (3 for a win, 1 for a draw) (gold coins for thy treasury)
- Win rate percentage (thy prowess in battle)

All data is saved to JSON files in the `data` directory (secured in the royal vault).

## 🌈 Console Logging

The bot implements Chrome DevTools-style colored console logging:
- 🔴 Red - Errors (dragon fire!)
- 🟡 Yellow - Warnings (the jester's bells)
- 🔵 Blue - Information (royal decrees)
- 🟢 Green - Success messages (victorious fanfare)
- ⚪ Gray - Debug information (the scribe's notes)
- 🟣 Magenta - Game events (tournament happenings)
- 🧿 Cyan - Discord events (messages from distant lands)

> *"How many medieval programmers does it take to change a torch? None - that's the castle staff's job!"*

## 📁 Project Structure

- `bot.js` - Main bot code (the grand castle)
- `game_states/` - Saved game state files (the royal archives)
- `data/` - Leaderboard and user stats (the kingdom's records)

## 📝 License

[MIT License](LICENSE) (decreed by the royal court)

> *"Remember, in medieval tic-tac-toe, 'X' marks the dragon's lair!"*