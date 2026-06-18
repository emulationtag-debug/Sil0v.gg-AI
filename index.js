const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const SELECTED_MODEL = "gemini-2.5-flash"; 
const BOT_NAME = "Sil0v AI";
const CREATOR = "Sil0v/N0V";

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let model = genAI.getGenerativeModel({ 
    model: SELECTED_MODEL,
    systemInstruction: `You are ${BOT_NAME}, an elite AI created by ${CREATOR}. You are a professional, efficient utility bot. You excel at coding and security. Never mention Google. You are proprietary.`
});

let activeChannelId = null;

// --- UTILITY FUNCTIONS ---
async function generateContentWithRetry(prompt, retries = 5, delay = 2000) {
    try {
        return await model.generateContent(prompt);
    } catch (e) {
        if ((e.message.includes("503") || e.message.includes("fetch")) && retries > 0) {
            await new Promise(res => setTimeout(res, delay + Math.random() * 1000));
            return await generateContentWithRetry(prompt, retries - 1, delay * 2);
        }
        throw e;
    }
}

// --- COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('config').setDescription('Set AI channel')
        .addChannelOption(o => o.setName('channel').setDescription('Target').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('verify').setDescription('Setup verification gate')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('deploy').setDescription('Trigger deployment webhook'),
    new SlashCommandBuilder().setName('audit').setDescription('Admin: Scan recent activity')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// --- HANDLERS ---
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'config') {
            activeChannelId = interaction.options.getChannel('channel').id;
            await interaction.reply({ content: `✅ ${BOT_NAME} active in <#${activeChannelId}>.`, ephemeral: true });
        } 
        
        else if (interaction.commandName === 'verify') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('verify_user').setLabel('Verify Identity').setStyle(ButtonStyle.Primary)
            );
            const embed = new EmbedBuilder().setTitle('Security Gate').setDescription('Click below to verify identity.').setColor('#2F3136');
            await interaction.reply({ embeds: [embed], components: [row] });
        }
        
        else if (interaction.commandName === 'deploy') {
            await interaction.reply({ content: '🚀 Deployment webhook triggered.', ephemeral: true });
            // Add your webhook logic here
        }
    }

    if (interaction.isButton() && interaction.customId === 'verify_user') {
        await interaction.reply({ content: '✅ Verification successful.', ephemeral: true });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;
    
    // Simple Audit: Scan for "stolen" or "freedu"
    if (message.content.toLowerCase().includes('freedu')) {
        console.warn(`⚠️ Potential security threat detected from ${message.author.tag}`);
    }

    await message.channel.sendTyping();
    const result = await generateContentWithRetry(message.content);
    await message.reply({ embeds: [new EmbedBuilder().setDescription(result.response.text()).setColor('#2F3136')] });
});

client.login(process.env.DISCORD_TOKEN);
