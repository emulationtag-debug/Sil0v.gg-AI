Quick Start Guide - Sil0v AI Ultra

🚀 Get Started in 5 Minutes

Step 1: Get Your Tokens

Discord Bot Token:

- Go to https://discord.com/developers/applications

- Create a new application

- Go to "Bot" section

- Create a bot and copy the token

Enable Required Intents:

- Message Content Intent

- Server Members Intent

- Presence Intent

Google Gemini API Key:

- Go to https://aistudio.google.com/app/apikey

- Create a new API key

- Copy the key

Step 2: Install Dependencies

npm install

This will install:

- discord.js (^14.14.1)

- @google/generative-ai (^0.15.0)

Step 3: Configure Environment

- Copy .env.example to .env:

cp .env.example .env

- Edit .env and add your tokens:

DISCORD_TOKEN=your_actual_discord_token_here
GEMINI_API_KEY=your_actual_gemini_api_key_here

Step 4: Invite Bot to Server

- Go back to Discord Developer Portal

- Go to OAuth2 > URL Generator

- Select scopes:

- bot

- applications.commands

- Select bot permissions:

- Administrator (or select specific permissions)

- Generate URL and invite bot to your server

Step 5: Start the Bot

npm start

Or:

node index.js

You should see:

✅ Sil0v AI Ultra v4.2.0 is online!
Logged in as YourBot#1234
📝 Registering slash commands...
✅ Successfully registered 61 commands!

Step 6: Initial Setup

- In your Discord server, run:

/setup

- Configure channels (requires Administrator permission):

/config ai_channel #general
/config welcome_channel #welcome
/config log_channel #mod-logs
/config ticket_channel #support
/config starboard_channel #starboard

Step 7: Test Your Bot

Test AI (in AI channel or via command):

/ai prompt: Hello, how are you?

Test fun commands:

/8ball question: Will I have a good day?
/roll
/meme

Test economy:

/balance
/daily
/coinflip amount: 10

Test moderation:

/ban user: @baduser reason: Spamming
/clear amount: 10

🎯 Common Commands

For General Users

- /help - See all commands

- /balance - Check your coins

- /level - Check your level

- /daily - Claim daily coins

- /8ball, /roll, /meme - Fun games

For Moderators

- /ban, /kick, /mute - Moderation

- /clear - Clean up messages

- /warn - Warn users

- /audit - View logs

For AI & Coding

- /ai - Ask AI questions

- /code - Generate code

- /visualize - Create 3D visualizations

- /debug - Debug code

For Admins

- /config - Configure channels

- /setup - Setup wizard

- /announce - Make announcements

- /stats - View bot stats

🐛 Troubleshooting

Bot won't start

- ✅ Check .env file exists

- ✅ Verify tokens are correct (no extra spaces)

- ✅ Node.js version 18 or higher

Commands don't appear

- ✅ Wait 10-30 seconds after bot starts

- ✅ Check bot has applications.commands scope

- ✅ Try restarting the bot

AI not working

- ✅ Verify GEMINI_API_KEY is valid

- ✅ Check internet connection

- ✅ Check console for error messages

Permission errors

- ✅ Check bot has required permissions

- ✅ Run commands as administrator if needed

- ✅ Verify role hierarchy

📞 Getting Help

Check logs: Look at the console output for error messages

Test basic commands:

- /ping - Should show latency

Check data file:

- bot_data.json contains saved configurations

🎨 Customization

Edit the CONFIG object in index.js:

const CONFIG = {
    BOT_NAME: "Your Custom Name",
    BOT_VERSION: "1.0.0",
    CREATOR: "Your Name",
    // ... many more options
};

🔒 Security Tips

- ✅ Never share your tokens

- ✅ Keep .env file private

- ✅ Use strong randomness for sensitive data

- ✅ Regularly review bot permissions

- ✅ Backup bot_data.json periodically

📚 Next Steps

- Read the full README.md - Detailed documentation

- Explore all 61 commands - Try them out!

- Configure your server - Set up channels and features

- Monitor activity - Use /stats and /audit

- Expand functionality - Add your own commands

💡 Tips

- Use /help [category] to filter commands by type

- All data auto-saves every 60 seconds

- Commands have cooldowns to prevent spam

- Level up by chatting in the server

- Earn coins with /daily and by playing games

Enjoy your bot! 🎉
