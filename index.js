const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Setup
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
    systemInstruction: "You are Sil0v.gg AI, a professional and efficient assistant."
});

let activeChannelId = null;

// 2. Register Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Set the AI channel')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The text channel to activate')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check if AI is online')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Commands registered.');
    } catch (e) { console.error('❌ Command Registration Error:', e); }
})();

// 3. Command & Message Handlers
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        activeChannelId = interaction.options.getChannel('channel').id;
        await interaction.reply(`✅ AI active in <#${activeChannelId}>`);
    } else if (interaction.commandName === 'status') {
        await interaction.reply(`🤖 AI is **ONLINE**.`);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;

    await message.channel.sendTyping();

    try {
        const result = await model.generateContent(message.content);
        const text = result.response.text();
        await message.reply(text);
    } catch (e) {
        // DETAILED ERROR LOGGING
        console.error('--- GEMINI API ERROR ---');
        console.error('Name:', e.name);
        console.error('Message:', e.message);
        console.error('Stack Trace:', e.stack); // This tells you exactly where it failed
        
        // Respond to user with a generic message, but log the real one
        await message.reply("❌ I'm having trouble connecting to the AI. Check the console logs for details.");
    }
});

client.once(Events.ClientReady, (c) => console.log(`✅ Logged in as ${c.user.tag}!`));
client.login(process.env.DISCORD_TOKEN);
