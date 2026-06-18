const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- 1. Client Setup with CRITICAL Intents ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,           // Required for Slash Commands
        GatewayIntentBits.GuildMessages,    // Required to receive messages
        GatewayIntentBits.MessageContent    // REQUIRED to read message text
    ] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "You are Sil0v.gg AI. Keep responses professional, minimalist, and efficient."
});

let activeChannelId = process.env.ACTIVE_CHANNEL_ID || null; // Optional: Persist via env if needed

// --- 2. Register Commands ---
const commands = [
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Set the channel for Sil0v.gg AI')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel to activate the AI in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check if Sil0v.gg AI is online')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Slash commands registered.');
    } catch (error) { console.error('Command Registration Error:', error); }
})();

// --- 3. Event Handling ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        const channel = interaction.options.getChannel('channel');
        activeChannelId = channel.id;
        await interaction.reply(`✅ Sil0v.gg AI is now active in <#${activeChannelId}>`);
    } else if (interaction.commandName === 'status') {
        await interaction.reply(`🤖 Sil0v.gg AI is **ONLINE**.`);
    }
});

client.on(Events.MessageCreate, async (message) => {
    // DEBUG: This will show up in Railway logs if it receives a message
    console.log(`[DEBUG] Received message in ${message.channel.id}: ${message.content}`);

    if (message.author.bot) return;
    if (activeChannelId !== message.channel.id) return;

    await message.channel.sendTyping();
    try {
        const result = await model.generateContent(message.content);
        await message.reply(result.response.text());
    } catch (e) {
        console.error('Gemini API Error:', e);
        message.reply("❌ Error: I could not process that request.");
    }
});

client.once(Events.ClientReady, (c) => console.log(`✅ Bot ready as ${c.user.tag}!`));
client.login(process.env.DISCORD_TOKEN);
