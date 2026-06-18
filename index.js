const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration (Ensure these are set in Railway Variables)
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Add this to Railway Variables!
const GUILD_ID = process.env.GUILD_ID;   // Add this to Railway Variables!
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
    systemInstruction: `You are ${BOT_NAME}, a professional, minimalist, and efficient AI assistant.`
});

// 1. Define your commands
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with Sil0v.gg AI commands'),
];

// 2. Register commands with Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands.map(command => command.toJSON()) },
        );
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }
})();

// 3. Handle Command Interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'help') {
        await interaction.reply('I am Sil0v.gg AI. I respond to messages in the active channel!');
    }
});

// 4. Existing Message Logic
let activeChannelId = null;

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setchannel') {
        activeChannelId = message.channel.id;
        return message.reply(`✅ ${BOT_NAME} is now active in this channel!`);
    }

    if (activeChannelId && message.channel.id === activeChannelId) {
        await message.channel.sendTyping();
        const result = await model.generateContent(message.content);
        await message.reply(result.response.text());
    }
});

client.once(Events.ClientReady, (c) => console.log(`✅ Logged in as ${c.user.tag}!`));
client.login(TOKEN);
