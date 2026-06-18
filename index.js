const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
// Use gemini-2.5-flash for stable production performance
const SELECTED_MODEL = "gemini-2.5-flash"; 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let model = genAI.getGenerativeModel({ model: SELECTED_MODEL });

let activeChannelId = null;
let lastError = "No errors reported yet.";

// --- RETRY LOGIC (Exponential Backoff) ---
async function generateContentWithRetry(prompt, retries = 5, delay = 2000) {
    try {
        return await model.generateContent(prompt);
    } catch (e) {
        // Retry on 503 Service Unavailable or network issues
        if ((e.message.includes("503") || e.message.includes("fetch")) && retries > 0) {
            console.warn(`⚠️ API Issue (503/Fetch). Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, delay + Math.random() * 1000));
            return await generateContentWithRetry(prompt, retries - 1, delay * 2);
        }
        throw e;
    }
}

// --- SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('config').setDescription('Set AI channel')
        .addChannelOption(o => o.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('status').setDescription('Check if Gemini AI API is online'),
    new SlashCommandBuilder().setName('detail').setDescription('Admin only: Get detailed error logs')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log('✅ Commands registered.');
    } catch (e) { console.error('❌ Reg Error:', e); }
})();

// --- HANDLERS ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        activeChannelId = interaction.options.getChannel('channel').id;
        await interaction.reply(`✅ AI active in <#${activeChannelId}> using **${SELECTED_MODEL}**`);
    } else if (interaction.commandName === 'status') {
        await interaction.deferReply();
        try {
            await model.generateContent("ping");
            await interaction.editReply(`🟢 **${SELECTED_MODEL} is ONLINE.**`);
        } catch (e) {
            lastError = e.stack;
            await interaction.editReply(`🔴 **${SELECTED_MODEL} is UNREACHABLE.**`);
        }
    } else if (interaction.commandName === 'detail') {
        await interaction.reply({ content: `\`\`\`${lastError.substring(0, 1900)}\`\`\``, ephemeral: true });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;
    await message.channel.sendTyping();
    try {
        const result = await generateContentWithRetry(message.content);
        await message.reply(result.response.text());
    } catch (e) {
        lastError = e.stack;
        console.error('--- GEMINI API ERROR ---', e);
        await message.reply("❌ API Error. Check `/detail` (Admins only) for logs.");
    }
});

client.login(process.env.DISCORD_TOKEN);
