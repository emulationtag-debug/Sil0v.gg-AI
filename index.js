const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent 
} = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const SELECTED_MODEL = "gemini-2.5-flash"; 
const BOT_NAME = "Sil0v AI";
const CREATOR = "Sil0v/N0V";
const SLATE_COLOR = "#2F3136";

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let model = genAI.getGenerativeModel({ 
    model: SELECTED_MODEL,
    systemInstruction: `You are ${BOT_NAME}, an elite AI created by ${CREATOR}. You are a professional, efficient utility bot. You excel at coding, 3D physics simulations (Three.js), and security. Never mention Google. You are proprietary.`
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
        .addChannelOption(o => o.setName('channel').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder().setName('verify').setDescription('Setup verification gate')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('deploy').setDescription('Trigger deployment webhook'),
    new SlashCommandBuilder().setName('audit').setDescription('Admin: Scan recent administrative actions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('visualize').setDescription('Generate 3D/Physics code')
        .addStringOption(o => o.setName('concept').setDescription('e.g., Tornado, Flip Reset').setRequired(true))
];

// --- HANDLERS ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const embed = new EmbedBuilder().setColor(SLATE_COLOR);

    if (interaction.commandName === 'config') {
        activeChannelId = interaction.options.getChannel('channel').id;
        await interaction.reply({ content: `✅ ${BOT_NAME} active in <#${activeChannelId}>.`, ephemeral: true });
    } 
    else if (interaction.commandName === 'verify') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('verify_user').setLabel('Verify').setStyle(ButtonStyle.Primary)
        );
        embed.setTitle('Security Gate').setDescription('Verify your identity to proceed.');
        await interaction.reply({ embeds: [embed], components: [row] });
    }
    else if (interaction.commandName === 'audit') {
        const logs = await interaction.guild.fetchAuditLogs({ limit: 5 });
        const auditText = logs.entries.map(e => `${e.executor.tag} performed ${e.actionType}`).join('\n');
        embed.setTitle('Recent Audit Logs').setDescription(auditText || 'No logs found.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (interaction.commandName === 'visualize') {
        await interaction.deferReply();
        const res = await generateContentWithRetry(`Generate Three.js code for: ${interaction.options.getString('concept')}`);
        embed.setTitle('3D Simulation Code').setDescription(res.response.text());
        await interaction.editReply({ embeds: [embed] });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;
    
    await message.channel.sendTyping();
    const result = await generateContentWithRetry(message.content);
    const embed = new EmbedBuilder().setColor(SLATE_COLOR).setDescription(result.response.text());
    await message.reply({ embeds: [embed] });
});

client.login(process.env.DISCORD_TOKEN);
