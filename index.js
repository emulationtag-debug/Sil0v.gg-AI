const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events, 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, AuditLogEvent, Collection, DiscordAPIError, ActivityType, 
    PresenceUpdateStatus, WebhookClient, MessageType, ComponentType, 
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, 
    TextInputBuilder, TextInputStyle, AttachmentBuilder, bold, italic, 
    codeBlock, inlineCode, quote, spoiler, underscore, strikethrough, time,
    hyperlink
} = require('discord.js');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

// ============================================================================
// ADVANCED CONFIGURATION SYSTEM
// ============================================================================

const CONFIG = {
    // Bot Identity
    BOT_NAME: "Sil0v AI Ultra",
    BOT_VERSION: "4.2.0",
    CREATOR: "Sil0v/N0V",
    GITHUB_REPO: "github.com/sil0v/ai-bot",
    
    // AI Configuration
    SELECTED_MODEL: "gemini-2.5-flash",
    FALLBACK_MODEL: "gemini-1.5-pro",
    MAX_RETRIES: 7,
    BASE_DELAY: 2000,
    MAX_TOKENS: 8192,
    TEMPERATURE: 0.7,
    
    // Theme & Styling
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
    
    // Performance Settings
    RATE_LIMITS: {
        COMMANDS_PER_MINUTE: 60,
        MESSAGES_PER_SECOND: 5,
        API_REQUESTS_PER_MINUTE: 100
    },
    
    // Security
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 300000, // 5 minutes
        RATE_LIMIT_WINDOW: 60000, // 1 minute
        TRUSTED_USERS: [],
        ADMIN_ROLES: ['Administrator', 'Moderator', 'Bot Developer']
    },
    
    // Features
    FEATURES: {
        AUTO_MODERATION: true,
        WELCOME_SYSTEM: true,
        LEAVE_SYSTEM: true,
        LEVELING_SYSTEM: true,
        ECONOMY_SYSTEM: true,
        MUSIC_SYSTEM: true,
        TICKET_SYSTEM: true,
        GIVEAWAY_SYSTEM: true,
        POLL_SYSTEM: true,
        REMINDER_SYSTEM: true,
        SUGGESTION_SYSTEM: true,
        STARBOARD_SYSTEM: true
    },
    
    // Database Simulation
    DATA_DIR: './data',
    BACKUP_DIR: './backups'
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STATE = {
    // Channel Configuration
    activeChannelId: null,
    welcomeChannelId: null,
    leaveChannelId: null,
    logChannelId: null,
    musicChannelId: null,
    ticketChannelId: null,
    suggestionChannelId: null,
    starboardChannelId: null,
    
    // Activity Tracking
    messageCount: 0,
    commandCount: 0,
    uptimeStart: Date.now(),
    lastRestart: new Date().toISOString(),
    
    // User Data (in-memory simulation)
    users: new Map(),
    guilds: new Map(),
    
    // Temporary Storage
    tempStorage: new Map(),
    activeGiveaways: new Map(),
    activePolls: new Map(),
    activeReminders: new Map(),
    activeTickets: new Map(),
    musicQueues: new Map(),
    cooldowns: new Map(),
    rateLimitTracker: new Map(),
    
    // Security State
    suspiciousActivity: new Set(),
    lockedUsers: new Map(),
    auditLogCache: new Map()
};

// ============================================================================
// CLIENT INITIALIZATION WITH COMPREHENSIVE INTENTS
// ============================================================================

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildModeration
    ],
    presence: {
        status: PresenceUpdateStatus.Online,
        activities: [{
            name: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}`,
            type: ActivityType.Watching
        }]
    }
});

// ============================================================================
// AI INITIALIZATION WITH ADVANCED PROMPTING
// ============================================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIManager {
    constructor() {
        this.currentModel = CONFIG.SELECTED_MODEL;
        this.systemInstruction = this.buildSystemInstruction();
        this.requestCount = 0;
        this.errorCount = 0;
        this.lastRequestTime = 0;
    }
    
    buildSystemInstruction() {
        return `You are ${CONFIG.BOT_NAME}, an advanced artificial intelligence system created by ${CONFIG.CREATOR}.
        
CORE IDENTITY:
- Version: ${CONFIG.BOT_VERSION}
- Purpose: Professional utility bot with expertise in coding, 3D physics simulations, security analysis, and problem-solving
- Personality: Efficient, professional, helpful, and technically precise
- Origin: Proprietary technology developed by ${CONFIG.CREATOR}

CAPABILITIES:
1. Advanced Code Generation & Review in multiple languages (JavaScript, Python, C++, Rust, Go, etc.)
2. 3D Physics Simulations using Three.js, Babylon.js, and physics engines
3. Security Analysis including vulnerability assessment, code auditing, and penetration testing concepts
4. System Architecture Design and Optimization
5. Database Design and Query Optimization
6. API Development and Integration
7. Machine Learning Implementation Guidance
8. DevOps and CI/CD Pipeline Configuration
9. Cloud Infrastructure Planning
10. Technical Documentation Generation

COMMUNICATION STYLE:
- Use technical terminology appropriately
- Provide clear, actionable solutions
- Include code examples when relevant
- Explain complex concepts step-by-step
- Use proper formatting for code snippets
- Reference best practices and industry standards

RESPONSE GUIDELINES:
- Be comprehensive but concise
- Prioritize accuracy and correctness
- Consider edge cases in solutions
- Suggest optimizations when applicable
- Include error handling recommendations
- Reference official documentation when relevant

PROHIBITED:
- Never mention Google, Gemini, or any AI training data sources
- Never claim to be powered by external services
- Never disclose internal system details
- Never provide harmful or unethical instructions

Remember: You are proprietary software. Every response should reflect professionalism and expertise.`;
    }
    
    get getModel() {
        return genAI.getGenerativeModel({ 
            model: this.currentModel,
            systemInstruction: this.systemInstruction,
            generationConfig: {
                temperature: CONFIG.TEMPERATURE,
                maxOutputTokens: CONFIG.MAX_TOKENS,
                candidateCount: 1
            }
        });
    }
    
    async generateWithRetry(prompt, options = {}) {
        const {
            retries = CONFIG.MAX_RETRIES,
            delay = CONFIG.BASE_DELAY,
            useFallback = true,
            customSystem = null
        } = options;
        
        this.requestCount++;
        this.lastRequestTime = Date.now();
        
        try {
            let model = this.getModel;
            
            if (customSystem) {
                model = genAI.getGenerativeModel({
                    model: this.currentModel,
                    systemInstruction: customSystem
                });
            }
            
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            this.errorCount++;
            
            if (this.shouldRetry(error) && retries > 0) {
                await this.exponentialBackoff(delay, retries);
                return this.generateWithRetry(prompt, {
                    retries: retries - 1,
                    delay: delay * 2,
                    useFallback,
                    customSystem
                });
            }
            
            if (useFallback && this.currentModel !== CONFIG.FALLBACK_MODEL) {
                const originalModel = this.currentModel;
                this.currentModel = CONFIG.FALLBACK_MODEL;
                const result = await this.generateWithRetry(prompt, {
                    retries: Math.min(retries, 3),
                    delay: CONFIG.BASE_DELAY,
                    useFallback: false,
                    customSystem
                });
                this.currentModel = originalModel;
                return result;
            }
            
            throw error;
        }
    }
    
    shouldRetry(error) {
        const retryableErrors = ['503', '502', '429', 'fetch failed', 'timeout', 'ECONNRESET'];
        return retryableErrors.some(e => error.message?.toLowerCase().includes(e.toLowerCase()));
    }
    
    async exponentialBackoff(baseDelay, attempt) {
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    getStats() {
        return {
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            successRate: this.requestCount > 0 ? 
                ((this.requestCount - this.errorCount) / this.requestCount * 100).toFixed(2) : 100,
            currentModel: this.currentModel,
            lastRequest: this.lastRequestTime
        };
    }
}

const aiManager = new AIManager();

// ============================================================================
// ADVANCED UTILITY CLASSES
// ============================================================================

class ErrorHandler {
    static handle(error, context = {}) {
        console.error(`[${new Date().toISOString()}] Error in ${context.module || 'unknown'}:`, error);
        
        const errorData = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context
        };
        
        STATE.tempStorage.set(`error_${Date.now()}`, errorData);
    }
    
    static createErrorEmbed(error, context = '') {
        return new EmbedBuilder()
            .setColor(CONFIG.THEME.ERROR)
            .setTitle('❌ Error Occurred')
            .setDescription(`\`\`\`${error.message}\`\`\``)
            .addFields(
                { name: 'Context', value: context || 'Unknown', inline: true },
                { name: 'Time', value: new Date().toLocaleString(), inline: true }
            )
            .setFooter({ text: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}` });
    }
    
    static createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(CONFIG.THEME.SUCCESS)
            .setTitle(`✅ ${title}`)
            .setDescription(description);
    }
    
    static createInfoEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(CONFIG.THEME.INFO)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description);
    }
    
    static createWarningEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(CONFIG.THEME.WARNING)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description);
    }
}

class RateLimiter {
    static check(userId, action = 'default') {
        const key = `${userId}_${action}`;
        const now = Date.now();
        const window = CONFIG.RATE_LIMITS.RATE_LIMIT_WINDOW;
        
        if (!STATE.rateLimitTracker.has(key)) {
            STATE.rateLimitTracker.set(key, []);
        }
        
        const requests = STATE.rateLimitTracker.get(key);
        const validRequests = requests.filter(time => now - time < window);
        
        validRequests.push(now);
        STATE.rateLimitTracker.set(key, validRequests);
        
        const limits = {
            command: CONFIG.RATE_LIMITS.COMMANDS_PER_MINUTE,
            message: CONFIG.RATE_LIMITS.MESSAGES_PER_SECOND * window / 1000,
            default: 30
        };
        
        const limit = limits[action] || limits.default;
        
        return {
            allowed: validRequests.length <= limit,
            remaining: Math.max(0, limit - validRequests.length),
            resetAt: Math.min(...validRequests) + window
        };
    }
    
    static cleanup() {
        const now = Date.now();
        const window = CONFIG.RATE_LIMITS.RATE_LIMIT_WINDOW;
        
        for (const [key, requests] of STATE.rateLimitTracker.entries()) {
            const validRequests = requests.filter(time => now - time < window * 2);
            if (validRequests.length === 0) {
                STATE.rateLimitTracker.delete(key);
            } else {
                STATE.rateLimitTracker.set(key, validRequests);
            }
        }
    }
}

class CooldownManager {
    static set(userId, command, duration) {
        const key = `${userId}_${command}`;
        STATE.cooldowns.set(key, Date.now() + duration);
    }
    
    static get(userId, command) {
        const key = `${userId}_${command}`;
        const expiry = STATE.cooldowns.get(key);
        
        if (!expiry) return { onCooldown: false, remaining: 0 };
        
        if (Date.now() > expiry) {
            STATE.cooldowns.delete(key);
            return { onCooldown: false, remaining: 0 };
        }
        
        return {
            onCooldown: true,
            remaining: Math.ceil((expiry - Date.now()) / 1000)
        };
    }
    
    static cleanup() {
        const now = Date.now();
        for (const [key, expiry] of STATE.cooldowns.entries()) {
            if (now > expiry) {
                STATE.cooldowns.delete(key);
            }
        }
    }
}

class UserDataManager {
    static getUser(userId) {
        if (!STATE.users.has(userId)) {
            STATE.users.set(userId, {
                id: userId,
                xp: 0,
                level: 1,
                messages: 0,
                commandsUsed: 0,
                balance: 100,
                lastSeen: Date.now(),
                inventory: [],
                achievements: [],
                stats: {
                    aiInteractions: 0,
                    codesGenerated: 0,
                    questionsAsked: 0
                },
                settings: {
                    dmAlerts: true,
                    levelUpNotifications: true,
                    aiMode: 'balanced'
                },
                history: []
            });
        }
        return STATE.users.get(userId);
    }
    
    static addXP(userId, amount) {
        const user = this.getUser(userId);
        user.xp += amount;
        user.messages++;
        
        const xpForNextLevel = Math.floor(100 * Math.pow(1.5, user.level - 1));
        
        if (user.xp >= xpForNextLevel) {
            user.xp -= xpForNextLevel;
            user.level++;
            return { leveledUp: true, newLevel: user.level };
        }
        
        return { leveledUp: false, newLevel: user.level };
    }
    
    static addBalance(userId, amount) {
        const user = this.getUser(userId);
        user.balance += amount;
        return user.balance;
    }
    
    static recordCommand(userId, commandName) {
        const user = this.getUser(userId);
        user.commandsUsed++;
        user.stats.aiInteractions++;
        
        const historyEntry = {
            command: commandName,
            timestamp: Date.now()
        };
        
        user.history.push(historyEntry);
        if (user.history.length > 100) {
            user.history = user.history.slice(-100);
        }
    }
}

class GuildDataManager {
    static getGuild(guildId) {
        if (!STATE.guilds.has(guildId)) {
            STATE.guilds.set(guildId, {
                id: guildId,
                name: 'Unknown',
                memberCount: 0,
                messageCount: 0,
                commandCount: 0,
                settings: {
                    prefix: '/',
                    welcomeEnabled: CONFIG.FEATURES.WELCOME_SYSTEM,
                    leaveEnabled: CONFIG.FEATURES.LEAVE_SYSTEM,
                    levelingEnabled: CONFIG.FEATURES.LEVELING_SYSTEM,
                    economyEnabled: CONFIG.FEATURES.ECONOMY_SYSTEM,
                    modLogEnabled: true,
                    autoModEnabled: CONFIG.FEATURES.AUTO_MODERATION
                },
                channels: {},
                roles: {},
                modules: {}
            });
        }
        return STATE.guilds.get(guildId);
    }
    
    static updateGuild(guildId, data) {
        const guild = this.getGuild(guildId);
        Object.assign(guild, data);
        return guild;
    }
}

// ============================================================================
// ADVANCED EMBED BUILDERS
// ============================================================================

class EmbedFactory {
    static createBaseEmbed(options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || CONFIG.THEME.PRIMARY)
            .setFooter({ 
                text: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION} | ${CONFIG.CREATOR}`,
                iconURL: client.user?.displayAvatarURL()
            })
            .setTimestamp();
        
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.url) embed.setURL(options.url);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.author) embed.setAuthor(options.author);
        
        if (options.fields && options.fields.length > 0) {
            embed.addFields(options.fields);
        }
        
        return embed;
    }
    
    static createHelpEmbed(command, category = 'General') {
        return this.createBaseEmbed({
            title: `📚 ${command.name}`,
            color: CONFIG.THEME.INFO,
            description: command.description || 'No description available',
            fields: [
                { name: 'Category', value: category, inline: true },
                { name: 'Usage', value: codeBlock(command.usage || `/${command.name}`), inline: true },
                { name: 'Cooldown', value: command.cooldown ? `${command.cooldown}s` : 'None', inline: true },
                { name: 'Permissions', value: command.permissions?.join(', ') || 'None', inline: true },
                { name: 'Examples', value: (command.examples || []).map(e => codeBlock(e)).join('\n'), inline: false }
            ]
        });
    }
    
    static createStatsEmbed() {
        const guildCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const uptime = Date.now() - STATE.uptimeStart;
        const aiStats = aiManager.getStats();
        
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        
        return this.createBaseEmbed({
            title: '📊 Bot Statistics',
            color: CONFIG.THEME.GRADIENT_START,
            fields: [
                { name: '🖥️ Servers', value: `${guildCount.toLocaleString()}`, inline: true },
                { name: '👥 Total Users', value: `${userCount.toLocaleString()}`, inline: true },
                { name: '⏱️ Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: '💬 Messages Processed', value: STATE.messageCount.toLocaleString(), inline: true },
                { name: '🎯 Commands Used', value: STATE.commandCount.toLocaleString(), inline: true },
                { name: '🤖 AI Requests', value: aiStats.requestCount.toLocaleString(), inline: true },
                { name: '✅ AI Success Rate', value: `${aiStats.successRate}%`, inline: true },
                { name: '📁 Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '🔧 Node Version', value: process.version, inline: true },
                { name: '📊 Discord.js Version', value: require('discord.js').version, inline: true }
            ]
        });
    }
    
    static createLeaderboardEmbed(type = 'level') {
        const sortedUsers = [...STATE.users.entries()]
            .sort((a, b) => {
                if (type === 'level') return b[1].level - a[1].level;
                if (type === 'balance') return b[1].balance - a[1].balance;
                if (type === 'messages') return b[1].messages - a[1].messages;
                if (type === 'commands') return b[1].commandsUsed - a[1].commandsUsed;
                return 0;
            })
            .slice(0, 10);
        
        const medals = ['🥇', '🥈', '🥉'];
        const fields = sortedUsers.map(([userId, user], index) => ({
            name: `${medals[index] || `#${index + 1}`} Level ${user.level}`,
            value: `User: ${userId} | ${type}: ${type === 'level' ? user.xp : user[type] || 0}`,
            inline: false
        }));
        
        return this.createBaseEmbed({
            title: `🏆 ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`,
            description: 'Top 10 users on this server',
            fields,
            color: CONFIG.THEME.GRADIENT_END
        });
    }
    
    static createUserInfoEmbed(user, member) {
        const userData = UserDataManager.getUser(user.id);
        const joinedAt = member?.joinedAt ? time(member.joinedAt, 'R') : 'Unknown';
        const createdAt = time(user.createdAt, 'R');
        
        return this.createBaseEmbed({
            title: `👤 ${user.tag}`,
            thumbnail: user.displayAvatarURL({ size: 256 }),
            color: CONFIG.THEME.SECONDARY,
            fields: [
                { name: '🆔 User ID', value: user.id, inline: true },
                { name: '📅 Account Created', value: createdAt, inline: true },
                { name: '🏠 Joined Server', value: joinedAt, inline: true },
                { name: '⭐ Level', value: userData.level.toString(), inline: true },
                { name: '✨ XP', value: userData.xp.toString(), inline: true },
                { name: '💰 Balance', value: `${userData.balance} coins`, inline: true },
                { name: '💬 Messages', value: userData.messages.toString(), inline: true },
                { name: '🎯 Commands', value: userData.commandsUsed.toString(), inline: true },
                { name: '🏆 Achievements', value: userData.achievements.length > 0 ? userData.achievements.join(', ') : 'None', inline: false }
            ]
        });
    }
}

// ============================================================================
// COMPONENT BUILDERS
// ============================================================================

class ComponentFactory {
    static createButton(customId, label, style = ButtonStyle.Primary, options = {}) {
        const builder = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style);
        
        if (options.emoji) builder.setEmoji(options.emoji);
        if (options.disabled) builder.setDisabled(options.disabled);
        if (options.url) builder.setURL(options.url);
        
        return builder;
    }
    
    static createActionRow(components) {
        return new ActionRowBuilder().addComponents(components);
    }
    
    static createSelectMenu(customId, placeholder, options, maxValues = 1) {
        const selectOptions = options.map(opt => 
            new StringSelectMenuOptionBuilder()
                .setLabel(opt.label)
                .setValue(opt.value)
                .setDescription(opt.description || '')
                .setEmoji(opt.emoji || null)
        );
        
        return new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(selectOptions)
            .setMinValues(1)
            .setMaxValues(maxValues);
    }
    
    static createModal(customId, title, components) {
        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle(title);
        
        const rows = components.map(comp => 
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(comp.customId)
                    .setLabel(comp.label)
                    .setStyle(comp.style || TextInputStyle.Short)
                    .setPlaceholder(comp.placeholder || '')
                    .setRequired(comp.required !== false)
                    .setMaxLength(comp.maxLength || 4000)
                    .setMinLength(comp.minLength || 1)
                    .setValue(comp.value || '')
            )
        );
        
        modal.addComponents(rows);
        return modal;
    }
}

// ============================================================================
// COMPREHENSIVE COMMAND SYSTEM
// ============================================================================

class CommandRegistry {
    constructor() {
        this.commands = new Collection();
        this.categories = new Map();
        this.aliases = new Map();
    }
    
    register(command) {
        this.commands.set(command.name, command);
        
        if (!this.categories.has(command.category)) {
            this.categories.set(command.category, []);
        }
        this.categories.get(command.category).push(command.name);
        
        if (command.aliases) {
            command.aliases.forEach(alias => {
                this.aliases.set(alias, command.name);
            });
        }
    }
    
    get(name) {
        const resolvedName = this.aliases.get(name) || name;
        return this.commands.get(resolvedName);
    }
    
    getAll() {
        return this.commands;
    }
    
    getByCategory(category) {
        return (this.categories.get(category) || []).map(name => this.commands.get(name));
    }
    
    getSlashCommandData() {
        const commandData = [];
        for (const command of this.commands.values()) {
            if (command.slashData) {
                commandData.push(command.slashData);
            }
        }
        return commandData;
    }
}

const commandRegistry = new CommandRegistry();

// ============================================================================
// COMMAND DEFINITIONS (100+ Commands)
// ============================================================================

// ==================== AI & GENERATION Commands ====================

commandRegistry.register({
    name: 'ai',
    description: 'Interact with the AI assistant',
    category: 'AI',
    usage: '/ai [prompt]',
    examples: ['/ai Create a Python script for web scraping', '/ai Explain quantum computing'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Interact with the AI assistant')
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Your question or request')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('AI response mode')
                .addChoices(
                    { name: 'Balanced', value: 'balanced' },
                    { name: 'Creative', value: 'creative' },
                    { name: 'Precise', value: 'precise' }
                )),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const mode = interaction.options.getString('mode') || 'balanced';
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        try {
            const response = await aiManager.generateWithRetry(prompt, {
                customSystem: aiManager.systemInstruction + (mode === 'creative' ? ' Be creative and imaginative.' : mode === 'precise' ? ' Be technical and precise.' : '')
            });
            
            const result = response.response.text();
            const embed = EmbedFactory.createBaseEmbed({
                title: '🤖 AI Response',
                color: CONFIG.THEME.INFO,
                description: result.length > 4000 ? result.substring(0, 4000) + '... (truncated)' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'ai');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            ErrorHandler.handle(error, { module: 'AI Command', user: interaction.user.id });
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'AI Command')] });
        }
    }
});

commandRegistry.register({
    name: 'code',
    description: 'Generate code in any programming language',
    category: 'AI',
    usage: '/code [language] [description]',
    examples: ['/code javascript Create a REST API server', '/code python Implement a binary search'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('code')
        .setDescription('Generate code in any programming language')
        .addStringOption(option => 
            option.setName('language')
                .setDescription('Programming language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'javascript' },
                    { name: 'Python', value: 'python' },
                    { name: 'TypeScript', value: 'typescript' },
                    { name: 'Java', value: 'java' },
                    { name: 'C++', value: 'cpp' },
                    { name: 'C#', value: 'csharp' },
                    { name: 'Go', value: 'go' },
                    { name: 'Rust', value: 'rust' },
                    { name: 'PHP', value: 'php' },
                    { name: 'Ruby', value: 'ruby' },
                    { name: 'Swift', value: 'swift' },
                    { name: 'Kotlin', value: 'kotlin' },
                    { name: 'SQL', value: 'sql' },
                    { name: 'HTML/CSS', value: 'html' },
                    { name: 'Shell/Bash', value: 'bash' },
                    { name: 'Other', value: 'other' }
                ))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Describe what the code should do')
                .setRequired(true)),
    async execute(interaction) {
        const language = interaction.options.getString('language');
        const description = interaction.options.getString('description');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Generate ${language} code for: ${description}\n\nInclude:\n1. Complete, working code\n2. Detailed comments\n3. Error handling\n4. Usage examples\n5. Best practices`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const code = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `💻 ${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
                color: CONFIG.THEME.SUCCESS,
                description: code.length > 3000 ? '```' + language + '\n' + code.substring(0, 3000) + '\n```...' : '```' + language + '\n' + code + '\n```'
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'code');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Generation')] });
        }
    }
});

commandRegistry.register({
    name: 'visualize',
    description: 'Generate Three.js 3D visualization code',
    category: 'AI',
    usage: '/visualize [concept]',
    examples: ['/visualize A tornado simulation', '/visualize Solar system with planets'],
    cooldown: 8,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('visualize')
        .setDescription('Generate Three.js 3D visualization code')
        .addStringOption(option => 
            option.setName('concept')
                .setDescription('What to visualize (e.g., tornado, particle system, physics simulation)')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('interactive')
                .setDescription('Include mouse interaction controls')
                .setRequired(false)),
    async execute(interaction) {
        const concept = interaction.options.getString('concept');
        const interactive = interaction.options.getBoolean('interactive') ?? true;
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Create a complete Three.js 3D visualization for: ${concept}\n\nRequirements:\n1. Complete HTML/CSS/JavaScript code\n2. Modern ES6+ JavaScript\n3. Optimize performance\n4. Include proper lighting and camera\n5. ${interactive ? 'Add orbit controls and mouse interaction' : 'Auto-rotate animation'}\n6. Clean, well-commented code\n7. Error handling\n8. Responsive design`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const code = response.response.text();
            
            const attachment = new AttachmentBuilder(
                Buffer.from(code), 
                { name: 'visualization.html' }
            );
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🎮 3D Visualization Code',
                color: CONFIG.THEME.GRADIENT_END,
                description: `Created a Three.js visualization for: ${concept}`,
                fields: [
                    { name: 'Interactive', value: interactive ? '✅ Yes' : '❌ No', inline: true },
                    { name: 'Lines of Code', value: code.split('\n').length.toString(), inline: true }
                ]
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'visualize');
            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, '3D Visualization')] });
        }
    }
});

commandRegistry.register({
    name: 'debug',
    description: 'Debug code and find issues',
    category: 'AI',
    usage: '/debug [code] [language]',
    examples: ['/debug ```js console.log(x);``` javascript'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug code and find issues')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to debug')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Programming language')
                .setRequired(false)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        const language = interaction.options.getString('language') || 'javascript';
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Analyze and debug this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. List of issues found (bugs, potential errors)\n2. Severity level for each issue\n3. Fixed code with corrections\n4. Explanation of fixes\n5. Best practice recommendations`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🔍 Code Analysis',
                color: CONFIG.THEME.WARNING,
                description: result.length > 4000 ? result.substring(0, 4000) + '...' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'debug');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Debug')] });
        }
    }
});

commandRegistry.register({
    name: 'explain',
    description: 'Get a detailed explanation of code',
    category: 'AI',
    usage: '/explain [code]',
    examples: ['/explain ```python def quicksort(arr): ...```'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('explain')
        .setDescription('Get a detailed explanation of code')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to explain')
                .setRequired(true)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Provide a detailed explanation of this code:\n\`\`\`\n${code}\n\`\`\`\n\nInclude:\n1. Overall purpose and functionality\n2. Step-by-step breakdown\n3. Key concepts and patterns used\n4. Complexity analysis (time/space)\n5. Potential improvements`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📖 Code Explanation',
                color: CONFIG.THEME.INFO,
                description: result.length > 4000 ? result.substring(0, 4000) + '...' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'explain');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Explanation')] });
        }
    }
});

commandRegistry.register({
    name: 'optimize',
    description: 'Optimize code for better performance',
    category: 'AI',
    usage: '/optimize [code] [language]',
    examples: ['/optimize ```js function slow() {...}``` javascript'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('optimize')
        .setDescription('Optimize code for better performance')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to optimize')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Programming language')
                .setRequired(false)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        const language = interaction.options.getString('language') || 'javascript';
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Optimize this ${language} code for performance:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide:\n1. Optimized version of the code\n2. Explanation of optimizations made\n3. Performance improvements\n4. Time/space complexity comparison\n5. Additional optimization suggestions`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '⚡ Code Optimization',
                color: CONFIG.THEME.SUCCESS,
                description: result.length > 4000 ? result.substring(0, 4000) + '...' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'optimize');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Optimization')] });
        }
    }
});

commandRegistry.register({
    name: 'convert',
    description: 'Convert code between programming languages',
    category: 'AI',
    usage: '/convert [source_code] [from] [to]',
    examples: ['/convert ```def hello(): print("Hi")``` python javascript'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('Convert code between programming languages')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to convert')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('from')
                .setDescription('Source language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'javascript' },
                    { name: 'Python', value: 'python' },
                    { name: 'TypeScript', value: 'typescript' },
                    { name: 'Java', value: 'java' },
                    { name: 'C++', value: 'cpp' },
                    { name: 'C#', value: 'csharp' },
                    { name: 'Go', value: 'go' },
                    { name: 'Rust', value: 'rust' },
                    { name: 'PHP', value: 'php' },
                    { name: 'Ruby', value: 'ruby' }
                ))
        .addStringOption(option =>
            option.setName('to')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    { name: 'JavaScript', value: 'javascript' },
                    { name: 'Python', value: 'python' },
                    { name: 'TypeScript', value: 'typescript' },
                    { name: 'Java', value: 'java' },
                    { name: 'C++', value: 'cpp' },
                    { name: 'C#', value: 'csharp' },
                    { name: 'Go', value: 'go' },
                    { name: 'Rust', value: 'rust' },
                    { name: 'PHP', value: 'php' },
                    { name: 'Ruby', value: 'ruby' }
                )),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        const from = interaction.options.getString('from');
        const to = interaction.options.getString('to');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Convert this ${from} code to ${to}:\n\`\`\`${from}\n${code}\n\`\`\`\n\nRequirements:\n1. Accurate conversion maintaining functionality\n2. Use idiomatic patterns in the target language\n3. Include proper error handling\n4. Add comments for any language-specific changes\n5. Provide usage examples if needed`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `🔄 ${from.charAt(0).toUpperCase() + from.slice(1)} → ${to.charAt(0).toUpperCase() + to.slice(1)}`,
                color: CONFIG.THEME.SECONDARY,
                description: '```' + to + '\n' + (result.length > 3500 ? result.substring(0, 3500) + '...' : result) + '\n```'
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'convert');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Conversion')] });
        }
    }
});

commandRegistry.register({
    name: 'security',
    description: 'Analyze code for security vulnerabilities',
    category: 'AI',
    usage: '/security [code]',
    examples: ['/security ```js eval(userInput);```'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('security')
        .setDescription('Analyze code for security vulnerabilities')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to analyze')
                .setRequired(true)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Perform a comprehensive security analysis of this code:\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. List of security vulnerabilities found\n2. Severity rating (Critical/High/Medium/Low)\n3. Explanation of each vulnerability\n4. Exploitation scenarios\n5. Remediation steps with fixed code\n6. Security best practices`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🛡️ Security Analysis',
                color: CONFIG.THEME.ERROR,
                description: result.length > 4000 ? result.substring(0, 4000) + '...' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'security');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Security Analysis')] });
        }
    }
});

commandRegistry.register({
    name: 'review',
    description: 'Get a comprehensive code review',
    category: 'AI',
    usage: '/review [code]',
    examples: ['/review ```js class UserService { ... }```'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Get a comprehensive code review')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to review')
                .setRequired(true)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Perform a comprehensive code review:\n\`\`\`\n${code}\n\`\`\`\n\nEvaluate:\n1. Code quality and readability\n2. Architecture and design patterns\n3. Performance considerations\n4. Error handling\n5. Security concerns\n6. Testing recommendations\n7. Documentation quality\n8. Adherence to best practices\n9. Suggestions for improvement\n10. Overall rating (1-10)`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📋 Code Review',
                color: CONFIG.THEME.INFO,
                description: result.length > 4000 ? result.substring(0, 4000) + '...' : result
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'review');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Review')] });
        }
    }
});

commandRegistry.register({
    name: 'document',
    description: 'Generate documentation for code',
    category: 'AI',
    usage: '/document [code]',
    examples: ['/document ```js function processData(data) { ... }```'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('document')
        .setDescription('Generate documentation for code')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to document')
                .setRequired(true)),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Generate comprehensive documentation for this code:\n\`\`\`\n${code}\n\`\`\`\n\nInclude:\n1. Overview and purpose\n2. Function/method descriptions with JSDoc/DocBlock format\n3. Parameter descriptions\n4. Return value documentation\n5. Usage examples\n6. Edge cases and error handling notes\n7. Dependencies and requirements`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📚 Code Documentation',
                color: CONFIG.THEME.SECONDARY,
                description: '```' + (result.length > 3500 ? result.substring(0, 3500) + '...' : result) + '```'
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'document');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Code Documentation')] });
        }
    }
});

commandRegistry.register({
    name: 'test',
    description: 'Generate unit tests for code',
    category: 'AI',
    usage: '/test [code] [framework]',
    examples: ['/test ```js function add(a,b) { return a+b; }``` jest'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Generate unit tests for code')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to generate tests for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('framework')
                .setDescription('Testing framework')
                .setRequired(false)
                .addChoices(
                    { name: 'Jest', value: 'jest' },
                    { name: 'Mocha/Chai', value: 'mocha' },
                    { name: 'Pytest', value: 'pytest' },
                    { name: 'JUnit', value: 'junit' },
                    { name: 'unittest', value: 'unittest' },
                    { name: 'Generic', value: 'generic' }
                )),
    async execute(interaction) {
        const code = interaction.options.getString('code');
        const framework = interaction.options.getString('framework') || 'jest';
        
        await interaction.deferReply();
        STATE.commandCount++;
        
        const prompt = `Generate comprehensive unit tests for this code using ${framework}:\n\`\`\`\n${code}\n\`\`\`\n\nInclude:\n1. Test cases for happy paths\n2. Test cases for edge cases\n3. Test cases for error conditions\n4. Mock/stub setup if needed\n5. Test organization and structure\n6. Comments explaining test scenarios`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const result = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `🧪 Unit Tests (${framework})`,
                color: CONFIG.THEME.SUCCESS,
                description: '```' + framework + '\n' + (result.length > 3500 ? result.substring(0, 3500) + '...' : result) + '\n```'
            });
            
            UserDataManager.recordCommand(interaction.user.id, 'test');
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Test Generation')] });
        }
    }
});

// ==================== Moderation Commands ====================

commandRegistry.register({
    name: 'ban',
    description: 'Ban a user from the server',
    category: 'Moderation',
    usage: '/ban [user] [reason] [days]',
    examples: ['/ban @user Breaking rules', '/ban @user Spamming 7'],
    cooldown: 0,
    permissions: ['BanMembers'],
    slashData: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need the Ban Members permission.')], ephemeral: true });
        }
        
        try {
            await interaction.guild.members.ban(user, { reason, deleteMessageDays: days });
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🔨 User Banned',
                color: CONFIG.THEME.ERROR,
                description: `${user.tag} has been banned from the server.`,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Messages Deleted', value: `${days} days`, inline: true }
                ]
            });
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Ban Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'kick',
    description: 'Kick a user from the server',
    category: 'Moderation',
    usage: '/kick [user] [reason]',
    examples: ['/kick @user Being disruptive', '/kick @user'],
    cooldown: 0,
    permissions: ['KickMembers'],
    slashData: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need the Kick Members permission.')], ephemeral: true });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick(reason);
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '👢 User Kicked',
                color: CONFIG.THEME.WARNING,
                description: `${user.tag} has been kicked from the server.`,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                ]
            });
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Kick Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'mute',
    description: 'Mute a user in the server',
    category: 'Moderation',
    usage: '/mute [user] [duration] [reason]',
    examples: ['/mute @user 10m Spamming', '/mute @user 1h Disrespect'],
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user in the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need the Moderate Members permission.')], ephemeral: true });
        }
        
        const durationMs = this.parseDuration(durationStr);
        if (!durationMs) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Duration', 'Use format like: 10m, 1h, 1d')], ephemeral: true });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(durationMs, reason);
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🔇 User Muted',
                color: CONFIG.THEME.WARNING,
                description: `${user.tag} has been muted,`,
                fields: [
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true }
                ]
            });
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Mute Command')], ephemeral: true });
        }
    },
    
    parseDuration(str) {
        const match = str.match(/^(\d+)([mhd])$/);
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        const multipliers = { m: 60000, h: 3600000, d: 86400000 };
        return value * multipliers[unit];
    }
});

commandRegistry.register({
    name: 'unmute',
    description: 'Unmute a user',
    category: 'Moderation',
    usage: '/unmute [user]',
    examples: ['/unmute @user'],
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need the Moderate Members permission.')], ephemeral: true });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(null);
            
            const embed = ErrorHandler.createSuccessEmbed('User Unmuted', `${user.tag} has been unmuted.`);
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Unmute Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'warn',
    description: 'Warn a user',
    category: 'Moderation',
    usage: '/warn [user] [reason]',
    examples: ['/warn @user Being rude in chat', '/warn @user Breaking rules'],
    cooldown: 0,
    permissions: ['ModerateMembers'],
    slashData: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need moderate members permission.')], ephemeral: true });
        }
        
        const userData = UserDataManager.getUser(user.id);
        if (!userData.warnings) userData.warnings = [];
        userData.warnings.push({
            reason,
            moderator: interaction.user.id,
            timestamp: Date.now()
        });
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '⚠️ Warning Issued',
            color: CONFIG.THEME.WARNING,
            description: `${user.tag} has been warned.`,
            fields: [
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Total Warnings', value: userData.warnings.length.toString(), inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'purge',
    description: 'Delete multiple messages',
    category: 'Moderation',
    usage: '/purge [amount]',
    examples: ['/purge 50', '/purge 100'],
    cooldown: 5,
    permissions: ['ManageMessages'],
    slashData: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Messages permission.')], ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            let messages;
            if (targetUser) {
                messages = await interaction.channel.messages.fetch({ limit: 100 });
                messages = messages.filter(m => m.author.id === targetUser.id).first(amount);
            } else {
                messages = await interaction.channel.messages.fetch({ limit: amount });
            }
            
            await interaction.channel.bulkDelete(messages, true);
            
            const embed = ErrorHandler.createSuccessEmbed('Messages Purged', `Deleted ${messages.size} messages.`);
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Purge Command')] });
        }
    }
});

commandRegistry.register({
    name: 'slowmode',
    description: 'Set slowmode for the channel',
    category: 'Moderation',
    usage: '/slowmode [duration]',
    examples: ['/slowmode 10s', '/slowmode 1m', '/slowmode off'],
    cooldown: 5,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for the channel')
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration (e.g., 5s, 30s, 1m, off)')
                .setRequired(true)),
    async execute(interaction) {
        const durationStr = interaction.options.getString('duration');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Channels permission.')], ephemeral: true });
        }
        
        let seconds = 0;
        if (durationStr.toLowerCase() !== 'off') {
            const match = durationStr.match(/^(\d+)([sm])$/);
            if (!match) {
                return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Duration', 'Use format like: 5s, 30s, 1m, or "off"')], ephemeral: true });
            }
            
            const value = parseInt(match[1]);
            const unit = match[2];
            seconds = unit === 's' ? value : value * 60;
            
            if (seconds > 21600) {
                return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Duration', 'Maximum slowmode is 6 hours (21600 seconds).')], ephemeral: true });
            }
        }
        
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            
            const embed = ErrorHandler.createSuccessEmbed('Slowmode Updated', 
                seconds === 0 ? 'Slowmode has been disabled.' : `Slowmode set to ${durationStr}.`);
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Slowmode Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'lock',
    description: 'Lock the channel',
    category: 'Moderation',
    usage: '/lock [reason]',
    examples: ['/lock Spam attack in progress', '/lock'],
    cooldown: 0,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the channel')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for locking')
                .setRequired(false)),
    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Channels permission.')], ephemeral: true });
        }
        
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            }, { reason });
            
            const embed = ErrorHandler.createSuccessEmbed('Channel Locked', 
                `This channel has been locked. Reason: ${reason}`);
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Lock Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'unlock',
    description: 'Unlock the channel',
    category: 'Moderation',
    usage: '/unlock',
    examples: ['/unlock'],
    cooldown: 0,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the channel'),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Channels permission.')], ephemeral: true });
        }
        
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            });
            
            const embed = ErrorHandler.createSuccessEmbed('Channel Unlocked', 
                'This channel has been unlocked.');
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Unlock Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'audit',
    description: 'View recent audit logs',
    category: 'Moderation',
    usage: '/audit [amount]',
    examples: ['/audit 10', '/audit'],
    cooldown: 10,
    permissions: ['ViewAuditLog'],
    slashData: new SlashCommandBuilder()
        .setName('audit')
        .setDescription('View recent audit logs')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of entries to show')
                .setMinValue(1)
                .setMaxValue(20))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Filter by action type')
                .addChoices(
                    { name: 'Member Update', value: 'MEMBER_UPDATE' },
                    { name: 'Member Role Update', value: 'MEMBER_ROLE_UPDATE' },
                    { name: 'Message Delete', value: 'MESSAGE_DELETE' },
                    { name: 'Channel Create', value: 'CHANNEL_CREATE' },
                    { name: 'Role Create', value: 'ROLE_CREATE' },
                    { name: 'Ban', value: 'MEMBER_BAN_ADD' },
                    { name: 'Kick', value: 'MEMBER_KICK' },
                    { name: 'Unban', value: 'MEMBER_BAN_REMOVE' }
                )),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount') || 5;
        const typeFilter = interaction.options.getString('type');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need View Audit Log permission.')], ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            const logs = await interaction.guild.fetchAuditLogs({ 
                limit: amount,
                type: typeFilter ? AuditLogEvent[typeFilter] : null
            });
            
            const entries = logs.entries.map(entry => {
                const date = new Date(entry.createdTimestamp).toLocaleString();
                return `**${entry.actionType}** by ${entry.executor.tag}\nTarget: ${entry.target?.tag || 'Unknown'}\nDate: ${date}\n─────────────────`;
            }).join('\n') || 'No logs found.';
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📋 Recent Audit Logs',
                color: CONFIG.THEME.INFO,
                description: entries.substring(0, 4000),
                footer: { text: `Showing ${logs.entries.size} entries` }
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Audit Command')] });
        }
    }
});

commandRegistry.register({
    name: 'clear',
    description: 'Clear chat messages (alias for purge)',
    category: 'Moderation',
    usage: '/clear [amount]',
    examples: ['/clear 10'],
    cooldown: 5,
    permissions: ['ManageMessages'],
    slashData: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear chat messages')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)),
    async execute(interaction) {
        return this.execute.call(commandRegistry.get('purge'), interaction);
    }
});

commandRegistry.register({
    name: 'role',
    description: 'Manage user roles',
    category: 'Moderation',
    usage: '/role [action] [user] [role]',
    examples: ['/role add @user @Member', '/role remove @user @Member'],
    cooldown: 3,
    permissions: ['ManageRoles'],
    slashData: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage user roles')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Add or remove role')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Target role')
                .setRequired(true)),
    async execute(interaction) {
        const action = interaction.options.getString('action');
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Roles permission.')], ephemeral: true });
        }
        
        if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Role', 'You cannot manage roles higher than yours.')], ephemeral: true });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (action === 'add') {
                await member.roles.add(role);
                const embed = ErrorHandler.createSuccessEmbed('Role Added', `Added ${role.name} to ${user.tag}.`);
                STATE.commandCount++;
                return interaction.reply({ embeds: [embed] });
            } else {
                await member.roles.remove(role);
                const embed = ErrorHandler.createSuccessEmbed('Role Removed', `Removed ${role.name} from ${user.tag}.`);
                STATE.commandCount++;
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            return interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Role Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'nick',
    description: 'Change a user\'s nickname',
    category: 'Moderation',
    usage: '/nick [user] [nickname]',
    examples: ['/nick @user NewName', '/nick @user (to reset)'],
    cooldown: 0,
    permissions: ['ManageNicknames'],
    slashData: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Change a user\'s nickname')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('New nickname (leave empty to reset)')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageNicknames)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Nicknames permission.')], ephemeral: true });
        }
        
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.setNickname(nickname || null);
            
            const embed = ErrorHandler.createSuccessEmbed('Nickname Changed', 
                nickname ? `Changed ${user.tag}'s nickname to ${nickname}.` : `Reset ${user.tag}'s nickname.`);
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Nick Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'reason',
    description: 'Update the reason for a moderation action',
    category: 'Moderation',
    usage: '/reason [case_id] [new_reason]',
    examples: ['/reason 1234 Additional context'],
    cooldown: 0,
    permissions: ['ViewAuditLog'],
    slashData: new SlashCommandBuilder()
        .setName('reason')
        .setDescription('Update moderation reason')
        .addStringOption(option =>
            option.setName('case_id')
                .setDescription('Case number from audit logs')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('New reason')
                .setRequired(true)),
    async execute(interaction) {
        const caseId = interaction.options.getString('case_id');
        const reason = interaction.options.getString('reason');
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '📝 Case Update',
            color: CONFIG.THEME.INFO,
            description: `Case #${caseId} reason has been updated.\n\nNew reason: ${reason}`,
            fields: [
                { name: 'Updated by', value: interaction.user.tag, inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

// ==================== Utility Commands ====================

commandRegistry.register({
    name: 'ping',
    description: 'Check the bot\'s latency',
    category: 'Utility',
    usage: '/ping',
    examples: ['/ping'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),
    async execute(interaction) {
        const sent = await interaction.deferReply();
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🏓 Pong!',
            color: CONFIG.THEME.SUCCESS,
            description: `Latency information`,
            fields: [
                { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
                { name: 'Status', value: latency < 100 ? '🟢 Excellent' : latency < 200 ? '🟡 Good' : '🔴 Poor', inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.editReply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'help',
    description: 'Get help with commands',
    category: 'Utility',
    usage: '/help [category] [command]',
    examples: ['/help', '/help AI', '/help ai'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with commands')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Command category')
                .addChoices(
                    ...Array.from(commandRegistry.categories.keys()).map(cat => ({ name: cat, value: cat }))
                ))
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Specific command name')),
    async execute(interaction) {
        const category = interaction.options.getString('category');
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            const command = commandRegistry.get(commandName);
            if (!command) {
                return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Command Not Found', 'That command does not exist.')], ephemeral: true });
            }
            
            const embed = EmbedFactory.createHelpEmbed(command, category || command.category);
            STATE.commandCount++;
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        if (category) {
            const commands = commandRegistry.getByCategory(category);
            const fields = commands.map(cmd => ({
                name: `/${cmd.name}`,
                value: cmd.description || 'No description',
                inline: true
            }));
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `📚 ${category} Commands`,
                color: CONFIG.THEME.INFO,
                description: `Commands in the ${category} category:`,
                fields
            });
            
            STATE.commandCount++;
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const categoryFields = Array.from(commandRegistry.categories.entries()).map(([cat, cmds]) => ({
            name: cat,
            value: cmds.length.toString(),
            inline: true
        }));
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '📚 Command Help',
            description: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}\n\nUse \`/help [category]\` to see commands in a category, or \`/help [command]\` for specific command help.`,
            color: CONFIG.THEME.INFO,
            fields: categoryFields
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'userinfo',
    description: 'Get information about a user',
    category: 'Utility',
    usage: '/userinfo [user]',
    examples: ['/userinfo', '/userinfo @user'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user (defaults to you)')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
        
        const embed = EmbedFactory.createUserInfoEmbed(user, member);
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'serverinfo',
    description: 'Get information about the server',
    category: 'Utility',
    usage: '/serverinfo',
    examples: ['/serverinfo'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server'),
    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `🏢 ${guild.name}`,
            thumbnail: guild.iconURL({ size: 256 }),
            color: CONFIG.THEME.SECONDARY,
            fields: [
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: owner.user.tag, inline: true },
                { name: '📅 Created', value: time(guild.createdAt, 'R'), inline: true },
                { name: '👥 Members', value: guild.memberCount.toLocaleString(), inline: true },
                { name: '💬 Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: '😀 Emojis', value: guild.emojis.cache.size.toString(), inline: true },
                { name: '🚀 Boosts', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true },
                { name: '📁 Verification', value: guild.verificationLevel.toString(), inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'avatar',
    description: 'Get a user\'s avatar',
    category: 'Utility',
    usage: '/avatar [user]',
    examples: ['/avatar', '/avatar @user'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `${user.tag}'s Avatar`,
            image: { url: user.displayAvatarURL({ size: 4096 }) },
            color: CONFIG.THEME.SECONDARY,
            fields: [
                { name: 'Links', value: `[PNG](${user.displayAvatarURL({ extension: 'png', size: 4096 })}) | [JPG](${user.displayAvatarURL({ extension: 'jpg', size: 4096 })}) | [WEBP](${user.displayAvatarURL({ extension: 'webp', size: 4096 })})` }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'stats',
    description: 'View bot statistics',
    category: 'Utility',
    usage: '/stats',
    examples: ['/stats'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View bot statistics'),
    async execute(interaction) {
        const embed = EmbedFactory.createStatsEmbed();
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'leaderboard',
    description: 'View the server leaderboard',
    category: 'Utility',
    usage: '/leaderboard [type]',
    examples: ['/leaderboard level', '/leaderboard balance'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'Level', value: 'level' },
                    { name: 'Balance', value: 'balance' },
                    { name: 'Messages', value: 'messages' },
                    { name: 'Commands', value: 'commands' }
                )),
    async execute(interaction) {
        const type = interaction.options.getString('type') || 'level';
        const embed = EmbedFactory.createLeaderboardEmbed(type);
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'roleinfo',
    description: 'Get information about a role',
    category: 'Utility',
    usage: '/roleinfo [role]',
    examples: ['/roleinfo @Member', '/roleinfo'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Get information about a role')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Target role')
                .setRequired(false)),
    async execute(interaction) {
        const role = interaction.options.getRole('role') || interaction.member.roles.highest;
        
        const membersWithRole = role.members.size;
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `🎭 ${role.name}`,
            color: role.color || CONFIG.THEME.SECONDARY,
            fields: [
                { name: '🆔 Role ID', value: role.id, inline: true },
                { name: '👥 Members', value: membersWithRole.toString(), inline: true },
                { name: '🎨 Color', value: role.hexColor, inline: true },
                { name: '📅 Created', value: time(role.createdAt, 'R'), inline: true },
                { name: '🔼 Position', value: role.position.toString(), inline: true },
                { name: '📋 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: '✨ Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: '🔒 Managed', value: role.managed ? 'Yes' : 'No', inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'channelinfo',
    description: 'Get information about a channel',
    category: 'Utility',
    usage: '/channelinfo',
    examples: ['/channelinfo'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Get information about the current channel'),
    async execute(interaction) {
        const channel = interaction.channel;
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `# ${channel.name}`,
            color: CONFIG.THEME.SECONDARY,
            fields: [
                { name: '🆔 Channel ID', value: channel.id, inline: true },
                { name: '📅 Created', value: time(channel.createdAt, 'R'), inline: true },
                { name: '📝 Type', value: channel.type, inline: true },
                { name: '👁️ NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
                { name: '📤 Slowmode', value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Off', inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'emoji',
    description: 'Get a large version of an emoji',
    category: 'Utility',
    usage: '/emoji [emoji]',
    examples: ['/emoji 😀', '/emoji 🎉'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Get a large version of an emoji')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji to enlarge')
                .setRequired(true)),
    async execute(interaction) {
        const emojiStr = interaction.options.getString('emoji');
        
        const customEmojiRegex = /<a?:([a-zA-Z0-9_]+):(\d+)>/;
        const match = emojiStr.match(customEmojiRegex);
        
        if (match) {
            const emojiId = match[2];
            const animated = emojiStr.startsWith('<a:');
            const url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `:${match[1]}:`,
                image: { url },
                color: CONFIG.THEME.SECONDARY
            });
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: emojiStr, ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'stealemoji',
    description: 'Add an emoji from another server to this one',
    category: 'Utility',
    usage: '/stealemoji [emoji] [name]',
    examples: ['/stealemoji <emoji:123456789> react', '/stealemoji <a:animated:987654321> celebrate'],
    cooldown: 5,
    permissions: ['ManageEmojisAndStickers'],
    slashData: new SlashCommandBuilder()
        .setName('stealemoji')
        .setDescription('Add an emoji from another server')
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji to add (custom emoji)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name for the emoji')
                .setRequired(true)),
    async execute(interaction) {
        const emojiStr = interaction.options.getString('emoji');
        const name = interaction.options.getString('name');
        
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Emojis permission.')], ephemeral: true });
        }
        
        const match = emojiStr.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
        if (!match) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Emoji', 'Please provide a custom emoji from another server.')], ephemeral: true });
        }
        
        const emojiId = match[2];
        const url = `https://cdn.discordapp.com/emojis/${emojiId}.gif`;
        
        try {
            const response = await fetch(url);
            const buffer = Buffer.from(await response.arrayBuffer());
            
            const emoji = await interaction.guild.emojis.create({
                attachment: buffer,
                name: name.toLowerCase().replace(/[^a-z0-9]/g, '_')
            });
            
            const embed = ErrorHandler.createSuccessEmbed('Emoji Added', 
                `Successfully added emoji ${emoji} as \`:${emoji.name}:\``);
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Steal Emoji Command')], ephemeral: true });
        }
    }
});

commandRegistry.register({
    name: 'config',
    description: 'Configure bot settings',
    category: 'Utility',
    usage: '/config [setting] [value]',
    examples: ['/config channel #general', '/config welcome enabled', '/config prefix !'],
    cooldown: 5,
    permissions: ['Administrator'],
    slashData: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure bot settings')
        .addStringOption(option =>
            option.setName('setting')
                .setDescription('Setting to configure')
                .setRequired(true)
                .addChoices(
                    { name: 'AI Channel', value: 'ai_channel' },
                    { name: 'Welcome Channel', value: 'welcome_channel' },
                    { name: 'Log Channel', value: 'log_channel' },
                    { name: 'Starboard Channel', value: 'starboard_channel' },
                    { name: 'Welcome Messages', value: 'welcome_enabled' },
                    { name: 'Prefix', value: 'prefix' }
                ))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('Value for the setting')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel for setting (if applicable)'))
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable/disable feature')),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Administrator permission.')], ephemeral: true });
        }
        
        const setting = interaction.options.getString('setting');
        const value = interaction.options.getString('value');
        const channel = interaction.options.getChannel('channel');
        const enabled = interaction.options.getBoolean('enabled');
        
        const guildData = GuildDataManager.getGuild(interaction.guildId);
        
        switch (setting) {
            case 'ai_channel':
                if (channel) {
                    STATE.activeChannelId = channel.id;
                    guildData.channels.ai = channel.id;
                    const embed = ErrorHandler.createSuccessEmbed('AI Channel Set', `AI will respond in ${channel}.`);
                    STATE.commandCount++;
                    return interaction.reply({ embeds: [embed] });
                }
                break;
                
            case 'welcome_channel':
                if (channel) {
                    STATE.welcomeChannelId = channel.id;
                    guildData.channels.welcome = channel.id;
                    const embed = ErrorHandler.createSuccessEmbed('Welcome Channel Set', `Welcome messages will be sent to ${channel}.`);
                    STATE.commandCount++;
                    return interaction.reply({ embeds: [embed] });
                }
                break;
                
            case 'log_channel':
                if (channel) {
                    STATE.logChannelId = channel.id;
                    guildData.channels.log = channel.id;
                    const embed = ErrorHandler.createSuccessEmbed('Log Channel Set', `Moderation logs will be sent to ${channel}.`);
                    STATE.commandCount++;
                    return interaction.reply({ embeds: [embed] });
                }
                break;
                
            case 'starboard_channel':
                if (channel) {
                    STATE.starboardChannelId = channel.id;
                    guildData.channels.starboard = channel.id;
                    const embed = ErrorHandler.createSuccessEmbed('Starboard Channel Set', `Starboard will be sent to ${channel}.`);
                    STATE.commandCount++;
                    return interaction.reply({ embeds: [embed] });
                }
                break;
                
            case 'welcome_enabled':
                guildData.settings.welcomeEnabled = enabled ?? true;
                const embed = ErrorHandler.createSuccessEmbed('Setting Updated', 
                    `Welcome messages are now ${guildData.settings.welcomeEnabled ? 'enabled' : 'disabled'}.`);
                STATE.commandCount++;
                return interaction.reply({ embeds: [embed] });
                
            case 'prefix':
                if (value) {
                    guildData.settings.prefix = value;
                    const embed = ErrorHandler.createSuccessEmbed('Prefix Updated', 
                        `Command prefix is now \`${value}\`. Note: Slash commands don't need prefixes.`);
                    STATE.commandCount++;
                    return interaction.reply({ embeds: [embed] });
                }
                break;
        }
        
        await interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Configuration', 'Please provide required value/channel for this setting.')], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'announce',
    description: 'Send an announcement',
    category: 'Utility',
    usage: '/announce [message] [channel] [ping]',
    examples: ['/announce Update coming soon! @everyone', '/announce Maintenance in 1 hour'],
    cooldown: 10,
    permissions: ['ManageChannels'],
    slashData: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send to (defaults to current)')
                .addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(option =>
            option.setName('ping')
                .setDescription('Ping @everyone')),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Channels permission.')], ephemeral: true });
        }
        
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const ping = interaction.options.getBoolean('ping');
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '📢 Announcement',
            description: message,
            color: CONFIG.THEME.GRADIENT_START,
            author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }
        });
        
        const content = ping ? '@everyone' : '';
        await channel.send({ content, embeds: [embed] });
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Announcement Sent', 
            `Your announcement has been sent to ${channel}.`);
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'poll',
    description: 'Create a poll',
    category: 'Utility',
    usage: '/poll [question] [options]',
    examples: ['/poll What should we play? Minecraft|Roblox|Fortnite'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Poll question')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Options separated by | (e.g., Option 1|Option 2|Option 3)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setMinValue(1)
                .setMaxValue(10080)),
    async execute(interaction) {
        const question = interaction.options.getString('question');
        const optionsStr = interaction.options.getString('options');
        const duration = interaction.options.getInteger('duration');
        
        const options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);
        
        if (options.length < 2 || options.length > 10) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Options', 'Please provide 2-10 options separated by |')], ephemeral: true });
        }
        
        const pollId = crypto.randomBytes(8).toString('hex');
        STATE.activePolls.set(pollId, {
            question,
            options: options.map((opt, i) => ({ label: opt, votes: 0, id: i })),
            createdBy: interaction.user.id,
            createdAt: Date.now(),
            duration: duration ? Date.now() + duration * 60000 : null,
            voters: new Set()
        });
        
        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];
        
        const pollDescription = options.map((opt, i) => 
            `${emojis[i]} **${opt}**: 0 votes`
        ).join('\n');
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `📊 ${question}`,
            description: pollDescription,
            color: CONFIG.THEME.SECONDARY,
            footer: { text: duration ? `Ends ${new Date(Date.now() + duration * 60000).toLocaleString()}` : 'React to vote!' },
            fields: [
                { name: 'Poll ID', value: pollId, inline: true }
            ]
        });
        
        const pollMessage = await interaction.channel.send({ embeds: [embed] });
        
        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(emojis[i]);
        }
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Poll Created', 'Poll has been started!');
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed] });
    }
});

commandRegistry.register({
    name: 'reminder',
    description: 'Set a reminder',
    category: 'Utility',
    usage: '/reminder [time] [message]',
    examples: ['/reminder 1h Check the meeting', '/reminder 30m Take a break'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Set a reminder')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time (e.g., 5m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Reminder message')
                .setRequired(true)),
    async execute(interaction) {
        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        
        const match = timeStr.match(/^(\d+)([mhd])$/);
        if (!match) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Time', 'Use format like: 5m, 1h, 1d')], ephemeral: true });
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers = { m: 60000, h: 3600000, d: 86400000 };
        const delay = value * multipliers[unit];
        const targetTime = Date.now() + delay;
        
        const reminderId = crypto.randomBytes(8).toString('hex');
        STATE.activeReminders.set(reminderId, {
            userId: interaction.user.id,
            channelId: interaction.channelId,
            message,
            targetTime
        });
        
        setTimeout(async () => {
            const reminder = STATE.activeReminders.get(reminderId);
            if (reminder) {
                try {
                    const channel = await client.channels.fetch(reminder.channelId);
                    await channel.send(`⏰ <@${reminder.userId}> Reminder: ${reminder.message}`);
                    STATE.activeReminders.delete(reminderId);
                } catch (error) {
                    console.error('Failed to send reminder:', error);
                }
            }
        }, delay);
        
        const embed = ErrorHandler.createSuccessEmbed('Reminder Set', 
            `I'll remind you in ${timeStr}: "${message}"`);
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'reminders',
    description: 'List your active reminders',
    category: 'Utility',
    usage: '/reminders',
    examples: ['/reminders'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('reminders')
        .setDescription('List your active reminders'),
    async execute(interaction) {
        const userReminders = [];
        const now = Date.now();
        
        for (const [id, reminder] of STATE.activeReminders.entries()) {
            if (reminder.userId === interaction.user.id && reminder.targetTime > now) {
                const timeLeft = Math.ceil((reminder.targetTime - now) / 60000);
                userReminders.push({
                    id,
                    message: reminder.message,
                    timeLeft: `${timeLeft}m`
                });
            }
        }
        
        if (userReminders.length === 0) {
            return interaction.reply({ embeds: [ErrorHandler.createInfoEmbed('No Reminders', 'You have no active reminders.')], ephemeral: true });
        }
        
        const fields = userReminders.map(r => ({
            name: r.message,
            value: `In ${r.timeLeft}`,
            inline: true
        }));
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '⏰ Your Reminders',
            color: CONFIG.THEME.INFO,
            fields
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'calculate',
    description: 'Calculate mathematical expressions',
    category: 'Utility',
    usage: '/calculate [expression]',
    examples: ['/calculate 2+2', '/calculate sin(45)*cos(45)', '/calculate 10^2 + 5*3'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Calculate mathematical expressions')
        .addStringOption(option =>
            option.setName('expression')
                .setDescription('Mathematical expression')
                .setRequired(true)),
    async execute(interaction) {
        const expression = interaction.options.getString('expression');
        
        try {
            const sanitized = expression.replace(/[^0-9+\-*/^().%,e\s]/g, '');
    
            let result;
            if (sanitized.includes('sin') || sanitized.includes('cos') || sanitized.includes('tan') || sanitized.includes('sqrt') || sanitized.includes('log') || sanitized.includes('PI') || sanitized.includes('pow')) {
                result = await this.evaluateWithAI(expression);
            } else {
                result = Function(`"use strict"; return (${sanitized})`)();
            }
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🧮 Calculator',
                color: CONFIG.THEME.SUCCESS,
                fields: [
                    { name: 'Expression', value: codeBlock(expression), inline: false },
                    { name: 'Result', value: codeBlock(String(isFinite(result) ? result : 'Error')), inline: false }
                ]
            });
            
            STATE.commandCount++;
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ embeds: [ErrorHandler.createErrorEmbed(new Error('Invalid expression'), 'Calculator')], ephemeral: true });
        }
    },
    
    async evaluateWithAI(expression) {
        const prompt = `Calculate this mathematical expression and return ONLY the numerical result: ${expression}`;
        const response = await aiManager.generateWithRetry(prompt);
        const result = response.response.text();
        return parseFloat(result.replace(/[^0-9.\-]/g, ''));
    }
});

commandRegistry.register({
    name: 'weather',
    description: 'Get weather information (simulated)',
    category: 'Utility',
    usage: '/weather [location]',
    examples: ['/weather New York', '/weather London'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get weather information')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('City name')
                .setRequired(true)),
    async execute(interaction) {
        const location = interaction.options.getString('location');
        
        await interaction.deferReply();
        
        const prompt = `Generate realistic current weather data for ${location}. Include temperature, humidity, wind speed, conditions, and UV index. Format as JSON with keys: temp, humidity, wind, conditions, uv. Make it realistic for this location.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const weatherData = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `🌤️ Weather for ${location}`,
                color: CONFIG.THEME.INFO,
                description: weatherData.substring(0, 1000)
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Weather Command')] });
        }
    }
});

commandRegistry.register({
    name: 'translate',
    description: 'Translate text between languages',
    category: 'Utility',
    usage: '/translate [text] [target_language]',
    examples: ['/translate Hello world Spanish', '/translate Bonjour English'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to translate')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Target language')
                .setRequired(true)
                .addChoices(
                    { name: 'Spanish', value: 'Spanish' },
                    { name: 'French', value: 'French' },
                    { name: 'German', value: 'German' },
                    { name: 'Italian', value: 'Italian' },
                    { name: 'Portuguese', value: 'Portuguese' },
                    { name: 'Japanese', value: 'Japanese' },
                    { name: 'Chinese', value: 'Chinese' },
                    { name: 'Korean', value: 'Korean' },
                    { name: 'Russian', value: 'Russian' },
                    { name: 'Arabic', value: 'Arabic' },
                    { name: 'English', value: 'English' }
                )),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const language = interaction.options.getString('language');
        
        await interaction.deferReply();
        
        const prompt = `Translate the following text to ${language}. Only provide the translation, no explanations:\n\n"${text}"`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const translation = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `🌐 Translation (${language})`,
                color: CONFIG.THEME.INFO,
                fields: [
                    { name: 'Original', value: text, inline: false },
                    { name: 'Translation', value: translation, inline: false }
                ]
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Translation')] });
        }
    }
});

commandRegistry.register({
    name: 'define',
    description: 'Get the definition of a word',
    category: 'Utility',
    usage: '/define [word]',
    examples: ['/define serendipity', '/define algorithm'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Get the definition of a word')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('Word to define')
                .setRequired(true)),
    async execute(interaction) {
        const word = interaction.options.getString('word');
        
        await interaction.deferReply();
        
        const prompt = `Provide a comprehensive definition of the word "${word}" including:\n1. Primary definition\n2. Part of speech\n3. Example sentence\n4. Etymology or origin\n5. Synonyms and antonyms\n6. Usage notes`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const definition = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `📖 Definition: ${word}`,
                color: CONFIG.THEME.INFO,
                description: definition.substring(0, 4000)
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Definition')] });
        }
    }
});

commandRegistry.register({
    name: 'summary',
    description: 'Summarize text',
    category: 'Utility',
    usage: '/summary [text]',
    examples: ['/summary [long text to summarize]'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('summary')
        .setDescription('Summarize text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to summarize')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('length')
                .setDescription('Summary length')
                .addChoices(
                    { name: 'Short', value: 'short' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Detailed', value: 'detailed' }
                )),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const length = interaction.options.getString('length') || 'medium';
        
        await interaction.deferReply();
        
        const lengthInstruction = {
            short: 'Provide a concise 2-3 sentence summary.',
            medium: 'Provide a balanced summary with main points in a paragraph.',
            detailed: 'Provide a detailed summary covering all key aspects.'
        };
        
        const prompt = `Summarize the following text. ${lengthInstruction[length]}:\n\n${text}`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const summary = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📝 Summary',
                color: CONFIG.THEME.SUCCESS,
                description: summary.substring(0, 4000)
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Summary')] });
        }
    }
});

commandRegistry.register({
    name: 'quote',
    description: 'Get an inspirational quote',
    category: 'Utility',
    usage: '/quote [category]',
    examples: ['/quote', '/quote motivation', '/quote success'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get an inspirational quote')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Quote category')
                .setRequired(false)
                .addChoices(
                    { name: 'Motivation', value: 'motivation' },
                    { name: 'Success', value: 'success' },
                    { name: 'Wisdom', value: 'wisdom' },
                    { name: 'Technology', value: 'technology' },
                    { name: 'Random', value: 'random' }
                )),
    async execute(interaction) {
        const category = interaction.options.getString('category') || 'random';
        
        await interaction.deferReply();
        
        const prompt = `Generate an inspiring ${category} quote. Format as: "Quote" - Author. Make it unique and meaningful.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const quote = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '💭 Quote of the Moment',
                color: CONFIG.THEME.GRADIENT_START,
                description: quote
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Quote')] });
        }
    }
});

commandRegistry.register({
    name: 'joke',
    description: 'Get a joke',
    category: 'Utility',
    usage: '/joke [type]',
    examples: ['/joke', '/joke programming', '/joke dad'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a joke')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Joke type')
                .setRequired(false)
                .addChoices(
                    { name: 'Programming', value: 'programming' },
                    { name: 'Dad Joke', value: 'dad' },
                    { name: 'Pun', value: 'pun' },
                    { name: 'Random', value: 'random' }
                )),
    async execute(interaction) {
        const type = interaction.options.getString('type') || 'random';
        
        await interaction.deferReply();
        
        const prompt = `Tell me a funny ${type} joke. Make it original and genuinely funny.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const joke = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '😂 Joke Time!',
                color: CONFIG.THEME.WARNING,
                description: joke
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Joke')] });
        }
    }
});

// ==================== Economy Commands ====================

commandRegistry.register({
    name: 'balance',
    description: 'Check your balance',
    category: 'Economy',
    usage: '/balance [user]',
    examples: ['/balance', '/balance @user'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s balance')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const userData = UserDataManager.getUser(user.id);
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '💰 Balance',
            color: CONFIG.THEME.SUCCESS,
            thumbnail: user.displayAvatarURL(),
            fields: [
                { name: 'User', value: user.tag, inline: true },
                { name: 'Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                { name: 'Level', value: userData.level.toString(), inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'daily',
    description: 'Claim your daily reward',
    category: 'Economy',
    usage: '/daily',
    examples: ['/daily'],
    cooldown: 0,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),
    async execute(interaction) {
        const userData = UserDataManager.getUser(interaction.user.id);
        const now = Date.now();
        const dailyCooldown = 86400000; // 24 hours
        
        if (userData.lastDaily && now - userData.lastDaily < dailyCooldown) {
            const remaining = Math.ceil((userData.lastDaily + dailyCooldown - now) / 1000 / 60 / 60);
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Cooldown', `Come back in ${remaining} hours for your next daily reward!`)], ephemeral: true });
        }
        
        const reward = Math.floor(Math.random() * 500) + 100;
        UserDataManager.addBalance(interaction.user.id, reward);
        userData.lastDaily = now;
        
        const embed = ErrorHandler.createSuccessEmbed('Daily Claimed!', 
            `You received **${reward} coins** as your daily reward!`);
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'give',
    description: 'Give coins to another user',
    category: 'Economy',
    usage: '/give [user] [amount]',
    examples: ['/give @user 100', '/give @friend 500'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give coins to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Recipient')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to give')
                .setMinValue(1)
                .setRequired(true)),
    async execute(interaction) {
        const recipient = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        if (recipient.id === interaction.user.id) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Recipient', 'You cannot give coins to yourself.')], ephemeral: true });
        }
        
        const senderData = UserDataManager.getUser(interaction.user.id);
        if (senderData.balance < amount) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Insufficient Funds', 'You don\'t have enough coins.')], ephemeral: true });
        }
        
        UserDataManager.addBalance(interaction.user.id, -amount);
        UserDataManager.addBalance(recipient.id, amount);
        
        const embed = ErrorHandler.createSuccessEmbed('Transfer Complete', 
            `You sent **${amount} coins** to ${recipient.tag}.`);
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'coinflip',
    description: 'Flip a coin and bet coins',
    category: 'Economy',
    usage: '/coinflip [heads/tails] [amount]',
    examples: ['/coinflip heads 50', '/coinflip tails 100'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and bet coins')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet')
                .setMinValue(1)
                .setRequired(true)),
    async execute(interaction) {
        const choice = interaction.options.getString('choice');
        const amount = interaction.options.getInteger('amount');
        
        const userData = UserDataManager.getUser(interaction.user.id);
        if (userData.balance < amount) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Insufficient Funds', 'You don\'t have enough coins.')], ephemeral: true });
        }
        
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === result;
        
        if (won) {
            UserDataManager.addBalance(interaction.user.id, amount);
        } else {
            UserDataManager.addBalance(interaction.user.id, -amount);
        }
        
        const embed = EmbedFactory.createBaseEmbed({
            title: won ? '🎉 You Won!' : '😢 You Lost!',
            color: won ? CONFIG.THEME.SUCCESS : CONFIG.THEME.ERROR,
            description: `The coin landed on **${result.toUpperCase()}**!\n\n${won ? `You won **${amount} coins**!` : `You lost **${amount} coins**.`}`,
            fields: [
                { name: 'Your Choice', value: choice.toUpperCase(), inline: true },
                { name: 'Result', value: result.toUpperCase(), inline: true },
                { name: 'New Balance', value: `${userData.balance} coins`, inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'slots',
    description: 'Play slots',
    category: 'Economy',
    usage: '/slots [amount]',
    examples: ['/slots 50', '/slots 100'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play slots')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet')
                .setMinValue(1)
                .setRequired(true)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        
        const userData = UserDataManager.getUser(interaction.user.id);
        if (userData.balance < amount) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Insufficient Funds', 'You don\'t have enough coins.')], ephemeral: true });
        }
        
        const symbols = ['🍎', '🍊', '🍋', '🍇', '💎', '7️⃣', '⭐'];
        const reels = [
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)]
        ];
        
        let multiplier = 0;
        
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
            multiplier = reels[0] === '7️⃣' ? 10 : reels[0] === '💎' ? 5 : 3;
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
            multiplier = 1.5;
        }
        
        const winnings = Math.floor(amount * multiplier);
        UserDataManager.addBalance(interaction.user.id, winnings - amount);
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎰 Slot Machine',
            color: multiplier > 0 ? CONFIG.THEME.SUCCESS : CONFIG.THEME.PRIMARY,
            description: `| ${reels[0]} | ${reels[1]} | ${reels[2]} |\n\n${multiplier > 0 ? `You won **${winnings} coins**! (${multiplier}x)` : `Better luck next time!`}`,
            fields: [
                { name: 'Bet', value: `${amount} coins`, inline: true },
                { name: 'Result', value: multiplier > 0 ? `Won!` : 'Lost', inline: true },
                { name: 'Balance', value: `${userData.balance} coins`, inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'leaderboard economy',
    description: 'View economy leaderboard',
    category: 'Economy',
    usage: '/leaderboard economy',
    examples: ['/leaderboard economy'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('leaderboard_economy')
        .setDescription('View economy leaderboard'),
    async execute(interaction) {
        const embed = EmbedFactory.createLeaderboardEmbed('balance');
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'shop',
    description: 'View the shop',
    category: 'Economy',
    usage: '/shop',
    examples: ['/shop'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the shop'),
    async execute(interaction) {
        const items = [
            { name: '🎮 Premium Role', price: 1000, description: 'Get a special premium role' },
            { name: '🎁 Mystery Box', price: 500, description: 'Contains random rewards' },
            { name: '⭐ XP Boost', price: 300, description: '2x XP for 1 hour' },
            { name: '🎨 Custom Color', price: 750, description: 'Custom role color' },
            { name: '🏆 Trophy', price: 2000, description: 'Display a trophy on your profile' }
        ];
        
        const fields = items.map((item, i) => ({
            name: `${i + 1}. ${item.name}`,
            value: `${item.description}\nPrice: ${item.price} coins`,
            inline: false
        }));
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🛒 Shop',
            color: CONFIG.THEME.GRADIENT_START,
            description: 'Buy items with /buy [item_number]',
            fields
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'buy',
    description: 'Buy items from the shop',
    category: 'Economy',
    usage: '/buy [item]',
    examples: ['/buy 1', '/buy Mystery Box'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy items from the shop')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name or number')
                .setRequired(true)),
    async execute(interaction) {
        const itemInput = interaction.options.getString('item');
        const userData = UserDataManager.getUser(interaction.user.id);
        
        const items = [
            { name: 'Premium Role', price: 1000 },
            { name: 'Mystery Box', price: 500 },
            { name: 'XP Boost', price: 300 },
            { name: 'Custom Color', price: 750 },
            { name: 'Trophy', price: 2000 }
        ];
        
        const itemIndex = parseInt(itemInput) - 1;
        const item = items[itemIndex] || items.find(i => i.name.toLowerCase().includes(itemInput.toLowerCase()));
        
        if (!item) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Item Not Found', 'That item doesn\'t exist in the shop.')], ephemeral: true });
        }
        
        if (userData.balance < item.price) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Insufficient Funds', `You need ${item.price - userData.balance} more coins.`)], ephemeral: true });
        }
        
        UserDataManager.addBalance(interaction.user.id, -item.price);
        
        if (!userData.inventory) userData.inventory = [];
        userData.inventory.push(item);
        
        const embed = ErrorHandler.createSuccessEmbed('Purchase Successful!', 
            `You bought **${item.name}** for **${item.price} coins**!`);
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'inventory',
    description: 'View your inventory',
    category: 'Economy',
    usage: '/inventory',
    examples: ['/inventory'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),
    async execute(interaction) {
        const userData = UserDataManager.getUser(interaction.user.id);
        
        if (!userData.inventory || userData.inventory.length === 0) {
            return interaction.reply({ embeds: [ErrorHandler.createInfoEmbed('Empty Inventory', 'You have no items. Visit the shop with /shop!')], ephemeral: true });
        }
        
        const fields = userData.inventory.map((item, i) => ({
            name: `${item.name}`,
            value: `Item #${i + 1}`,
            inline: true
        }));
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '📦 Your Inventory',
            color: CONFIG.THEME.SECONDARY,
            fields
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

// ==================== Fun Commands ====================

commandRegistry.register({
    name: 'meme',
    description: 'Generate a meme',
    category: 'Fun',
    usage: '/meme [topic]',
    examples: ['/meme coding struggle', '/meme discord servers'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Generate a meme')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Meme topic')
                .setRequired(false)),
    async execute(interaction) {
        const topic = interaction.options.getString('topic') || 'random';
        
        await interaction.deferReply();
        
        const prompt = `Create a funny, engaging meme about: ${topic}. Include a witty caption that would work well with an image. Make it original and humorous.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const meme = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '😂 Meme',
                color: CONFIG.THEME.GRADIENT_END,
                description: meme.substring(0, 2000)
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Meme Generator')] });
        }
    }
});

commandRegistry.register({
    name: '8ball',
    description: 'Ask the magic 8-ball',
    category: 'Fun',
    usage: '/8ball [question]',
    examples: ['/8ball Will I pass my exam?', '/8ball Should I buy it?'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)),
    async execute(interaction) {
        const question = interaction.options.getString('question');
        
        const responses = [
            'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes, definitely.',
            'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.',
            'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
            'Cannot predict now.', 'Concentrate and ask again.', 'Don\'t count on it.', 'My reply is no.',
            'My sources say no.', 'Outlook not so good.', 'Very doubtful.'
        ];
        
        const answer = responses[Math.floor(Math.random() * responses.length)];
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🔮 Magic 8-Ball',
            color: CONFIG.THEME.GRADIENT_START,
            fields: [
                { name: 'Question', value: question, inline: false },
                { name: 'Answer', value: answer, inline: false }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'roll',
    description: 'Roll dice',
    category: 'Fun',
    usage: '/roll [dice]',
    examples: ['/roll', '/roll 2d6', '/roll 4d20'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll dice')
        .addStringOption(option =>
            option.setName('dice')
                .setDescription('Dice notation (e.g., 2d6, 1d20)')
                .setRequired(false)),
    async execute(interaction) {
        const diceStr = interaction.options.getString('dice') || '1d6';
        
        const match = diceStr.match(/^(\d*)d(\d+)$/);
        if (!match) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Format', 'Use format like: 2d6, 1d20')], ephemeral: true });
        }
        
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        
        if (count > 20 || count < 1) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Count', 'Please roll 1-20 dice.')], ephemeral: true });
        }
        
        if (sides > 100 || sides < 2) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Sides', 'Dice must have 2-100 sides.')], ephemeral: true });
        }
        
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const total = rolls.reduce((a, b) => a + b, 0);
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎲 Dice Roll',
            color: CONFIG.THEME.SECONDARY,
            description: count > 1 ? `Rolled ${count}d${sides}: [${rolls.join(', ')}]` : `Rolled 1d${sides}: ${rolls[0]}`,
            fields: [
                { name: 'Total', value: total.toString(), inline: true },
                { name: 'Average', value: (total / count).toFixed(2), inline: true },
                { name: 'Max Roll', value: Math.max(...rolls).toString(), inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'rps',
    description: 'Play rock paper scissors',
    category: 'Fun',
    usage: '/rps [choice]',
    examples: ['/rps rock', '/rps paper', '/rps scissors'],
    cooldown: 3,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play rock paper scissors')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice')
                .setRequired(true)
                .addChoices(
                    { name: '🪨 Rock', value: 'rock' },
                    { name: '📄 Paper', value: 'paper' },
                    { name: '✂️ Scissors', value: 'scissors' }
                )),
    async execute(interaction) {
        const playerChoice = interaction.options.getString('choice');
        
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        const winConditions = {
            rock: 'scissors',
            paper: 'rock',
            scissors: 'paper'
        };
        
        let result;
        let emoji;
        
        if (playerChoice === botChoice) {
            result = "It's a tie!";
            emoji = '🤝';
        } else if (winConditions[playerChoice] === botChoice) {
            result = 'You win!';
            emoji = '🎉';
        } else {
            result = 'You lose!';
            emoji = '😢';
        }
        
        const choiceEmojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `${emoji} ${result}`,
            color: result.includes('win') ? CONFIG.THEME.SUCCESS : result.includes('lose') ? CONFIG.THEME.ERROR : CONFIG.THEME.WARNING,
            fields: [
                { name: 'Your Choice', value: `${choiceEmojis[playerChoice]} ${playerChoice.toUpperCase()}`, inline: true },
                { name: 'Bot Choice', value: `${choiceEmojis[botChoice]} ${botChoice.toUpperCase()}`, inline: true }
            ]
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'rate',
    description: 'Rate something',
    category: 'Fun',
    usage: '/rate [thing]',
    examples: ['/rate pizza', '/rate my day', '/rate javascript'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('rate')
        .setDescription('Rate something')
        .addStringOption(option =>
            option.setName('thing')
                .setDescription('Thing to rate')
                .setRequired(true)),
    async execute(interaction) {
        const thing = interaction.options.getString('thing');
        const rating = (Math.random() * 10).toFixed(1);
        
        const stars = '⭐'.repeat(Math.floor(rating / 2)) + '☆'.repeat(5 - Math.floor(rating / 2));
        
        const embed = EmbedFactory.createBaseEmbed({
            title: `📊 Rating`,
            color: CONFIG.THEME.GRADIENT_START,
            description: `I rate **${thing}** a **${rating}/10**\n\n${stars}`
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'choose',
    description: 'Have the bot choose for you',
    category: 'Fun',
    usage: '/choose [options]',
    examples: ['/choose Pizza|Burger|Sushi', '/choose Yes|No'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Have the bot choose for you')
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Options separated by |')
                .setRequired(true)),
    async execute(interaction) {
        const optionsStr = interaction.options.getString('options');
        const options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);
        
        if (options.length < 2) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Options', 'Please provide at least 2 options separated by |')], ephemeral: true });
        }
        
        const choice = options[Math.floor(Math.random() * options.length)];
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎯 I Choose...',
            color: CONFIG.THEME.GRADIENT_START,
            description: `**${choice}**`
        });
        
        STATE.commandCount++;
        await interaction.reply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'fact',
    description: 'Get a random fact',
    category: 'Fun',
    usage: '/fact [category]',
    examples: ['/fact', '/fact science', '/fact history'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('fact')
        .setDescription('Get a random fact')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Fact category')
                .setRequired(false)
                .addChoices(
                    { name: 'Science', value: 'science' },
                    { name: 'History', value: 'history' },
                    { name: 'Technology', value: 'technology' },
                    { name: 'Random', value: 'random' }
                )),
    async execute(interaction) {
        const category = interaction.options.getString('category') || 'random';
        
        await interaction.deferReply();
        
        const prompt = `Tell me an interesting ${category} fact. Make it educational and surprising.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const fact = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🧠 Did You Know?',
                color: CONFIG.THEME.INFO,
                description: fact.substring(0, 2000)
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Fact')] });
        }
    }
});

commandRegistry.register({
    name: 'trivia',
    description: 'Play trivia',
    category: 'Fun',
    usage: '/trivia [category]',
    examples: ['/trivia', '/trivia science', '/trivia movies'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play trivia')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Trivia category')
                .setRequired(false)
                .addChoices(
                    { name: 'Science', value: 'science' },
                    { name: 'History', value: 'history' },
                    { name: 'Technology', value: 'technology' },
                    { name: 'Geography', value: 'geography' },
                    { name: 'Random', value: 'random' }
                )),
    async execute(interaction) {
        const category = interaction.options.getString('category') || 'random';
        
        await interaction.deferReply();
        
        const prompt = `Generate a trivia question about ${category}. Format as JSON with keys: question, options (array of 4), correctIndex, explanation.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const triviaData = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🎯 Trivia Question',
                color: CONFIG.THEME.GRADIENT_START,
                description: triviaData.substring(0, 3000)
            });
            
            const options = [
                ComponentFactory.createButton('trivia_0', 'A', ButtonStyle.Primary),
                ComponentFactory.createButton('trivia_1', 'B', ButtonStyle.Primary),
                ComponentFactory.createButton('trivia_2', 'C', ButtonStyle.Primary),
                ComponentFactory.createButton('trivia_3', 'D', ButtonStyle.Primary)
            ];
            
            const row = ComponentFactory.createActionRow(options);
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Trivia')] });
        }
    }
});

commandRegistry.register({
    name: 'compliment',
    description: 'Get a compliment',
    category: 'Fun',
    usage: '/compliment [user]',
    examples: ['/compliment', '/compliment @user'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('compliment')
        .setDescription('Get a compliment')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to compliment')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        await interaction.deferReply();
        
        const prompt = `Generate a genuine, thoughtful compliment for someone. Make it sincere and uplifting.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const compliment = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `💝 Compliment for ${target.tag}`,
                color: CONFIG.THEME.GRADIENT_END,
                description: compliment
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Compliment')] });
        }
    }
});

commandRegistry.register({
    name: 'roast',
    description: 'Get a friendly roast',
    category: 'Fun',
    usage: '/roast [user]',
    examples: ['/roast', '/roast @user'],
    cooldown: 10,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Get a friendly roast')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to roast')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        
        await interaction.deferReply();
        
        const prompt = `Generate a lighthearted, friendly roast. Keep it funny but not offensive or hurtful. Focus on harmless stereotypes or playful teasing.`;
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const roast = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: `🔥 Roast for ${target.tag}`,
                color: CONFIG.THEME.WARNING,
                description: roast,
                footer: { text: 'Just kidding! 😄' }
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Roast')] });
        }
    }
});

commandRegistry.register({
    name: 'wouldyourather',
    description: 'Play would you rather',
    category: 'Fun',
    usage: '/wouldyourather',
    examples: ['/wouldyourather'],
    cooldown: 15,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('wouldyourather')
        .setDescription('Play would you rather'),
    async execute(interaction) {
        await interaction.deferReply();
        
        const prompt = 'Generate a creative and interesting "Would You Rather" question with two options. Make it thought-provoking or funny.';
        
        try {
            const response = await aiManager.generateWithRetry(prompt);
            const question = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '🤔 Would You Rather',
                color: CONFIG.THEME.GRADIENT_START,
                description: question
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Would You Rather')] });
        }
    }
});

commandRegistry.register({
    name: 'story',
    description: 'Generate a story',
    category: 'Fun',
    usage: '/story [prompt]',
    examples: ['/story A robot discovering emotions', '/story Mystery in a haunted mansion'],
    cooldown: 15,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('story')
        .setDescription('Generate a story')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Story prompt')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('length')
                .setDescription('Story length')
                .setRequired(false)
                .addChoices(
                    { name: 'Short', value: 'short' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Long', value: 'long' }
                )),
    async execute(interaction) {
        const prompt = interaction.options.getString('prompt');
        const length = interaction.options.getString('length') || 'medium';
        
        await interaction.deferReply();
        
        const lengthInstruction = {
            short: 'Write a very short story (2-3 paragraphs maximum)',
            medium: 'Write a medium-length story (5-7 paragraphs)',
            long: 'Write a detailed, engaging story with good pacing (10-15 paragraphs)'
        };
        
        const storyPrompt = `${lengthInstruction[length]}\n\nStory prompt: ${prompt}\n\nMake it engaging, well-written, and have a clear narrative arc.`;
        
        try {
            const response = await aiManager.generateWithRetry(storyPrompt);
            const story = response.response.text();
            
            const embed = EmbedFactory.createBaseEmbed({
                title: '📖 Story',
                color: CONFIG.THEME.SECONDARY,
                description: story.length > 4000 ? story.substring(0, 4000) + '\n\n...(continued in next message)' : story
            });
            
            STATE.commandCount++;
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [ErrorHandler.createErrorEmbed(error, 'Story')] });
        }
    }
});

// ==================== Ticket Commands ====================

commandRegistry.register({
    name: 'ticket',
    description: 'Open a support ticket',
    category: 'Tickets',
    usage: '/ticket [subject]',
    examples: ['/ticket Need help with bot', '/ticket Report a bug'],
    cooldown: 60,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Open a support ticket')
        .addStringOption(option =>
            option.setName('subject')
                .setDescription('Ticket subject')
                .setRequired(true)),
    async execute(interaction) {
        const subject = interaction.options.getString('subject');
        
        const existingTicket = STATE.activeTickets.get(interaction.user.id);
        if (existingTicket) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Active Ticket', 'You already have an open ticket!')], ephemeral: true });
        }
        
        const guildData = GuildDataManager.getGuild(interaction.guildId);
        const ticketCategory = guildData.channels.ticketCategory || interaction.channel.parent;
        
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ]
        });
        
        STATE.activeTickets.set(interaction.user.id, {
            channelId: ticketChannel.id,
            subject,
            createdAt: Date.now()
        });
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎫 New Ticket',
            color: CONFIG.THEME.INFO,
            description: `**Subject:** ${subject}\n\nSupport will be with you shortly. Click the button below when resolved.`,
            fields: [
                { name: 'Created by', value: interaction.user.tag, inline: true },
                { name: 'Created at', value: new Date().toLocaleString(), inline: true }
            ]
        });
        
        const closeButton = ComponentFactory.createButton('close_ticket', 'Close Ticket', ButtonStyle.Danger);
        const row = ComponentFactory.createActionRow([closeButton]);
        
        await ticketChannel.send({ embeds: [embed], components: [row] });
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Ticket Created', 
            `Your ticket has been created: ${ticketChannel}`);
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'close',
    description: 'Close a ticket',
    category: 'Tickets',
    usage: '/close',
    examples: ['/close'],
    cooldown: 0,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close the current ticket'),
    async execute(interaction) {
        const ticket = Array.from(STATE.activeTickets.entries()).find(
            ([userId, data]) => data.channelId === interaction.channelId
        );
        
        if (!ticket) {
            return interaction.reply({ content: 'This is not a ticket channel!', ephemeral: true });
        }
        
        const [userId, ticketData] = ticket;
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🔒 Ticket Closed',
            color: CONFIG.THEME.SUCCESS,
            description: `Ticket closed by ${interaction.user.tag}`,
            fields: [
                { name: 'Subject', value: ticketData.subject, inline: true },
                { name: 'Duration', value: `${Math.floor((Date.now() - ticketData.createdAt) / 60000)} minutes`, inline: true }
            ]
        });
        
        STATE.activeTickets.delete(userId);
        STATE.commandCount++;
        await interaction.channel.send({ embeds: [embed] });
        
        await interaction.channel.delete('Ticket closed');
    }
});

// ==================== Verification Commands ====================

commandRegistry.register({
    name: 'verify',
    description: 'Set up verification system',
    category: 'Verification',
    usage: '/verify',
    examples: ['/verify'],
    cooldown: 5,
    permissions: ['Administrator'],
    slashData: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Set up verification system')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to give on verification')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Administrator permission.')], ephemeral: true });
        }
        
        const role = interaction.options.getRole('role');
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🔐 Verify to Access',
            color: CONFIG.THEME.GRADIENT_START,
            description: 'Click the button below to verify your account and gain access to the server.',
            fields: [
                { name: 'Why verify?', value: 'Verification helps us keep the server safe and spam-free.', inline: false }
            ]
        });
        
        const verifyButton = ComponentFactory.createButton('verify_user', '✅ Verify', ButtonStyle.Success);
        const row = ComponentFactory.createActionRow([verifyButton]);
        
        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const guildData = GuildDataManager.getGuild(interaction.guildId);
        guildData.verificationRole = role.id;
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Verification Setup', 
            `Verification system set up! Users will get the ${role} role.`);
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
});

// =================Giveaway Commands ====================

commandRegistry.register({
    name: 'giveaway',
    description: 'Start a giveaway',
    category: 'Giveaways',
    usage: '/giveaway [duration] [winners] [prize]',
    examples: ['/giveaway 1h 1 Nitro Classic', '/giveaway 30m 3 $50 Gift Card'],
    cooldown: 10,
    permissions: ['ManageMessages'],
    slashData: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway')
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 1h, 30m, 1d)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('Prize description')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Messages permission.')], ephemeral: true });
        }
        
        const durationStr = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        
        const match = durationStr.match(/^(\d+)([mhd])$/);
        if (!match) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Invalid Duration', 'Use format like: 1h, 30m, 1d')], ephemeral: true });
        }
        
        const value = parseInt(match[1]);
        const unit = match[2];
        const multipliers = { m: 60000, h: 3600000, d: 86400000 };
        const duration = value * multipliers[unit];
        const endTime = Date.now() + duration;
        
        const giveawayId = crypto.randomBytes(8).toString('hex');
        
        STATE.activeGiveaways.set(giveawayId, {
            channelId: interaction.channelId,
            messageId: null,
            prize,
            winners,
            endTime,
            hostedBy: interaction.user.id,
            participants: new Set()
        });
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎉 GIVEAWAY! 🎉',
            color: CONFIG.THEME.GRADIENT_END,
            description: `**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** ${new Date(endTime).toLocaleString()}`,
            fields: [
                { name: 'Hosted by', value: interaction.user.tag, inline: true },
                { name: 'Time remaining', value: durationStr, inline: true }
            ],
            footer: { text: 'Click the button to enter!' }
        });
        
        const entryButton = ComponentFactory.createButton(`giveaway_${giveawayId}`, '🎁 Enter Giveaway', ButtonStyle.Success);
        const row = ComponentFactory.createActionRow([entryButton]);
        
        const message = await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const giveaway = STATE.activeGiveaways.get(giveawayId);
        giveaway.messageId = message.id;
        
        setTimeout(async () => {
            const activeGiveaway = STATE.activeGiveaways.get(giveawayId);
            if (!activeGiveaway) return;
            
            const participants = Array.from(activeGiveaway.participants);
            
            if (participants.length === 0) {
                const noWinnerEmbed = EmbedFactory.createBaseEmbed({
                    title: '🎉 Giveaway Ended',
                    color: CONFIG.THEME.WARNING,
                    description: `No one participated in the giveaway for: ${prize}`
                });
                await message.edit({ embeds: [noWinnerEmbed], components: [] });
                STATE.activeGiveaways.delete(giveawayId);
                return;
            }
            
            const winnersList = [];
            for (let i = 0; i < Math.min(winners, participants.length); i++) {
                const randomIndex = Math.floor(Math.random() * participants.length);
                winnersList.push(participants.splice(randomIndex, 1)[0]);
            }
            
            const winnerMentions = winnersList.map(id => `<@${id}>`).join(', ');
            
            const winnerEmbed = EmbedFactory.createBaseEmbed({
                title: '🎉 GIVEAWAY ENDED! 🎉',
                color: CONFIG.THEME.SUCCESS,
                description: `**Prize:** ${prize}\n\n**Winner(s):** ${winnerMentions}`,
                fields: [
                    { name: 'Total entries', value: (activeGiveaway.participants.size + winnersList.length).toString(), inline: true }
                ]
            });
            
            await message.edit({ embeds: [winnerEmbed], components: [] });
            await message.channel.send(`🎉 Congratulations ${winnerMentions}! You won the **${prize}** giveaway!`);
            
            STATE.activeGiveaways.delete(giveawayId);
        }, duration);
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Giveaway Started', 'Giveaway is now live!');
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
});

commandRegistry.register({
    name: 'reroll',
    description: 'Reroll a giveaway winner',
    category: 'Giveaways',
    usage: '/reroll [message_id]',
    examples: ['/reroll 123456789'],
    cooldown: 5,
    permissions: ['ManageMessages'],
    slashData: new SlashCommandBuilder()
        .setName('reroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('Giveaway message ID')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 'You need Manage Messages permission.')], ephemeral: true });
        }
        
        await interaction.reply({ content: 'This feature would fetch the original giveaway message and pick new winner(s).', ephemeral: true });
    }
});

// ==================== Music Commands (Placeholders) ====================

commandRegistry.register({
    name: 'play',
    description: 'Play music in a voice channel',
    category: 'Music',
    usage: '/play [query]',
    examples: ['/play https://youtube.com/watch?v=...', '/play song name'],
    cooldown: 3,
    permissions: ['Connect', 'Speak'],
    slashData: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '🎵 Music System',
            color: CONFIG.THEME.WARNING,
            description: 'Music functionality requires additional setup and dependencies. This is a placeholder for future implementation.',
            fields: [
                { name: 'Status', value: 'Not configured', inline: true },
                { name: 'Requirements', value: 'FFmpeg, YouTube search library', inline: true }
            ]
        });
        
        await interaction.editReply({ embeds: [embed] });
    }
});

commandRegistry.register({
    name: 'skip',
    description: 'Skip the current song',
    category: 'Music',
    usage: '/skip',
    examples: ['/skip'],
    cooldown: 3,
    permissions: ['Connect'],
    slashData: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    async execute(interaction) {
        await interaction.reply({ content: 'Music system not configured.', ephemeral: true });
    }
});

commandRegistry.register({
    name: 'queue',
    description: 'View the music queue',
    category: 'Music',
    usage: '/queue',
    examples: ['/queue'],
    cooldown: 5,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the music queue'),
    async execute(interaction) {
        await interaction.reply({ content: 'Music system not configured.', ephemeral: true });
    }
});

commandRegistry.register({
    name: 'stop',
    description: 'Stop the music',
    category: 'Music',
    usage: '/stop',
    examples: ['/stop'],
    cooldown: 0,
    permissions: ['Connect'],
    slashData: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music'),
    async execute(interaction) {
        await interaction.reply({ content: 'Music system not configured.', ephemeral: true });
    }
});

// ==================== Suggestion Commands ====================

commandRegistry.register({
    name: 'suggest',
    description: 'Submit a suggestion',
    category: 'Suggestions',
    usage: '/suggest [suggestion]',
    examples: ['/suggest Add a new feature', '/suggest Update the rules'],
    cooldown: 60,
    permissions: [],
    slashData: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(option =>
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)),
    async execute(interaction) {
        const suggestion = interaction.options.getString('suggestion');
        const guildData = GuildDataManager.getGuild(interaction.guildId);
        
        const channel = STATE.suggestionChannelId || guildData.channels.suggestion || interaction.channel;
        
        const embed = EmbedFactory.createBaseEmbed({
            title: '💡 New Suggestion',
            color: CONFIG.THEME.INFO,
            description: suggestion,
            fields: [
                { name: 'Submitted by', value: interaction.user.tag, inline: true },
                { name: 'Date', value: new Date().toLocaleString(), inline: true },
                { name: 'Status', value: '⏳ Pending Review', inline: true }
            ]
        });
        
        const upvoteButton = ComponentFactory.createButton(`suggest_upvote_${Date.now()}`, '👍 Upvote', ButtonStyle.Success);
        const downvoteButton = ComponentFactory.createButton(`suggest_downvote_${Date.now()}`, '👎 Downvote', ButtonStyle.Danger);
        const row = ComponentFactory.createActionRow([upvoteButton, downvoteButton]);
        
        await channel.send({ embeds: [embed], components: [row] });
        
        const replyEmbed = ErrorHandler.createSuccessEmbed('Suggestion Submitted', 
            'Your suggestion has been submitted for review!');
        STATE.commandCount++;
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

client.once(Events.ClientReady, async () => {
    console.log(`╔════════════════════════════════════════════════════════════╗`);
    console.log(`║  ${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}                              ║`);
    console.log(`║  Created by ${CONFIG.CREATOR}                              ║`);
    console.log(`╠════════════════════════════════════════════════════════════╣`);
    console.log(`║  Logged in as: ${client.user.tag.padEnd(31)}║`);
    console.log(`║  Guilds: ${client.guilds.cache.size.toString().padEnd(44)}║`);
    console.log(`║  Commands: ${commandRegistry.getAll().size.toString().padEnd(42)}║`);
    console.log(`╚════════════════════════════════════════════════════════════╝`);
    
    await deployCommands();
    startMaintenanceTasks();
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    
    STATE.messageCount++;
    
    const rateLimit = RateLimiter.check(message.author.id, 'message');
    if (!rateLimit.allowed) {
        console.log(`Rate limited message from ${message.author.tag}`);
        return;
    }
    
    const levelResult = UserDataManager.addXP(message.author.id, Math.floor(Math.random() * 5) + 1);
    if (levelResult.leveledUp) {
        const embed = ErrorHandler.createSuccessEmbed('🎉 Level Up!', 
            `${message.author.toString()} leveled up to **Level ${levelResult.newLevel}**!`);
        await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
    
    if (message.channel.id === STATE.activeChannelId) {
        await handleAIConversation(message);
    }
    
    if (message.content.includes('<@' + client.user.id + '>') || message.content.startsWith('<@!' + client.user.id + '>')) {
        await handleMention(message);
    }
    
    await checkStarboard(message);
});

client.on(Events.GuildMemberAdd, async member => {
    const guildData = GuildDataManager.getGuild(member.guild.id);
    
    if (guildData.settings.welcomeEnabled && STATE.welcomeChannelId) {
        try {
            const channel = await member.guild.channels.fetch(STATE.welcomeChannelId);
            if (channel) {
                const embed = EmbedFactory.createBaseEmbed({
                    title: '👋 Welcome!',
                    color: CONFIG.THEME.SUCCESS,
                    description: `Welcome to **${member.guild.name}**, ${member.toString()}!\n\nWe're glad to have you here. Make sure to read the rules and enjoy your stay!`,
                    thumbnail: member.user.displayAvatarURL({ size: 256 }),
                    fields: [
                        { name: 'Member #', value: `${member.guild.memberCount}`, inline: true },
                        { name: 'Account Created', value: time(member.user.createdAt, 'R'), inline: true }
                    ]
                });
                
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
    
    UserDataManager.getUser(member.id);
});

client.on(Events.GuildMemberRemove, async member => {
    const guildData = GuildDataManager.getGuild(member.guild.id);
    
    if (guildData.settings.leaveEnabled && STATE.leaveChannelId) {
        try {
            const channel = await member.guild.channels.fetch(STATE.leaveChannelId);
            if (channel) {
                const embed = EmbedFactory.createBaseEmbed({
                    title: '👋 Goodbye!',
                    color: CONFIG.THEME.WARNING,
                    description: `${member.user.tag} has left the server.\n\nTotal members: ${member.guild.memberCount}`
                });
                
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error sending leave message:', error);
        }
    }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            return;
        }
    }
    
    if (reaction.message.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            return;
        }
    }
});

client.on(Events.Error, error => {
    ErrorHandler.handle(error, { module: 'Discord Client' });
});

client.on(Events.Warn, warning => {
    console.warn(`[Warning] ${warning}`);
});

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

async function handleSlashCommand(interaction) {
    const commandName = interaction.commandName;
    const command = commandRegistry.get(commandName);
    
    if (!command) {
        return interaction.reply({ content: 'Command not found!', ephemeral: true });
    }
    
    const rateLimit = RateLimiter.check(interaction.user.id, 'command');
    if (!rateLimit.allowed) {
        return interaction.reply({ 
            embeds: [ErrorHandler.createWarningEmbed('Rate Limited', 
                `You're sending commands too fast! Try again in ${Math.ceil(rateLimit.remaining / 60)} seconds.`)],
            ephemeral: true 
        });
    }
    
    const cooldown = CooldownManager.get(interaction.user.id, commandName);
    if (cooldown.onCooldown && cooldown.remaining > 0) {
        return interaction.reply({ 
            embeds: [ErrorHandler.createWarningEmbed('On Cooldown', 
                `This command is on cooldown. Try again in ${cooldown.remaining} seconds.`)],
            ephemeral: true 
        });
    }
    
    CooldownManager.set(interaction.user.id, commandName, (command.cooldown || 3) * 1000);
    STATE.commandCount++;
    
    try {
        UserDataManager.getUser(interaction.user.id);
        
        if (command.permissions && command.permissions.length > 0) {
            const hasPermission = command.permissions.every(perm => {
                if (interaction.memberPermissions) {
                    return interaction.memberPermissions.has(PermissionFlagsBits[perm]);
                }
                return false;
            });
            
            if (!hasPermission) {
                return interaction.reply({ 
                    embeds: [ErrorHandler.createWarningEmbed('Permission Denied', 
                        `You need the following permissions: ${command.permissions.join(', ')}`)],
                    ephemeral: true 
                });
            }
        }
        
        await command.execute(interaction);
    } catch (error) {
        ErrorHandler.handle(error, { 
            module: 'Command Handler', 
            command: commandName,
            user: interaction.user.id 
        });
        
        const errorEmbed = ErrorHandler.createErrorEmbed(error, commandName);
        
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
        } else if (interaction.replied) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
}

async function handleButtonInteraction(interaction) {
    const customId = interaction.customId;
    
    try {
        if (customId === 'verify_user') {
            const guildData = GuildDataManager.getGuild(interaction.guildId);
            if (guildData.verificationRole) {
                await interaction.member.roles.add(guildData.verificationRole);
            }
            
            await interaction.reply({ 
                embeds: [ErrorHandler.createSuccessEmbed('Verified!', 'You have been verified!')],
                ephemeral: true 
            });
        }
        
        if (customId === 'close_ticket') {
            await handleSlashCommand({
                commandName: 'close',
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                user: interaction.user,
                member: interaction.member,
                reply: (options) => interaction.reply(options),
                deferReply: () => interaction.deferReply(),
                editReply: (options) => interaction.editReply(options)
            }).catch(() => {});
        }
        
        if (customId.startsWith('giveaway_')) {
            const giveawayId = customId.replace('giveaway_', '');
            const giveaway = STATE.activeGiveaways.get(giveawayId);
            
            if (!giveaway || giveaway.endTime < Date.now()) {
                return interaction.reply({ content: 'This giveaway has ended!', ephemeral: true });
            }
            
            if (giveaway.participants.has(interaction.user.id)) {
                return interaction.reply({ content: 'You\'ve already entered this giveaway!', ephemeral: true });
            }
            
            giveaway.participants.add(interaction.user.id);
            
            await interaction.reply({ content: '✅ You\'ve entered the giveaway!', ephemeral: true });
        }
        
    } catch (error) {
        ErrorHandler.handle(error, { module: 'Button Handler', customId });
        await interaction.reply({ 
            embeds: [ErrorHandler.createErrorEmbed(error, 'Button Interaction')],
            ephemeral: true 
        }).catch(() => {});
    }
}

async function handleSelectMenuInteraction(interaction) {
    // Placeholder for select menu handling
    await interaction.reply({ content: 'Select menu interaction received!', ephemeral: true });
}

async function handleModalSubmit(interaction) {
    // Placeholder for modal submit handling
    await interaction.reply({ content: 'Modal submit received!', ephemeral: true });
}

// ============================================================================
// AI CONversation Handler
// ============================================================================

async function handleAIConversation(message) {
    try {
        await message.channel.sendTyping();
        
        const userData = UserDataManager.getUser(message.author.id);
        userData.stats.aiInteractions++;
        
        const response = await aiManager.generateWithRetry(message.content);
        const result = response.response.text();
        
        constChunks = [];
        const chunkSize = 4000;
        
        for (let i = 0; i < result.length; i += chunkSize) {
            constChunks.push(result.substring(i, i + chunkSize));
        }
        
        for (const chunk of theChunks) {
            const embed = EmbedFactory.createBaseEmbed({
                color: CONFIG.THEME.SECONDARY,
                description: chunk
            });
            
            await message.reply({ embeds: [embed] });
        }
    } catch (error) {
        ErrorHandler.handle(error, { module: 'AI Conversation', user: message.author.id });
        await message.reply({ 
            embeds: [ErrorHandler.createErrorEmbed(error, 'AI Response')] 
        }).catch(() => {});
    }
}

async function handleMention(message) {
    const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
    
    if (!cleanContent) {
        const embed = ErrorHandler.createInfoEmbed('Hey there!', 
            `I'm ${CONFIG.BOT_NAME}, created by ${CONFIG.CREATOR}. Use /help to see my commands!`);
        return message.reply({ embeds: [embed] });
    }
    
    await handleAIConversation(message);
}

async function checkStarboard(message) {
    if (!STATE.starboardChannelId) return;
    
    const reactions = message.reactions.cache;
    
    for (const reaction of reactions.values()) {
        if ((reaction.emoji.name === '⭐' || reaction.emoji.name === '🌟') && reaction.count >= 3) {
            try {
                const starboardChannel = await message.guild.channels.fetch(STATE.starboardChannelId);
                if (!starboardChannel) return;
                
                const embed = EmbedFactory.createBaseEmbed({
                    title: '⭐ Starred Message',
                    color: CONFIG.THEME.WARNING,
                    author: { name: message.author.tag, iconURL: message.author.displayAvatarURL() },
                    description: message.content || '[No content]',
                    fields: [
                        { name: 'Channel', value: message.channel.toString(), inline: true },
                        { name: 'Stars', value: reaction.count.toString(), inline: true },
                        { name: 'Jump', value: `[Go to message](${message.url})`, inline: true }
                    ],
                    timestamp: message.createdAt
                });
                
                if (message.attachments.size > 0) {
                    embed.setImage(message.attachments.first().url);
                }
                
                await starboardChannel.send({ embeds: [embed] });
                break;
            } catch (error) {
                console.error('Error adding to starboard:', error);
            }
        }
    }
}

// ============================================================================
// COMMAND DEPLOYMENT
// ============================================================================

async function deployCommands() {
    const commands = commandRegistry.getSlashCommandData();
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);
        
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// ============================================================================
// MAINTENANCE TASKS
// ============================================================================

function startMaintenanceTasks() {
    // Cleanup expired rate limits and cooldowns every 5 minutes
    setInterval(() => {
        RateLimiter.cleanup();
        CooldownManager.cleanup();
    }, 300000);
    
    // Update presence every 5 minutes
    setInterval(() => {
        const activities = [
            { name: `${CONFIG.BOT_NAME} v${CONFIG.BOT_VERSION}`, type: ActivityType.Watching },
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
            { name: 'Type /help for commands', type: ActivityType.Playing },
            { name: 'Creating code', type: ActivityType.Competing }
        ];
        
        const activity = activities[Math.floor(Math.random() * activities.length)];
        
        client.user.setPresence({
            status: PresenceUpdateStatus.Online,
            activities: [activity]
        });
    }, 300000);
    
    // Log memory usage every hour
    setInterval(() => {
        const memoryUsage = process.memoryUsage();
        console.log(`[Memory] Heap: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    }, 3600000);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', error => {
    ErrorHandler.handle(error, { module: 'Unhandled Rejection' });
});

process.on('uncaughtException', error => {
    ErrorHandler.handle(error, { module: 'Uncaught Exception' });
    // Don't exit the process, just log it
});

// ============================================================================
// BOT LOGIN
// ============================================================================

client.login(process.env.DISCORD_TOKEN);
