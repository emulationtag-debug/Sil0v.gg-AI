const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

xport const botConfig = {
  presence: {
    status: "online",
    activities: [
      {
        name: "Made with ❤️ - N0V",
        type: 0, 
      },

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: "You are Sil0v.gg AI, a professional, minimalist, and efficient AI assistant."
});

let activeChannelId = null;

// Register Commands
const commands = [
    new SlashCommandBuilder()
        .setName('config')
        .setDescription('Set the channel for Sil0v.gg AI')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to set the AI in')
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
        console.log('Successfully registered slash commands.');
    } catch (error) { console.error(error); }
})();

// Command Handler
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        const channel = interaction.options.getChannel('channel');
        activeChannelId = channel.id;
        await interaction.reply(`✅ Sil0v.gg AI is now active in <#${activeChannelId}>`);
    } else if (interaction.commandName === 'status') {
        await interaction.reply(`🤖 Sil0v.gg AI is currently **ONLINE** and ready.`);
    }
});

// AI Response Logic
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channel.id !== activeChannelId) return;

    await message.channel.sendTyping();
    try {
        const result = await model.generateContent(message.content);
        await message.reply(result.response.text());
    } catch (e) {
        console.error(e);
        message.reply("I'm currently having trouble processing requests.");
    }
});

client.once(Events.ClientReady, (c) => console.log(`✅ Logged in as ${c.user.tag}!`));
client.login(process.env.DISCORD_TOKEN);
