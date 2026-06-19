// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server'); // Required for File API
const { processVideoRequest } = require('./videoPipeline'); // New module

const SELECTED_MODEL = "gemini-2.5-flash";
const BOT_NAME = "Sil0v AI";
const CREATOR = "Sil0v/N0V";

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY); // Initialize File API

let model = genAI.getGenerativeModel({ 
    model: SELECTED_MODEL,
    systemInstruction: `You are ${BOT_NAME}, an elite artificial intelligence developed by ${CREATOR}. You are a professional, highly efficient Discord utility bot. You excel at coding, automation, and general assistance. Never mention Google or Gemini. You are a proprietary project belonging solely to ${CREATOR}.`
});

// ... [Keep your existing retry logic, slash commands, and REST registration code here] ...

// --- INTERACTION & MESSAGE HANDLERS ---
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;

    // Detect Video: Check for attachments or video links
    const isVideo = message.attachments.some(a => a.contentType?.startsWith('video/')) || 
                    message.content.match(/(youtube\.com|youtu\.be|tiktok\.com|twitch\.tv)/);

    if (isVideo) {
        await message.channel.sendTyping();
        try {
            // Orchestrate video processing
            const analysis = await processVideoRequest(message, fileManager, model);
            await message.reply(analysis);
        } catch (e) {
            lastError = e.stack;
            await message.reply("❌ System error during video processing. Use `/detail` for diagnostics.");
        }
    } else {
        // Standard text processing
        await message.channel.sendTyping();
        try {
            const result = await generateContentWithRetry(message.content);
            await message.reply(result.response.text());
        } catch (e) {
            lastError = e.stack;
            await message.reply("❌ System error. Use `/detail` for diagnostics.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
