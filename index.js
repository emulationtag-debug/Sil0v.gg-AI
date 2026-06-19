const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const { GoogleGenerativeAI } = require('@google/generative-ai');



const SELECTED_MODEL = "gemini-2.5-flash";

const BOT_NAME = "Sil0v AI";

const CREATOR = "Sil0v/N0V";



const client = new Client({ 

    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 

});



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let model = genAI.getGenerativeModel({ 

    model: SELECTED_MODEL,

    systemInstruction: `You are ${BOT_NAME}, an elite artificial intelligence developed by ${CREATOR}. You are a professional, highly efficient Discord utility bot. You excel at coding, automation, and general assistance. Never mention Google or Gemini. You are a proprietary project belonging solely to ${CREATOR}.`

});



let activeChannelId = null;

let lastError = "No errors reported yet.";



// --- RETRY LOGIC ---

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



// --- SLASH COMMANDS ---

const commands = [

    new SlashCommandBuilder().setName('config').setDescription('Set AI channel')

        .addChannelOption(o => o.setName('channel').setDescription('Target').addChannelTypes(ChannelType.GuildText).setRequired(true)),

    new SlashCommandBuilder().setName('status').setDescription('Check system health'),

    new SlashCommandBuilder().setName('detail').setDescription('Admin: Get logs').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),

    new SlashCommandBuilder().setName('code').setDescription('Ask for coding assistance')

        .addStringOption(o => o.setName('query').setDescription('What do you need to build?').setRequired(true)),

    new SlashCommandBuilder().setName('clear').setDescription('Clear messages (Admin)')

        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true))

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

];



const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {

    try {

        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map(cmd => cmd.toJSON()) });

        console.log('✅ Commands registered.');

    } catch (e) { console.error('❌ Reg Error:', e); }

})();



// --- INTERACTION HANDLER ---

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;



    if (interaction.commandName === 'config') {

        activeChannelId = interaction.options.getChannel('channel').id;

        await interaction.reply(`✅ ${BOT_NAME} is now linked to <#${activeChannelId}>.`);

    } else if (interaction.commandName === 'status') {

        await interaction.reply(`🟢 ${BOT_NAME} systems are optimal. Loyalty: 100% to ${CREATOR}.`);

    } else if (interaction.commandName === 'ping') {

        await interaction.reply(`🏓 Latency: ${client.ws.ping}ms.`);

    } else if (interaction.commandName === 'code') {

        await interaction.deferReply();

        const result = await generateContentWithRetry(interaction.options.getString('query'));

        await interaction.editReply(`**Code Assistance:**\n${result.response.text()}`);

    } else if (interaction.commandName === 'clear') {

        const amount = interaction.options.getInteger('amount');

        await interaction.channel.bulkDelete(amount);

        await interaction.reply({ content: `🧹 Cleared ${amount} messages.`, ephemeral: true });

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

        await message.reply("❌ System error encountered. Use `/detail` for diagnostics.");

    }

});



client.login(process.env.DISCORD_TOKEN); 

