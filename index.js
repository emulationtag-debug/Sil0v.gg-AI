const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Setup
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Using the updated 3.5 Flash model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-3.5-flash", 
    systemInstruction: "You are Sil0v.gg AI, a professional, minimalist, and efficient assistant." 
});

let activeChannelId = null;
let lastError = "No errors reported yet.";

// 2. Register Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Set the AI channel')
        .addChannelOption(o => o.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check if Gemini AI API is online'),
    new SlashCommandBuilder()
        .setName('detail')
        .setDescription('Admin only: Get detailed error logs')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Commands registered.');
    } catch (e) { console.error('❌ Command Reg Error:', e); }
})();

// 3. Handlers
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        activeChannelId = interaction.options.getChannel('channel').id;
        await interaction.reply(`✅ Sil0v.gg AI active in <#${activeChannelId}>`);
    } 
    else if (interaction.commandName === 'status') {
        await interaction.deferReply();
        try {
            await model.generateContent("ping");
            await interaction.editReply("🟢 **Gemini 3.5 Flash is ONLINE and responsive.**");
        } catch (e) {
            lastError = e.stack;
            await interaction.editReply("🔴 **Gemini AI API is currently UNREACHABLE.**");
        }
    } 
    else if (interaction.commandName === 'detail') {
        await interaction.reply({ content: `\`\`\`${lastError}\`\`\``, ephemeral: true });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;

    await message.channel.sendTyping();
    try {
        const result = await model.generateContent(message.content);
        await message.reply(result.response.text());
    } catch (e) {
        lastError = e.stack;
        console.error('--- GEMINI API ERROR ---', e);
        await message.reply("❌ API Error. Admins can use `/detail` to see the error.");
    }
});

client.once(Events.ClientReady, (c) => console.log(`✅ Logged in as ${c.user.tag}!`));
client.login(process.env.DISCORD_TOKEN);
