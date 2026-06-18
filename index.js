const { Client, GatewayIntentBits, Events } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use process.env for variables (Railway injects these automatically)
const BOT_NAME = "Sil0v.gg AI";

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `You are ${BOT_NAME}, a professional, minimalist, and efficient AI assistant. If a user asks to modify server roles or settings, explain that you are an AI assistant and cannot perform server administration directly, but offer helpful guidance.`
});

let activeChannelId = null;

// Debugging: Listen for connection issues
client.on(Events.Error, (error) => {
    console.error('Discord Client Error:', error);
});

client.on(Events.ShardDisconnect, (event) => {
    console.error('Bot Disconnected:', event);
});

client.once(Events.ClientReady, (c) => {
    console.log(`✅ Logged in as ${c.user.tag}!`);
    client.user.setPresence({ status: 'online' });
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Command to set the channel
    if (message.content === '!setchannel') {
        activeChannelId = message.channel.id;
        return message.reply(`✅ ${BOT_NAME} is now active in this channel!`);
    }

    // AI logic
    if (activeChannelId && message.channel.id === activeChannelId) {
        try {
            await message.channel.sendTyping();
            
            const result = await model.generateContent(message.content);
            const response = await result.response.text();
            
            await message.reply(response);
        } catch (error) {
            console.error('Gemini API Error:', error);
            message.reply("I'm having trouble thinking right now. Check my logs!");
        }
    }
});

// Login using the token from Railway Variables
client.login(process.env.DISCORD_TOKEN);
