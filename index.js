const {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events,
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, AuditLogEvent, Collection, ActivityType, PresenceUpdateStatus,
    ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, bold,
    italic, codeBlock, inlineCode, underscore, strikethrough, time
} = require('discord.js');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    BOT_NAME: "Sil0v AI Ultra",
    BOT_VERSION: "4.2.0",
    CREATOR: "Sil0v/N0V",
    
    SELECTED_MODEL: "gemini-2.5-flash",
    FALLBACK_MODEL: "gemini-1.5-pro",
    MAX_RETRIES: 5,
    BASE_DELAY: 2000,
    
    THEME: {
        PRIMARY: "#2F3136",
        SECONDARY: "#5865F2",
        SUCCESS: "#57F287",
        WARNING: "#FEE75C",
        ERROR: "#ED4245",
        INFO: "#5865F2",
        GRADIENT_START: "#5865F2",
        GRADIENT_END: "#EB459E"
    },
    
    STORAGE_FILE: './bot_data.json'
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STORAGE = {
    guilds: new Map(),
    users: new Map(),
    activeChannels: new Map(),
    
    async saveToFile() {
        try {
            const data = {
                guilds: Array.from(this.guilds.entries()),
                users: Array.from(this.users.entries()),
                activeChannels: Array.from(this.activeChannels.entries())
            };
            await fs.writeFile(CONFIG.STORAGE_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error("Failed to save data:", error);
        }
    },
    
    async loadFromFile() {
        try {
            const data = await fs.readFile(CONFIG.STORAGE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            this.guilds = new Map(parsed.guilds || []);
            this.users = new Map(parsed.users || []);
            this.activeChannels = new Map(parsed.activeChannels || []);
        } catch (error) {
            console.log("No existing data found, starting fresh");
        }
    }
};

// ============================================================================
// MANAGER CLASSES
// ============================================================================

class AIManager {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: CONFIG.SELECTED_MODEL,
            systemInstruction: `You are ${CONFIG.BOT_NAME}, created by ${CONFIG.CREATOR}. You are an elite AI assistant specializing in coding, 3D physics (Three.js), and security. Be professional, efficient, and precise. Never mention Google or Gemini.`
        });
        this.requestCount = 0;
    }
    
    async generate(prompt, options = {}) {
        this.requestCount++;
        const maxRetries = options.retries || CONFIG.MAX_RETRIES;
        let delay = options.delay || CONFIG.BASE_DELAY;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                return result;
            } catch (error) {
                if (!this.isRetryable(error) || attempt === maxRetries - 1) {
                    throw error;
                }
                await this.delay(delay + Math.random() * 1000);
                delay *= 2;
            }
        }
    }
    
    isRetryable(error) {
        const retryable = ['503', '502', '429', 'fetch failed', 'timeout'];
        return retryable.some(r => error.message?.toLowerCase().includes(r));
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStats() {
        return {
            requestCount: this.requestCount,
            currentModel: CONFIG.SELECTED_MODEL
        };
    }
}

class UserManager {
    getUser(userId) {
        if (!STORAGE.users.has(userId)) {
            STORAGE.users.set(userId, {
                id: userId,
                xp: 0,
                level: 1,
                balance: 100,
                messages: 0,
                commandsUsed: 0,
                inventory: [],
                lastDaily: null,
                stats: {
                    aiInteractions: 0,
                    codesGenerated: 0
                }
            });
        }
        return STORAGE.users.get(userId);
    }
    
    addXP(userId, amount) {
        const user = this.getUser(userId);
        user.xp += amount;
        
        const xpNeeded = Math.floor(100 * Math.pow(1.5, user.level - 1));
        if (user.xp >= xpNeeded) {
            user.xp -= xpNeeded;
            user.level++;
            return { leveledUp: true, newLevel: user.level };
        }
        return { leveledUp: false, newLevel: user.level };
    }
    
    addBalance(userId, amount) {
        const user = this.getUser(userId);
        user.balance += amount;
        return user.balance;
    }
    
    getBalance(userId) {
        return this.getUser(userId).balance;
    }
    
    recordCommand(userId, command) {
        const user = this.getUser(userId);
        user.commandsUsed++;
        user.stats.aiInteractions++;
    }
}

class GuildManager {
    getGuild(guildId) {
        if (!STORAGE.guilds.has(guildId)) {
            STORAGE.guilds.set(guildId, {
                id: guildId,
                aiChannel: null,
                welcomeChannel: null,
                logChannel: null,
                musicChannel: null,
                ticketChannel: null,
                suggestionChannel: null,
                starboardChannel: null,
                settings: {
                    prefix: '/',
                    welcomeEnabled: true,
                    levelingEnabled: true,
                    economyEnabled: true,
                    autoModEnabled: false
                },
                stats: {
                    messageCount: 0,
                    commandCount: 0
                }
            });
        }
        return STORAGE.guilds.get(guildId);
    }
    
    async updateGuild(guildId, data) {
        const guild = this.getGuild(guildId);
        Object.assign(guild, data);
        await STORAGE.saveToFile();
        return guild;
    }
}

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }
    
    set(userId, command, duration) {
        const key = `${userId}_${command}`;
        this.cooldowns.set(key, Date.now() + duration);
    }
    
    get(userId, command) {
        const key = `${userId}_${command}`;
        const expiry = this.cooldowns.get(key);
        if (!expiry) return { onCooldown: false, remaining: 0 };
        
        if (Date.now() > expiry) {
            this.cooldowns.delete(key);
            return { onCooldown: false, remaining: 0 };
        }
        
        return {
            onCooldown: true,
            remaining: Math.ceil((expiry - Date.now()) / 1000)
        };
    }
}

class RateLimitManager {
    constructor() {
        this.requests = new Map();
        this.window = 60000;
        this.limit = 60;
    }
    
    check(userId) {
        const key = userId;
        const now = Date.now();
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const userRequests = this.requests.get(key);
        const valid = userRequests.filter(t => now - t < this.window);
        
        if (valid.length >= this.limit) {
            return { allowed: false, remaining: 0 };
        }
        
        valid.push(now);
        this.requests.set(key, valid);
        
        return { allowed: true, remaining: this.limit - valid.length };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(date) {
    return new Date(date).toLocaleString();
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculate(expression) {
    try {
        const sanitized = expression
            .replace(/[^0-9+\-*/^().%\s]/g, '')
            .replace(/\^/g, '**')
            .replace(/%/g, '/100');
        const result = Function(`"use strict"; return (${sanitized})`)();
        return { success: true, result };
    } catch {
        return { success: false, error: 'Invalid calculation' };
    }
}

// ============================================================================
// EMBED BUILDERS
// ============================================================================

class EmbedBuilderHelper {
    static createEmbed(options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || CONFIG.THEME.PRIMARY)
            .setFooter({ 
                text: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION} | ${CONFIG.CREATOR}`
            })
            .setTimestamp();
        
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.fields) embed.addFields(options.fields);
        
        return embed;
    }
    
    static success(title, description) {
        return this.createEmbed({
            color: CONFIG.THEME.SUCCESS,
            title: `✅ ${title}`,
            description
        });
    }
    
    static error(title, description) {
        return this.createEmbed({
            color: CONFIG.THEME.ERROR,
            title: `❌ ${title}`,
            description
        });
    }
    
    static info(title, description) {
        return this.createEmbed({
            color: CONFIG.THEME.INFO,
            title: `ℹ️ ${title}`,
            description
        });
    }
    
    static warning(title, description) {
        return this.createEmbed({
            color: CONFIG.THEME.WARNING,
            title: `⚠️ ${title}`,
            description
        });
    }
}

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

class CommandRegistry {
    constructor() {
        this.commands = new Collection();
        this.categories = new Map();
    }
    
    register(command) {
        this.commands.set(command.name, command);
        
        if (!this.categories.has(command.category)) {
            this.categories.set(command.category, []);
        }
        this.categories.get(command.category).push(command.name);
    }
    
    get(name) {
        return this.commands.get(name);
    }
    
    getAll() {
        return this.commands;
    }
    
    getByCategory(category) {
        return (this.categories.get(category) || []).map(name => this.commands.get(name));
    }
    
    getSlashCommands() {
        const slashCommands = [];
        this.commands.forEach(cmd => {
            if (cmd.slashData) {
                slashCommands.push(cmd.slashData.toJSON());
            }
        });
        return slashCommands;
    }
}

const commandRegistry = new CommandRegistry();

// ============================================================================
// COMMAND DEFINITIONS
// ============================================================================

// ==================== SETUP & CONFIGURATION ====================

commandRegistry.register({
    name: 'config',
    description: 'Configure bot settings',
    category: 'Setup',
    cooldown: 5,
    permissions: ['Administrator'],
    slashData: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure bot settings')
        .addSubcommand(sub =>
            sub.setName('ai_channel')
                .setDescription('Set the AI channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The channel for AI responses')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('welcome_channel')
                .setDescription('Set the welcome channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The channel for welcome messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('log_channel')
                .setDescription('Set the moderation log channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The channel for logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('ticket_channel')
                .setDescription('Set the ticket channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The channel for ticket creation')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('starboard_channel')
                .setDescription('Set the starboard channel')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('The channel for starred messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Administrator permission.')],
                ephemeral: true
            });
        }
        
        const sub = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;
        
        let message = '';
        
        try {
            switch (sub) {
                case 'ai_channel':
                    if (!channel) return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Invalid channel')], ephemeral: true });
                    await guildMgr.updateGuild(guildId, { aiChannel: channel.id });
                    STORAGE.activeChannels.set(guildId, channel.id);
                    message = `✅ AI channel set to ${channel}. I will respond to messages in this channel.`;
                    break;
                    
                case 'welcome_channel':
                    if (!channel) return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Invalid channel')], ephemeral: true });
                    await guildMgr.updateGuild(guildId, { welcomeChannel: channel.id });
                    message = `✅ Welcome channel set to ${channel}.`;
                    break;
                    
                case 'log_channel':
                    if (!channel) return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Invalid channel')], ephemeral: true });
                    await guildMgr.updateGuild(guildId, { logChannel: channel.id });
                    message = `✅ Log channel set to ${channel}.`;
                    break;
                    
                case 'ticket_channel':
                    if (!channel) return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Invalid channel')], ephemeral: true });
                    await guildMgr.updateGuild(guildId, { ticketChannel: channel.id });
                    message = `✅ Ticket channel set to ${channel}.`;
                    break;
                    
                case 'starboard_channel':
                    if (!channel) return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Invalid channel')], ephemeral: true });
                    await guildMgr.updateGuild(guildId, { starboardChannel: channel.id });
                    message = `✅ Starboard channel set to ${channel}.`;
                    break;
                    
                default:
                    return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Unknown subcommand')], ephemeral: true });
            }
            
            userMgr.recordCommand(interaction.user.id, 'config');
            return interaction.reply({ embeds: [EmbedBuilderHelper.success('Configuration Updated', message)] });
        } catch (error) {
            console.error('Config error:', error);
            return interaction.reply({ embeds: [EmbedBuilderHelper.error('Error', 'Failed to update configuration')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'setup',
    description: 'Initial bot setup wizard',
    category: 'Setup',
    cooldown: 30,
    permissions: ['Administrator'],
    slashData: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Run the initial setup wizard'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Administrator permission.')],
                ephemeral: true
            });
        }
        
        const embed = EmbedBuilderHelper.info(
            'Setup Wizard',
            `Welcome to ${CONFIG.BOT_NAME} setup!\n\n` +
            `Use the /config command to set up:\n` +
            `• AI Channel\n` +
            `• Welcome Channel\n` +
            `• Log Channel\n` +
            `• Ticket Channel\n` +
            `• Starboard Channel\n\n` +
            `All configurations are automatically saved.`
        );
        
        userMgr.recordCommand(interaction.user.id, 'setup');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'help',
    description: 'Get help and command list',
    category: 'Setup',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help and command list')
        .addStringOption(opt =>
            opt.setName('category')
                .setDescription('Filter by category')
                .addChoices(
                    { name: 'Setup', value: 'Setup' },
                    { name: 'AI', value: 'AI' },
                    { name: 'Moderation', value: 'Moderation' },
                    { name: 'Utility', value: 'Utility' },
                    { name: 'Economy', value: 'Economy' },
                    { name: 'Fun', value: 'Fun' }
                )),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const category = interaction.options.getString('category');
        
        let fields = [];
        const categories = ['Setup', 'AI', 'Moderation', 'Utility', 'Economy', 'Fun'];
        
        if (category) {
            const commands = commandRegistry.getByCategory(category);
            fields = [{
                name: `${category} Commands`,
                value: commands.map(c => `**/${c.name}** - ${c.description}`).join('\n'),
                inline: false
            }];
        } else {
            for (const cat of categories) {
                const commands = commandRegistry.getByCategory(cat);
                if (commands.length > 0) {
                    fields.push({
                        name: `**${cat}** (${commands.length})`,
                        value: commands.map(c => `/${c.name}`).join(', '),
                        inline: false
                    });
                }
            }
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `📚 ${CONFIG.BOT_NAME} Help`,
            color: CONFIG.THEME.INFO,
            description: `Use the commands below to interact with the bot.\nVersion: ${CONFIG.BOT_VERSION}`,
            fields
        });
        
        userMgr.recordCommand(interaction.user.id, 'help');
        return interaction.reply({ embeds: [embed] });
    }
});

// ==================== AI & DEVELOPMENT ====================

commandRegistry.register({
    name: 'ai',
    description: 'Ask the AI assistant',
    category: 'AI',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Ask the AI assistant a question')
        .addStringOption(opt =>
            opt.setName('prompt')
                .setDescription('Your question or request')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const prompt = interaction.options.getString('prompt');
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🤖 AI Response',
                color: CONFIG.THEME.INFO,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'ai');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('AI Error', 'Failed to get a response. Please try again.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'code',
    description: 'Generate code in any language',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('code')
        .setDescription('Generate code in any language')
        .addStringOption(opt =>
            opt.setName('language')
                .setDescription('Programming language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'JavaScript' },
                    { name: 'Python', value: 'Python' },
                    { name: 'TypeScript', value: 'TypeScript' },
                    { name: 'Java', value: 'Java' },
                    { name: 'C++', value: 'C++' },
                    { name: 'C#', value: 'C#' },
                    { name: 'Go', value: 'Go' },
                    { name: 'Rust', value: 'Rust' },
                    { name: 'PHP', value: 'PHP' },
                    { name: 'Ruby', value: 'Ruby' },
                    { name: 'Swift', value: 'Swift' },
                    { name: 'Kotlin', value: 'Kotlin' },
                    { name: 'SQL', value: 'SQL' },
                    { name: 'Bash', value: 'Bash' }
                ))
        .addStringOption(opt =>
            opt.setName('description')
                .setDescription('What the code should do')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const language = interaction.options.getString('language');
        const description = interaction.options.getString('description');
        
        const prompt = `Generate ${language} code for: ${description}\n\nInclude:\n1. Complete, working code\n2. Detailed comments\n3. Error handling\n4. Usage examples`;
        
        try {
            const result = await aiManager.generate(prompt);
            const code = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: `💻 ${language} Code`,
                color: CONFIG.THEME.SUCCESS,
                description: `\`\`\`${language.toLowerCase()}\n${code.length > 2500 ? code.substring(0, 2500) + '...' : code}\n\`\`\``
            });
            
            userMgr.recordCommand(interaction.user.id, 'code');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Code Generation Failed', 'Failed to generate code. Please try again.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'visualize',
    description: 'Generate Three.js 3D visualization code',
    category: 'AI',
    cooldown: 8,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('visualize')
        .setDescription('Generate Three.js 3D visualization code')
        .addStringOption(opt =>
            opt.setName('concept')
                .setDescription('What to visualize (e.g., tornado, solar system)')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const concept = interaction.options.getString('concept');
        
        const prompt = `Create a complete Three.js 3D visualization for: ${concept}\n\nRequirements:\n1. Complete HTML/CSS/JavaScript code\n2. Modern ES6+ JavaScript\n3. Optimize performance\n4. Include proper lighting and camera\n5. Add orbit controls and mouse interaction\n6. Clean, well-commented code\n7. Error handling\n8. Responsive design`;
        
        try {
            const result = await aiManager.generate(prompt);
            const code = result.response.text();
            
            const attachment = new AttachmentBuilder(
                Buffer.from(code),
                { name: 'visualization.html' }
            );
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🎮 3D Visualization',
                color: CONFIG.THEME.GRADIENT_END,
                description: `Created a Three.js visualization for: ${concept}`,
                fields: [
                    { name: 'Lines of Code', value: code.split('\n').length.toString(), inline: true }
                ]
            });
            
            userMgr.recordCommand(interaction.user.id, 'visualize');
            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Visualization Failed', 'Failed to generate visualization code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'debug',
    description: 'Debug and analyze code',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug and analyze code')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to debug')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Analyze and debug this code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. List of issues found\n2. Severity level for each issue\n3. Fixed code with corrections\n4. Explanation of fixes\n5. Best practice recommendations`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🔍 Code Debug',
                color: CONFIG.THEME.WARNING,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'debug');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Debug Failed', 'Failed to analyze code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'explain',
    description: 'Get detailed code explanation',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('explain')
        .setDescription('Get detailed code explanation')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to explain')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Provide a detailed explanation of this code:\n\`\`\`\n${code}\n\`\`\`\n\nInclude:\n1. Overall purpose and functionality\n2. Step-by-step breakdown\n3. Key concepts and patterns\n4. Complexity analysis\n5. Potential improvements`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '📖 Code Explanation',
                color: CONFIG.THEME.INFO,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'explain');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Explanation Failed', 'Failed to explain code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'optimize',
    description: 'Optimize code for better performance',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('optimize')
        .setDescription('Optimize code for better performance')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to optimize')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Optimize this code for performance:\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. Optimized version\n2. Explanation of optimizations\n3. Performance improvements\n4. Complexity comparison\n5. Additional suggestions`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '⚡ Code Optimization',
                color: CONFIG.THEME.SUCCESS,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'optimize');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Optimization Failed', 'Failed to optimize code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'convert',
    description: 'Convert code between languages',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('Convert code between languages')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to convert')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('from')
                .setDescription('Source language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'JavaScript' },
                    { name: 'Python', value: 'Python' },
                    { name: 'TypeScript', value: 'TypeScript' },
                    { name: 'Java', value: 'Java' },
                    { name: 'C++', value: 'C++' },
                    { name: 'C#', value: 'C#' },
                    { name: 'Go', value: 'Go' },
                    { name: 'Rust', value: 'Rust' }
                ))
        .addStringOption(opt =>
            opt.setName('to')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'JavaScript' },
                    { name: 'Python', value: 'Python' },
                    { name: 'TypeScript', value: 'TypeScript' },
                    { name: 'Java', value: 'Java' },
                    { name: 'C++', value: 'C++' },
                    { name: 'C#', value: 'C#' },
                    { name: 'Go', value: 'Go' },
                    { name: 'Rust', value: 'Rust' }
                )),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        const from = interaction.options.getString('from');
        const to = interaction.options.getString('to');
        
        const prompt = `Convert this ${from} code to ${to}:\n\`\`\`${from}\n${code}\n\`\`\`\n\nProvide accurate conversion with proper error handling and idiomatic patterns.`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: `🔄 ${from} → ${to}`,
                color: CONFIG.THEME.SECONDARY,
                description: `\`\`\`${to.toLowerCase()}\n${response.length > 3000 ? response.substring(0, 3000) + '...' : response}\n\`\`\``
            });
            
            userMgr.recordCommand(interaction.user.id, 'convert');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Conversion Failed', 'Failed to convert code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'security',
    description: 'Analyze code for security vulnerabilities',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('security')
        .setDescription('Analyze code for security vulnerabilities')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to analyze')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Perform security analysis of this code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. List of vulnerabilities\n2. Severity ratings\n3. Explanations\n4. exploitation scenarios\n5. Remediation steps\n6. Security best practices`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🔒 Security Analysis',
                color: CONFIG.THEME.ERROR,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'security');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Analysis Failed', 'Failed to analyze code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'review',
    description: 'Get comprehensive code review',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Get comprehensive code review')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to review')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Perform comprehensive code review:\n\`\`\`\n${code}\n\`\`\`\n\nEvaluate:\n1. Code quality\n2. Architecture\n3. Performance\n4. Error handling\n5. Security\n6. Testing recommendations\n7. Documentation\n8. Best practices\n9. Improvements\n10. Overall rating (1-10)`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '📋 Code Review',
                color: CONFIG.THEME.INFO,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            userMgr.recordCommand(interaction.user.id, 'review');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Review Failed', 'Failed to review code.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'document',
    description: 'Generate documentation for code',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('document')
        .setDescription('Generate documentation for code')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to document')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Generate comprehensive documentation for this code:\n\`\`\`\n${code}\n\`\`\`\n\nInclude JSDoc/DocBlock format with parameters, returns, and usage examples.`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '📚 Documentation',
                color: CONFIG.THEME.SECONDARY,
                description: `\`\`\`\n${response.length > 3000 ? response.substring(0, 3000) + '...' : response}\n\`\`\``
            });
            
            userMgr.recordCommand(interaction.user.id, 'document');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Documentation Failed', 'Failed to generate documentation.')]
            });
        }
    }
});

commandRegistry.register({
    name: 'test',
    description: 'Generate unit tests for code',
    category: 'AI',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Generate unit tests for code')
        .addStringOption(opt =>
            opt.setName('code')
                .setDescription('The code to generate tests for')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        await interaction.deferReply();
        
        const code = interaction.options.getString('code');
        
        const prompt = `Generate comprehensive unit tests for this code:\n\`\`\`\n${code}\n\`\`\`\n\nInclude happy paths, edge cases, and error conditions.`;
        
        try {
            const result = await aiManager.generate(prompt);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🧪 Unit Tests',
                color: CONFIG.THEME.SUCCESS,
                description: `\`\`\`\n${response.length > 3000 ? response.substring(0, 3000) + '...' : response}\n\`\`\``
            });
            
            userMgr.recordCommand(interaction.user.id, 'test');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Test Generation Failed', 'Failed to generate tests.')]
            });
        }
    }
});

// ==================== MODERATION ====================

commandRegistry.register({
    name: 'ban',
    description: 'Ban a user from the server',
    category: 'Moderation',
    cooldown: 0,
    permissions: ['BanMembers'],
    slashData: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the ban')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Ban Members permission.')],
                ephemeral: true
            });
        }
        
        try {
            await interaction.guild.members.ban(user, { reason });
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🔨 User Banned',
                color: CONFIG.THEME.ERROR,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                ]
            });
            
            const guild = guildMgr.getGuild(interaction.guildId);
            guild.stats.commandCount++;
            
            userMgr.recordCommand(interaction.user.id, 'ban');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Ban Failed', 'Failed to ban user.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'kick',
    description: 'Kick a user from the server',
    category: 'Moderation',
    cooldown: 0,
    permissions: ['KickMembers'],
    slashData: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the kick')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Kick Members permission.')],
                ephemeral: true
            });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick(reason);
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '👢 User Kicked',
                color: CONFIG.THEME.WARNING,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                ]
            });
            
            const guild = guildMgr.getGuild(interaction.guildId);
            guild.stats.commandCount++;
            
            userMgr.recordCommand(interaction.user.id, 'kick');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Kick Failed', 'Failed to kick user.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'mute',
    description: 'Mute a user in the server',
    category: 'Moderation',
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user in the server')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the mute'))
        .addIntegerOption(opt =>
            opt.setName('duration')
                .setDescription('Duration in minutes')
                .setMinValue(1)
                .setMaxValue(10080)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getInteger('duration');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Moderate Members permission.')],
                ephemeral: true
            });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (duration) {
                await member.timeout(duration * 60000, reason);
            } else {
                await member.voice.setMute(true);
            }
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🔇 User Muted',
                color: CONFIG.THEME.WARNING,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Duration', value: duration ? `${duration} minutes` : 'Indefinite', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ]
            });
            
            userMgr.recordCommand(interaction.user.id, 'mute');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Mute Failed', 'Failed to mute user.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'unmute',
    description: 'Unmute a user',
    category: 'Moderation',
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Moderate Members permission.')],
                ephemeral: true
            });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(null);
            
            const embed = EmbedBuilderHelper.success('User Unmuted', `${user.tag} has been unmuted.`);
            
            userMgr.recordCommand(interaction.user.id, 'unmute');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Unmute Failed', 'Failed to unmute user.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'warn',
    description: 'Warn a user',
    category: 'Moderation',
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Moderate Members permission.')],
                ephemeral: true
            });
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '⚠️ User Warned',
            color: CONFIG.THEME.WARNING,
            fields: [
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'warn');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'clear',
    description: 'Clear messages from a channel',
    category: 'Moderation',
    cooldown: 2,
    permissions: ['ManageMessages'],
    slashData: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from a channel')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const amount = interaction.options.getInteger('amount');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Manage Messages permission.')],
                ephemeral: true
            });
        }
        
        try {
            await interaction.channel.bulkDelete(amount, true);
            
            const embed = EmbedBuilderHelper.success('Messages Cleared', `Deleted ${amount} messages.`);
            
            userMgr.recordCommand(interaction.user.id, 'clear');
            const msg = await interaction.reply({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Clear Failed', 'Failed to delete messages.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'slowmode',
    description: 'Set slowmode for a channel',
    category: 'Moderation',
    cooldown: 2,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for a channel')
        .addIntegerOption(opt =>
            opt.setName('seconds')
                .setDescription('Slowmode duration in seconds')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const seconds = interaction.options.getInteger('seconds');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Manage Channels permission.')],
                ephemeral: true
            });
        }
        
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            
            const embed = EmbedBuilderHelper.success('Slowmode Set', `Slowmode set to ${seconds} seconds.`);
            
            userMgr.recordCommand(interaction.user.id, 'slowmode');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to set slowmode.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'lock',
    description: 'Lock a channel',
    category: 'Moderation',
    cooldown: 2,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to lock (defaults to current)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Manage Channels permission.')],
                ephemeral: true
            });
        }
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            
            const embed = EmbedBuilderHelper.success('Channel Locked', `${channel} has been locked.`);
            
            userMgr.recordCommand(interaction.user.id, 'lock');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to lock channel.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'unlock',
    description: 'Unlock a channel',
    category: 'Moderation',
    cooldown: 2,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to unlock (defaults to current)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Manage Channels permission.')],
                ephemeral: true
            });
        }
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            
            const embed = EmbedBuilderHelper.success('Channel Unlocked', `${channel} has been unlocked.`);
            
            userMgr.recordCommand(interaction.user.id, 'unlock');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to unlock channel.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'audit',
    description: 'View recent audit logs',
    category: 'Moderation',
    cooldown: 5,
    permissions: ['ViewAuditLog'],
    slashData: new SlashCommandBuilder()
        .setName('audit')
        .setDescription('View recent audit logs')
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Number of entries to show')
                .setMinValue(1)
                .setMaxValue(25)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const limit = interaction.options.getInteger('limit') || 5;
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need View Audit Log permission.')],
                ephemeral: true
            });
        }
        
        try {
            const logs = await interaction.guild.fetchAuditLogs({ limit });
            const entries = logs.entries.map(e => 
                `**${e.executor.tag}** - ${e.action}\n${e.reason || 'No reason'}\nDate: ${formatDate(e.createdAt)}`
            ).join('\n\n');
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '📋 Recent Audit Logs',
                color: CONFIG.THEME.INFO,
                description: entries || 'No logs found.'
            });
            
            userMgr.recordCommand(interaction.user.id, 'audit');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to fetch audit logs.')],
                ephemeral: true
            });
        }
    }
});

commandRegistry.register({
    name: 'nickname',
    description: 'Moderate a user nickname',
    category: 'Moderation',
    cooldown: 2,
    permissions: ['ManageNicknames'],
    slashData: new SlashCommandBuilder()
        .setName('nickname')
        .setDescription('Moderate a user nickname')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to change nickname for')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('nickname')
                .setDescription('New nickname (leave empty to reset)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageNicknames)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Manage Nicknames permission.')],
                ephemeral: true
            });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.setNickname(nickname || null);
            
            const embed = EmbedBuilderHelper.success('Nickname Updated', 
                `${user.tag}'s nickname has been ${nickname ? `set to "${nickname}"` : 'reset'}.`);
            
            userMgr.recordCommand(interaction.user.id, 'nickname');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to update nickname.')],
                ephemeral: true
            });
        }
    }
});

// ==================== UTILITY ====================

commandRegistry.register({
    name: 'userinfo',
    description: 'Get information about a user',
    category: 'Utility',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user (defaults to you)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);
        const userData = userMgr.getUser(target.id);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `👤 ${target.tag}`,
            color: CONFIG.THEME.SECONDARY,
            thumbnail: target.displayAvatarURL({ size: 256 }),
            fields: [
                { name: 'User ID', value: target.id, inline: true },
                { name: 'Created', value: formatDate(target.createdAt), inline: true },
                { name: 'Joined', value: member ? formatDate(member.joinedAt) : 'Not in server', inline: true },
                { name: 'Level', value: userData.level.toString(), inline: true },
                { name: 'Balance', value: `${userData.balance} coins`, inline: true },
                { name: 'Messages', value: userData.messages.toString(), inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'userinfo');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'serverinfo',
    description: 'Get information about the server',
    category: 'Utility',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const guild = interaction.guild;
        const guildData = guildMgr.getGuild(guild.id);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `🏠 ${guild.name}`,
            color: CONFIG.THEME.INFO,
            thumbnail: guild.iconURL({ size: 256 }),
            fields: [
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Members', value: guild.memberCount.toString(), inline: true },
                { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: 'Created', value: formatDate(guild.createdAt), inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'serverinfo');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'avatar',
    description: 'Get a user avatar',
    category: 'Utility',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get a user avatar')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user (defaults to you)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `🖼️ ${target.tag}'s Avatar`,
            color: CONFIG.THEME.INFO,
            image: { url: target.displayAvatarURL({ size: 4096 }) }
        });
        
        userMgr.recordCommand(interaction.user.id, 'avatar');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'ping',
    description: 'Check bot latency',
    category: 'Utility',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🏓 Pong!',
            color: CONFIG.THEME.SUCCESS,
            fields: [
                { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
            ]
        });
        
        await sent.edit({ embeds: [embed] });
        userMgr.recordCommand(interaction.user.id, 'ping');
    }
});

commandRegistry.register({
    name: 'stats',
    description: 'View bot statistics',
    category: 'Utility',
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View bot statistics'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const uptime = Date.now() - client.readyTimestamp;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '📊 Bot Statistics',
            color: CONFIG.THEME.INFO,
            fields: [
                { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
                { name: 'Users', value: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString(), inline: true },
                { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: 'Commands Used', value: STORAGE.users.reduce((a, u) => a + u.commandsUsed, 0).toString(), inline: true },
                { name: 'AI Requests', value: aiManager.getStats().requestCount.toString(), inline: true },
                { name: 'Version', value: CONFIG.BOT_VERSION, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'stats');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'roleinfo',
    description: 'Get information about a role',
    category: 'Utility',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Get information about a role')
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('The role')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const role = interaction.options.getRole('role');
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `🏷️ ${role.name}`,
            color: role.color,
            fields: [
                { name: 'Role ID', value: role.id, inline: true },
                { name: 'Members', value: role.members.size.toString(), inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Position', value: role.position.toString(), inline: true },
                { name: 'Color', value: role.hexColor, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'roleinfo');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'channelinfo',
    description: 'Get information about a channel',
    category: 'Utility',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Get information about a channel')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel (defaults to current)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `📢 #${channel.name}`,
            color: CONFIG.THEME.INFO,
            fields: [
                { name: 'Channel ID', value: channel.id, inline: true },
                { name: 'Type', value: channel.type.toString(), inline: true },
                { name: 'Created', value: formatDate(channel.createdAt), inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'channelinfo');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'emoji',
    description: 'Get an enlarged emoji',
    category: 'Utility',
    cooldown: 2,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Get an enlarged emoji')
        .addStringOption(opt =>
            opt.setName('emoji')
                .setDescription('The emoji')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const emojiInput = interaction.options.getString('emoji');
        const emojiMatch = emojiInput.match(/<a?:\w+:(\d+)>/);
        
        if (!emojiMatch) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Invalid Emoji', 'Please provide a custom or animated emoji.')],
                ephemeral: true
            });
        }
        
        const emojiId = emojiMatch[1];
        const url = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '😀 Emoji',
            color: CONFIG.THEME.INFO,
            image: { url }
        });
        
        userMgr.recordCommand(interaction.user.id, 'emoji');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'invite',
    description: 'Get the bot invite link',
    category: 'Utility',
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🔗 Invite Bot',
            color: CONFIG.THEME.SUCCESS,
            description: `Add ${CONFIG.BOT_NAME} to your server using the link below.`,
            fields: [{ name: 'Link', value: `[Click Here](${inviteUrl})`, inline: false }]
        });
        
        userMgr.recordCommand(interaction.user.id, 'invite');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'calculate',
    description: 'Perform mathematical calculations',
    category: 'Utility',
    cooldown: 2,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Perform mathematical calculations')
        .addStringOption(opt =>
            opt.setName('expression')
                .setDescription('The expression to calculate')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const expression = interaction.options.getString('expression');
        const result = calculate(expression);
        
        if (!result.success) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Calculation Error', result.error)],
                ephemeral: true
            });
        }
        
        const embed = EmbedBuilderHelper.success('Calculation Result', 
            `\`\`\`\n${expression} = ${result.result}\n\`\`\``);
        
        userMgr.recordCommand(interaction.user.id, 'calculate');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'whois',
    description: 'Get detailed information about a user',
    category: 'Utility',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('whois')
        .setDescription('Get detailed information about a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user (defaults to you)')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);
        const userData = userMgr.getUser(target.id);
        
        const roles = member ? member.roles.cache.map(r => r.name).join(', ') : 'None';
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `🔍 Whois: ${target.tag}`,
            color: CONFIG.THEME.INFO,
            thumbnail: target.displayAvatarURL({ size: 256 }),
            fields: [
                { name: 'User ID', value: target.id, inline: true },
                { name: 'Account Created', value: formatDate(target.createdAt), inline: true },
                { name: 'Joined Server', value: member ? formatDate(member.joinedAt) : 'Not in server', inline: true },
                { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
                { name: 'Level', value: userData.level.toString(), inline: true },
                { name: 'Balance', value: `${userData.balance} coins`, inline: true },
                { name: 'Roles', value: roles.substring(0, 1000) || 'None', inline: false }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'whois');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'announce',
    description: 'Send an announcement',
    category: 'Utility',
    cooldown: 60,
    permissions: ['Administrator'],
    slashData: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to announce in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('The announcement message')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Permission Denied', 'You need Administrator permission.')],
                ephemeral: true
            });
        }
        
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        
        try {
            const embed = EmbedBuilderHelper.createEmbed({
                title: '📢 Announcement',
                color: CONFIG.THEME.INFO,
                description: message,
                footer: { text: `Sent by ${interaction.user.tag}` }
            });
            
            await channel.send({ embeds: [embed] });
            
            const successEmbed = EmbedBuilderHelper.success('Announcement Sent', `Message sent to ${channel}`);
            userMgr.recordCommand(interaction.user.id, 'announce');
            return interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Failed', 'Failed to send announcement.')],
                ephemeral: true
            });
        }
    }
});

// ==================== ECONOMY ====================

commandRegistry.register({
    name: 'balance',
    description: 'Check your coin balance',
    category: 'Economy',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Check another user balance')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user') || interaction.user;
        const balance = userMgr.getBalance(target.id);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '💰 Balance',
            color: CONFIG.THEME.GOLD,
            fields: [
                { name: 'User', value: target.tag, inline: true },
                { name: 'Balance', value: `${balance} coins`, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'balance');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'daily',
    description: 'Claim daily reward',
    category: 'Economy',
    cooldown: 2,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim daily reward'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const userData = userMgr.getUser(interaction.user.id);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        
        if (userData.lastDaily && now - userData.lastDaily < cooldown) {
            const remaining = Math.ceil((userData.lastDaily + cooldown - now) / 1000 / 60 / 60);
            return interaction.reply({
                embeds: [EmbedBuilderHelper.warning('Cooldown', `You can claim again in ${remaining} hours.`)],
                ephemeral: true
            });
        }
        
        const reward = random(100, 500);
        userMgr.addBalance(interaction.user.id, reward);
        userData.lastDaily = now;
        
        const embed = EmbedBuilderHelper.success('Daily Reward', `You received ${reward} coins!`);
        userMgr.recordCommand(interaction.user.id, 'daily');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'give',
    description: 'Give coins to another user',
    category: 'Economy',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give coins to another user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to give coins to')
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Amount of coins to give')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        if (target.id === interaction.user.id) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Error', "You can't give coins to yourself!")],
                ephemeral: true
            });
        }
        
        if (userMgr.getBalance(interaction.user.id) < amount) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Insufficient Funds', "You don't have enough coins!")],
                ephemeral: true
            });
        }
        
        userMgr.addBalance(interaction.user.id, -amount);
        userMgr.addBalance(target.id, amount);
        
        const embed = EmbedBuilderHelper.success('Coins Transferred', 
            `You gave ${amount} coins to ${target.tag}.`);
        userMgr.recordCommand(interaction.user.id, 'give');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'gamble',
    description: 'Gamble your coins',
    category: 'Economy',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your coins')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Amount to gamble')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const amount = interaction.options.getInteger('amount');
        
        if (userMgr.getBalance(interaction.user.id) < amount) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Insufficient Funds', "You don't have enough coins!")],
                ephemeral: true
            });
        }
        
        const roll = random(1, 100);
        const winThreshold = 50;
        
        let embed;
        if (roll >= winThreshold) {
            const winnings = Math.floor(amount * 1.5);
            userMgr.addBalance(interaction.user.id, winnings);
            embed = EmbedBuilderHelper.success('You Won!', 
                `Rolled ${roll}. You won ${winnings} coins!`);
        } else {
            userMgr.addBalance(interaction.user.id, -amount);
            embed = EmbedBuilderHelper.error('You Lost', 
                `Rolled ${roll}. You lost ${amount} coins.`);
        }
        
        userMgr.recordCommand(interaction.user.id, 'gamble');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'leaderboard',
    description: 'View the economy leaderboard',
    category: 'Economy',
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the economy leaderboard')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('Leaderboard type')
                .addChoices(
                    { name: 'Balance', value: 'balance' },
                    { name: 'Level', value: 'level' }
                )),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const type = interaction.options.getString('type') || 'balance';
        
        let sorted = Array.from(STORAGE.users.values()).sort((a, b) => {
            return type === 'level' ? b.level - a.level : b.balance - a.balance;
        });
        
        sorted = sorted.slice(0, 10);
        
        const medals = ['🥇', '🥈', '🥉'];
        const leaderboard = sorted.map((u, i) => 
            `${medals[i] || `#${i + 1}`} <@${u.id}> - ${type === 'level' ? `Level ${u.level}` : `${u.balance} coins`}`
        ).join('\n');
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `🏆 ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`,
            color: CONFIG.THEME.GOLD,
            description: leaderboard
        });
        
        userMgr.recordCommand(interaction.user.id, 'leaderboard');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'coinflip',
    description: 'Flip a coin to win or lose',
    category: 'Economy',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin to win or lose')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Amount to bet')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('side')
                .setDescription('Heads or tails')
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const amount = interaction.options.getInteger('amount');
        const side = interaction.options.getString('side') || 'heads';
        
        if (userMgr.getBalance(interaction.user.id) < amount) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Insufficient Funds', "You don't have enough coins!")],
                ephemeral: true
            });
        }
        
        const result = random(0, 1) === 0 ? 'heads' : 'tails';
        const won = result === side;
        
        if (won) {
            userMgr.addBalance(interaction.user.id, amount);
        } else {
            userMgr.addBalance(interaction.user.id, -amount);
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🪙 Coin Flip',
            color: won ? CONFIG.THEME.SUCCESS : CONFIG.THEME.ERROR,
            description: `Result: **${result.charAt(0).toUpperCase() + result.slice(1)}**\n` +
                `You ${won ? `won ${amount} coins!` : `lost ${amount} coins.`}`
        });
        
        userMgr.recordCommand(interaction.user.id, 'coinflip');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'dice',
    description: 'Roll dice to win or lose',
    category: 'Economy',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll dice to win or lose')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Amount to bet')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('guess')
                .setDescription('Your guess (1-6)')
                .setMinValue(1)
                .setMaxValue(6)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const amount = interaction.options.getInteger('amount');
        const guess = interaction.options.getInteger('guess') || random(1, 6);
        const result = random(1, 6);
        const won = guess === result;
        
        if (userMgr.getBalance(interaction.user.id) < amount) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Insufficient Funds', "You don't have enough coins!")],
                ephemeral: true
            });
        }
        
        if (won) {
            userMgr.addBalance(interaction.user.id, amount * 3);
        } else {
            userMgr.addBalance(interaction.user.id, -amount);
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎲 Dice Roll',
            color: won ? CONFIG.THEME.SUCCESS : CONFIG.THEME.ERROR,
            fields: [
                { name: 'Your Guess', value: guess.toString(), inline: true },
                { name: 'Result', value: result.toString(), inline: true },
                { name: 'Outcome', value: won ? `Won ${amount * 3} coins!` : `Lost ${amount} coins`, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'dice');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'slots',
    description: 'Play the slot machine',
    category: 'Economy',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Amount to bet')
                .setMinValue(1)
                .setMaxValue(10000)
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const amount = interaction.options.getInteger('amount');
        
        if (userMgr.getBalance(interaction.user.id) < amount) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Insufficient Funds', "You don't have enough coins!")],
                ephemeral: true
            });
        }
        
        const emojis = ['🍎', '🍊', '🍋', '🍇', '💎', '7️⃣'];
        const slot1 = emojis[random(0, emojis.length - 1)];
        const slot2 = emojis[random(0, emojis.length - 1)];
        const slot3 = emojis[random(0, emojis.length - 1)];
        
        let multiplier = 0;
        if (slot1 === slot2 && slot2 === slot3) {
            multiplier = slot1 === '💎' ? 10 : slot1 === '7️⃣' ? 7 : 5;
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            multiplier = 2;
        }
        
        const winnings = amount * multiplier;
        if (multiplier > 0) {
            userMgr.addBalance(interaction.user.id, winnings);
        } else {
            userMgr.addBalance(interaction.user.id, -amount);
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎰 Slot Machine',
            color: multiplier > 0 ? CONFIG.THEME.SUCCESS : CONFIG.THEME.ERROR,
            description: `|\`${slot1}\`|\`${slot2}\`|\`${slot3}\`|\n\n` +
                (multiplier > 0 ? `**${multiplier}x multiplier! You won ${winnings} coins!**` : `No match. You lost ${amount} coins.`)
        });
        
        userMgr.recordCommand(interaction.user.id, 'slots');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'rob',
    description: 'Attempt to rob another user',
    category: 'Economy',
    cooldown: 60,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempt to rob another user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to rob')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user');
        
        if (target.id === interaction.user.id) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Error', "You can't rob yourself!")],
                ephemeral: true
            });
        }
        
        const targetBalance = userMgr.getBalance(target.id);
        if (targetBalance < 100) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Error', "That user doesn't have enough coins!")],
                ephemeral: true
            });
        }
        
        const success = random(1, 100) > 70;
        
        if (success) {
            const stolen = Math.floor(targetBalance * 0.2);
            userMgr.addBalance(target.id, -stolen);
            userMgr.addBalance(interaction.user.id, stolen);
            
            const embed = EmbedBuilderHelper.success('Success!', 
                `You stole ${stolen} coins from ${target.tag}!`);
            userMgr.recordCommand(interaction.user.id, 'rob');
            return interaction.reply({ embeds: [embed] });
        } else {
            const fine = Math.floor(userMgr.getBalance(interaction.user.id) * 0.1);
            userMgr.addBalance(interaction.user.id, -fine);
            
            const embed = EmbedBuilderHelper.error('Failed', 
                `You got caught! You lost ${fine} coins.`);
            userMgr.recordCommand(interaction.user.id, 'rob');
            return interaction.reply({ embeds: [embed] });
        }
    }
});

// ==================== FUN ====================

commandRegistry.register({
    name: '8ball',
    description: 'Ask the magic 8-ball a question',
    category: 'Fun',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(opt =>
            opt.setName('question')
                .setDescription('Your question')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const responses = [
            'It is certain.', 'It is decidedly so.', 'Without a doubt.',
            'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.',
            'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
            'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
            'Cannot predict now.', 'Concentrate and ask again.',
            'Do not count on it.', 'My reply is no.', 'My sources say no.',
            'Outlook not so good.', 'Very doubtful.'
        ];
        
        const response = responses[random(0, responses.length - 1)];
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎱 Magic 8-Ball',
            color: CONFIG.THEME.INFO,
            description: response
        });
        
        userMgr.recordCommand(interaction.user.id, '8ball');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'roll',
    description: 'Roll a dice or generate a random number',
    category: 'Fun',
    cooldown: 2,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll a dice or generate a random number')
        .addIntegerOption(opt =>
            opt.setName('max')
                .setDescription('Maximum number')
                .setMinValue(1)
                .setMaxValue(1000000)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const max = interaction.options.getInteger('max') || 6;
        const result = random(1, max);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎲 Roll',
            color: CONFIG.THEME.SUCCESS,
            description: `You rolled a **${result}** (1-${max})`
        });
        
        userMgr.recordCommand(interaction.user.id, 'roll');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'choices',
    description: 'Pick from multiple choices',
    category: 'Fun',
    cooldown: 2,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('choices')
        .setDescription('Pick from multiple choices')
        .addStringOption(opt =>
            opt.setName('options')
                .setDescription('Comma-separated options')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const options = interaction.options.getString('options').split(',').map(o => o.trim());
        const choice = options[random(0, options.length - 1)];
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎯 Random Choice',
            color: CONFIG.THEME.SUCCESS,
            description: `I choose: **${choice}**`
        });
        
        userMgr.recordCommand(interaction.user.id, 'choices');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'rate',
    description: 'Rate something',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('rate')
        .setDescription('Rate something')
        .addStringOption(opt =>
            opt.setName('thing')
                .setDescription('The thing to rate')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const thing = interaction.options.getString('thing');
        const rating = random(1, 10);
        const stars = '⭐'.repeat(rating);
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `I rate "${thing}"`,
            color: CONFIG.THEME.INFO,
            description: `${rating}/10 ${stars}`
        });
        
        userMgr.recordCommand(interaction.user.id, 'rate');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'love',
    description: 'Calculate love percentage',
    category: 'Fun',
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('love')
        .setDescription('Calculate love percentage')
        .addUserOption(opt =>
            opt.setName('user1')
                .setDescription('First person')
                .setRequired(true))
        .addUserOption(opt =>
            opt.setName('user2')
                .setDescription('Second person')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const user1 = interaction.options.getUser('user1');
        const user2 = interaction.options.getUser('user2');
        
        const percentage = random(1, 100);
        const hearts = '❤️'.repeat(Math.floor(percentage / 10));
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '💕 Love Calculator',
            color: CONFIG.THEME.GRADIENT_END,
            description: `**${user1.tag}** ❤️ **${user2.tag}**\n\n` +
                `Love: ${percentage}%\n${hearts}`
        });
        
        userMgr.recordCommand(interaction.user.id, 'love');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'meme',
    description: 'Get a random meme',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const memeTemplates = [
            { top: 'When the code works on first try', bottom: 'Impossible', image: 'https://i.imgflip.com/1g8my4.jpg' },
            { top: 'When you find a bug', bottom: 'Its a feature', image: 'https://i.imgflip.com/1bij.jpg' },
            { top: 'Me explaining to my boss', bottom: 'Why I need another coffee', image: 'https://i.imgflip.com/30b1gx.jpg' },
            { top: 'Code without comments', bottom: 'Code with comments', image: 'https://i.imgflip.com/2/4t0m5.jpg' },
            { top: 'Me coding at 3 AM', bottom: 'Sleep is for the weak', image: 'https://i.imgflip.com/261o3j.jpg' }
        ];
        
        const meme = memeTemplates[random(0, memeTemplates.length - 1)];
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎭 Random Meme',
            color: CONFIG.THEME.INFO,
            image: { url: meme.image },
            footer: { text: `${meme.top} | ${meme.bottom}` }
        });
        
        userMgr.recordCommand(interaction.user.id, 'meme');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'joke',
    description: 'Tell a random joke',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Tell a random joke'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const jokes = [
            'Why do programmers prefer dark mode? Because light attracts bugs!',
            'Why did the Java developer wear glasses? Because he could not C#!',
            'There are only 10 types of people in the world: those who understand binary and those who do not.',
            'A SQL query walks into a bar, walks up to two tables and asks, "Can I join you?"',
            'Why do programmers always mix up Christmas and Halloween? Because Oct 31 == Dec 25!',
            'How many programmers does it take to change a light bulb? None, that is a hardware problem.',
            'Why was the JavaScript developer sad? Because he did not Node how to Express himself.',
            'What is a programmer favorite hangout place? Foo Bar!',
            'Why did the Python developer need a break? Because he needed to decompress!',
            'How does a programmer ask for money? "Can I have some cache?"'
        ];
        
        const joke = jokes[random(0, jokes.length - 1)];
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '😂 Joke',
            color: CONFIG.THEME.INFO,
            description: joke
        });
        
        userMgr.recordCommand(interaction.user.id, 'joke');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'fact',
    description: 'Get a random fact',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('fact')
        .setDescription('Get a random fact'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const facts = [
            'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.',
            'The first computer programmer was Ada Lovelace, who wrote algorithms for Charles Babbage Analytical Engine in the 1840s.',
            'The average person spends 6 months of their lifetime waiting for red lights to turn green.',
            'Bananas are berries, but strawberries are not.',
            'The first website ever created is still online: info.cern.ch.',
            'A cloud can weigh more than a million pounds.',
            'The shortest war in history lasted only 38 to 45 minutes between Britain and Zanzibar.',
            'Octopuses have three hearts and blue blood.',
            'The average person will spend six months of their life waiting at red lights.',
            'A group of flamingos is called a "flamboyance."'
        ];
        
        const fact = facts[random(0, facts.length - 1)];
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '📚 Fun Fact',
            color: CONFIG.THEME.INFO,
            description: fact
        });
        
        userMgr.recordCommand(interaction.user.id, 'fact');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'quote',
    description: 'Get an inspirational quote',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get an inspirational quote'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const quotes = [
            { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
            { text: 'Code is like humor. When you have to explain it, it is bad.', author: 'Cory House' },
            { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
            { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
            { text: 'Java is to JavaScript what car is to Carpet.', author: 'Chris Heilmann' },
            { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
            { text: 'Before software can be reusable it first has to be usable.', author: 'Ralph Johnson' },
            { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
            { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
            { text: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs' }
        ];
        
        const quote = quotes[random(0, quotes.length - 1)];
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '💡 Quote',
            color: CONFIG.THEME.INFO,
            description: `"${quote.text}"\n\n— ${quote.author}`
        });
        
        userMgr.recordCommand(interaction.user.id, 'quote');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'rps',
    description: 'Play rock paper scissors',
    category: 'Fun',
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play rock paper scissors')
        .addStringOption(opt =>
            opt.setName('choice')
                .setDescription('Your choice')
                .setRequired(true)
                .addChoices(
                    { name: 'Rock 🪨', value: 'rock' },
                    { name: 'Paper 📄', value: 'paper' },
                    { name: 'Scissors ✂️', value: 'scissors' }
                )),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const userChoice = interaction.options.getString('choice');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[random(0, choices.length - 1)];
        
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        
        let result;
        if (userChoice === botChoice) {
            result = "It's a tie!";
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = 'You win!';
        } else {
            result = 'You lose!';
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎮 Rock Paper Scissors',
            color: result.includes('win') ? CONFIG.THEME.SUCCESS : result.includes('lose') ? CONFIG.THEME.ERROR : CONFIG.THEME.WARNING,
            fields: [
                { name: 'Your Choice', value: emojis[userChoice], inline: true },
                { name: 'Bot Choice', value: emojis[botChoice], inline: true },
                { name: 'Result', value: result, inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'rps');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'trivia',
    description: 'Answer a trivia question',
    category: 'Fun',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Answer a trivia question'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const triviaQuestions = [
            { question: 'What is the capital of France?', answer: 'Paris', options: ['London', 'Paris', 'Berlin', 'Madrid'] },
            { question: 'What is 2 + 2?', answer: '4', options: ['3', '4', '5', '6'] },
            { question: 'Who wrote "Romeo and Juliet"?', answer: 'Shakespeare', options: ['Hemingway', 'Twain', 'Shakespeare', 'Austen'] },
            { question: 'What planet is known as the Red Planet?', answer: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
            { question: 'What is the largest ocean on Earth?', answer: 'Pacific', options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'] }
        ];
        
        const trivia = triviaQuestions[random(0, triviaQuestions.length - 1)];
        
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`trivia_${interaction.user.id}`)
                .setPlaceholder('Select your answer')
                .addOptions(trivia.options.map(o => ({
                    label: o,
                    value: o
                })))
        );
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🧠 Trivia',
            color: CONFIG.THEME.INFO,
            description: `**${trivia.question}**`
        });
        
        userMgr.recordCommand(interaction.user.id, 'trivia');
        return interaction.reply({ embeds: [embed], components: [row] });
    }
});

// ==================== SYSTEMS ====================

commandRegistry.register({
    name: 'level',
    description: 'Check your level and XP',
    category: 'Systems',
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your level and XP')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Check another user level')),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const target = interaction.options.getUser('user') || interaction.user;
        const userData = userMgr.getUser(target.id);
        const xpNeeded = Math.floor(100 * Math.pow(1.5, userData.level - 1));
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `⭐ ${target.tag}'s Level`,
            color: CONFIG.THEME.GOLD,
            fields: [
                { name: 'Level', value: userData.level.toString(), inline: true },
                { name: 'XP', value: `${userData.xp}/${xpNeeded}`, inline: true },
                { name: 'Messages', value: userData.messages.toString(), inline: true }
            ]
        });
        
        userMgr.recordCommand(interaction.user.id, 'level');
        return interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'ticket',
    description: 'Create a support ticket',
    category: 'Systems',
    cooldown: 30,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Create a support ticket')
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the ticket')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const reason = interaction.options.getString('reason');
        const guild = guildMgr.getGuild(interaction.guildId);
        
        if (!guild.ticketChannel) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Not Configured', 'Ticket channel not set up. Ask an admin to configure it.')],
                ephemeral: true
            });
        }
        
        const ticketChannel = interaction.guild.channels.cache.get(guild.ticketChannel);
        if (!ticketChannel) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Error', 'Ticket channel not found.')],
                ephemeral: true
            });
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '🎫 New Ticket',
            color: CONFIG.THEME.INFO,
            fields: [
                { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Time', value: formatDate(new Date()), inline: false }
            ]
        });
        
        await ticketChannel.send({ embeds: [embed] });
        
        const successEmbed = EmbedBuilderHelper.success('Ticket Created', 'Your ticket has been submitted.');
        userMgr.recordCommand(interaction.user.id, 'ticket');
        return interaction.reply({ embeds: [successEmbed] });
    }
});

commandRegistry.register({
    name: 'poll',
    description: 'Create a poll',
    category: 'Systems',
    cooldown: 60,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll')
        .addStringOption(opt =>
            opt.setName('question')
                .setDescription('The poll question')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('options')
                .setDescription('Comma-separated options')
                .setRequired(true)),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const question = interaction.options.getString('question');
        const options = interaction.options.getString('options').split(',').map(o => o.trim());
        
        if (options.length > 10 || options.length < 2) {
            return interaction.reply({
                embeds: [EmbedBuilderHelper.error('Error', 'Please provide 2-10 options.')],
                ephemeral: true
            });
        }
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: `📊 ${question}`,
            color: CONFIG.THEME.INFO,
            description: options.map((o, i) => `${i + 1}. ${o}`).join('\n')
        });
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        for (let i = 0; i < options.length; i++) {
            await message.react(emojis[i]);
        }
        
        userMgr.recordCommand(interaction.user.id, 'poll');
    }
});

commandRegistry.register({
    name: 'verify',
    description: 'Verify yourself (requires setup)',
    category: 'Systems',
    cooldown: 300,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify yourself'),
    
    async execute(interaction, aiManager, guildMgr, userMgr) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_user')
                .setLabel('✅ Verify')
                .setStyle(ButtonStyle.Success)
        );
        
        const embed = EmbedBuilderHelper.createEmbed({
            title: '✅ Verification',
            color: CONFIG.THEME.SUCCESS,
            description: 'Click the button below to verify yourself and gain access to the server.'
        });
        
        userMgr.recordCommand(interaction.user.id, 'verify');
        return interaction.reply({ embeds: [embed], components: [row] });
    }
});

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    presence: {
        status: PresenceUpdateStatus.Online,
        activities: [{
            name: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}`,
            type: ActivityType.Watching
        }]
    }
});

const aiManagement = new AIManager();
const userManagement = new UserManager();
const guildManagement = new GuildManager();
const cooldownManager = new CooldownManager();
const rateLimitManager = new RateLimitManager();

// ============================================================================
// EVENT HANDLERS
// ============================================================================

client.once(Events.ClientReady, async () => {
    console.log(`✅ ${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION} is online!`);
    console.log(`Logged in as ${client.user.tag}`);
    
    await STORAGE.loadFromFile();
    
    // Register commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commands = commandRegistry.getSlashCommands();
    
    try {
        console.log('📝 Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ Successfully registered ${commands.length} commands!`);
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = commandRegistry.get(interaction.commandName);
    if (!command) return;
    
    // Check cooldown
    const cooldown = cooldownManager.get(interaction.user.id, command.name);
    if (cooldown.onCooldown) {
        return interaction.reply({
            embeds: [EmbedBuilderHelper.warning('Cooldown', `Please wait ${cooldown.remaining} seconds before using this command again.`)],
            ephemeral: true
        });
    }
    
    // Set cooldown
    if (command.cooldown > 0) {
        cooldownManager.set(interaction.user.id, command.name, command.cooldown * 1000);
    }
    
    // Execute command
    try {
        await command.execute(interaction, aiManagement, guildManagement, userManagement);
    } catch (error) {
        console.error(`Error executing ${command.name}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [EmbedBuilderHelper.error('Command Error', 'An error occurred while executing this command.')],
                ephemeral: true
            });
        } else if (interaction.deferred) {
            await interaction.editReply({
                embeds: [EmbedBuilderHelper.error('Command Error', 'An error occurred while executing this command.')]
            });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    // Track user activity
    const userData = userManagement.getUser(message.author.id);
    userData.messages++;
    
    // XP system
    const xpResult = userManagement.addXP(message.author.id, random(5, 15));
    if (xpResult.leveledUp) {
        const embed = EmbedBuilderHelper.success('Level Up!', 
            `🎉 ${message.author.tag} leveled up to ${xpResult.newLevel}!`);
        message.channel.send({ embeds: [embed] });
    }
    
    // AI channel handler
    const guild = guildManagement.getGuild(message.guildId);
    if (guild.aiChannel && message.channel.id === guild.aiChannel) {
        try {
            await message.channel.sendTyping();
            const result = await aiManagement.generate(message.content);
            const response = result.response.text();
            
            const embed = EmbedBuilderHelper.createEmbed({
                title: '🤖 AI Response',
                color: CONFIG.THEME.INFO,
                description: response.length > 4000 ? response.substring(0, 4000) + '...' : response
            });
            
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('AI response error:', error);
        }
    }
});

// ============================================================================
// START BOT
// ============================================================================

client.login(process.env.DISCORD_TOKEN);

// Auto-save data every minute
setInterval(async () => {
    await STORAGE.saveToFile();
}, 60000);

// Cleanup old cooldowns every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of cooldownManager.cooldowns.entries()) {
        if (now > expiry) {
            cooldownManager.cooldowns.delete(key);
        }
    }
}, 300000);
