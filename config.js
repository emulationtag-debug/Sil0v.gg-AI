// config.js
require('dotenv').config();

module.exports = {
    bot: {
        name: "Sil0v AI",
        creator: "Sil0v/N0V",
        model: "gemini-2.5-flash",
    },
    system: {
        // Any specific limits or thresholds go here
        maxRetryAttempts: 5,
        retryDelay: 2000,
        tempDir: './temp'
    },
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID
    }
};
