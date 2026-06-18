Sil0v AI Ultra - Advanced Discord Bot

A fully-featured, production-ready Discord bot with AI integration, moderation tools, economy system, and much more.

🚀 Features

AI & Development Tools (11 Commands)

- /ai - Ask the AI assistant

- /code - Generate code in any language

- /visualize - Generate Three.js 3D visualization code

- /debug - Debug and analyze code

- /explain - Get detailed code explanation

- /optimize - Optimize code for performance

- /convert - Convert code between languages

- /security - Analyze code for security vulnerabilities

- /review - Get comprehensive code review

- /document - Generate documentation for code

- /test - Generate unit tests for code

Moderation Tools (10 Commands)

- /ban - Ban a user from the server

- /kick - Kick a user from the server

- /mute - Mute a user with optional timeout

- /unmute - Unmute a user

- /warn - Warn a user

- /clear - Clear messages from a channel

- /slowmode - Set slowmode for a channel

- /lock - Lock a channel

- /unlock - Unlock a channel

- /audit - View recent audit logs

- /nickname - Moderate user nicknames

Utility Commands (12 Commands)

- /help - Get help and command list

- /userinfo - Get information about a user

- /serverinfo - Get information about the server

- /avatar - Get a user's avatar

- /ping - Check bot latency

- /stats - View bot statistics

- /roleinfo - Get information about a role

- /channelinfo - Get information about a channel

- /emoji - Get an enlarged emoji

- /invite - Get the bot invite link

- /calculate - Perform mathematical calculations

- /whois - Get detailed user information

- /announce - Send an announcement

Economy System (9 Commands)

- /balance - Check your coin balance

- /daily - Claim daily reward

- /give - Give coins to another user

- /gamble - Gamble your coins

- /leaderboard - View economy leaderboard

- /coinflip - Flip a coin to win or lose

- /dice - Roll dice to win or lose

- /slots - Play the slot machine

- /rob - Attempt to rob another user

Fun Commands (11 Commands)

- /8ball - Ask the magic 8-ball

- /roll - Roll a dice

- /choices - Pick from multiple choices

- /rate - Rate something

- /love - Calculate love percentage

- /meme - Get a random meme

- /joke - Tell a random joke

- /fact - Get a random fact

- /quote - Get an inspirational quote

- /rps - Play rock paper scissors

- /trivia - Answer a trivia question

System Commands (4 Commands)

- /level - Check your level and XP

- /ticket - Create a support ticket

- /poll - Create a poll

- /verify - Verify yourself

Configuration (3 Commands)

- /config - Configure bot settings (channels, etc.)

- /setup - Initial bot setup wizard

- /help - Command list and help

📊 Statistics

- Total Lines of Code: 3,186+ lines

- Total Commands: 61 commands

- Categories: 7 categories

- Features:

- AI Integration with Google Generative AI

- Persistent data storage (JSON)

- Leveling system with XP

- Economy system with coins

- Cooldown management

- Rate limiting

- Auto-save every 60 seconds

- Comprehensive error handling

🔧 Installation

Prerequisites

- Node.js 18+

- Discord Bot Token

- Google Gemini API Key

Setup

- Clone or download the repository

-
Install dependencies:

npm init -y
npm install discord.js @google/generative-ai

-
Create .env file:

DISCORD_TOKEN=your_discord_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here

-
Start the bot:

node index.js

📝 Configuration

Using /config Command

The bot administrator must set up channels before features work:

/config ai_channel <channel>      # Set the AI channel for responses
/config welcome_channel <channel> # Set the welcome channel
/config log_channel <channel>     # Set the moderation log channel
/config ticket_channel <channel>  # Set the ticket channel
/config starboard_channel <channel> # Set the starboard channel

Using /setup

Run /setup for an interactive setup wizard.

🎮 Usage Examples

AI Commands

Ask a question:

/ai prompt: How do I create a REST API in Node.js?

Generate code:

/code language: Python description: Create a web scraper

Generate 3D visualization:

/visualize concept: Solar system with planets

Moderation

Ban a user:

/ban user: @user reason: Breaking rules

Clear messages:

/clear amount: 50

Economy

Check balance:

/balance

Claim daily reward:

/daily

Play slots:

/slots amount: 100

Fun

Ask the 8-ball:

/8ball question: Will I write good code today?

Rate something:

/rate thing: This bot

🏗️ Architecture

Core Classes

- AIManager - Handles AI generation with retry logic

- UserManager - Manages user data, XP, balance

- GuildManager - Manages server configurations

- CooldownManager - Command cooldown tracking

- RateLimitManager - Rate limiting for protection

- CommandRegistry - Centralized command management

- EmbedBuilderHelper - Consistent embed creation

Data Storage

All data is persisted to bot_data.json:

- Guild configurations

- User statistics

- Active channel mappings

- Economy data

Auto-saves every 60 seconds and on shutdown.

⚡ Performance

- Efficient in-memory storage with JSON persistence

- Cooldown system to prevent spam

- Rate limiting for API protection

- Exponential backoff for AI retries

- Automatic cleanup of old data

🔒 Security

- Permission checks for all commands

- Rate limiting abuse prevention

- Input validation and sanitization

- Error handling without exposing sensitive data

- Cooldown system to prevent command spam

🎨 Customization

Edit the CONFIG object at the top of index.js:

const CONFIG = {
    BOT_NAME: "Your Bot Name",
    BOT_VERSION: "1.0.0",
    CREATOR: "Your Name",
    // More options...
};

📚 Bot Commands Reference

Setup & Config

- /config - Configure bot channels and settings

- /setup - Run setup wizard

- /help - Get command list and help

AI & Development

- /ai - Interact with AI assistant

- /code - Generate code in any language

- /visualize - Generate Three.js visualizations

- /debug - Debug and analyze code

- /explain - Get code explanations

- /optimize - Optimize code

- /convert - Convert between languages

- /security - Security analysis

- /review - Code review

- /document - Generate documentation

- /test - Generate unit tests

Moderation

- /ban - Ban users

- /kick - Kick users

- /mute - Mute users

- /unmute - Unmute users

- /warn - Warn users

- /clear - Clear messages

- /slowmode - Set slowmode

- /lock - Lock channels

- /unlock - Unlock channels

- /audit - View audit logs

- /nickname - Manage nicknames

Utility

- /userinfo - User information

- /serverinfo - Server information

- /avatar - Get avatar

- /ping - Check latency

- /stats - Bot statistics

- /roleinfo - Role information

- /channelinfo - Channel information

- /emoji - Enlarge emoji

- /invite - Bot invite link

- /calculate - Mathematical calculations

- /whois - Detailed user info

- /announce - Send announcements

Economy

- /balance - Check balance

- /daily - Claim daily reward

- /give - Give coins

- /gamble - Gamble coins

- /leaderboard - View leaderboard

- /coinflip - Play coin flip

- /dice - Roll dice

- /slots - Play slots

- /rob - Attempt robbery

Fun

- /8ball - Magic 8-ball

- /roll - Roll dice

- /choices - Random choice

- /rate - Rate something

- /love - Love calculator

- /meme - Random meme

- /joke - Random joke

- /fact - Random fact

- /quote - Inspirational quote

- /rps - Rock paper scissors

- /trivia - Trivia game

Systems

- /level - Check level

- /ticket - Create ticket

- /poll - Create poll

- /verify - Verify user

🐛 Troubleshooting

Common Issues

Bot not responding:

- Check if DISCORD_TOKEN is set correctly

- Ensure bot has proper intents enabled in Discord Developer Portal

- Check console for error messages

AI not working:

- Verify GEMINI_API_KEY is valid

- Check if API key has correct permissions

- Ensure network connectivity

Commands not registering:

- Wait for Ready event to complete

- Check bot has applications.commands scope

- Try restarting bot

📄 License

This bot is proprietary software developed by Sil0v/N0V.

👤 Credits

Created by Sil0v/N0V

Version: 4.2.0
Last Updated: 2024
Discord.js: v14+
Node.js: 18+
