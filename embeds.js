// embeds.js
const { EmbedBuilder } = require('discord.js');

const EMBED_COLORS = {
    SUCCESS: 0x00FF00,
    ERROR: 0xFF0000,
    INFO: 0x0099FF
};

const EmbedFactory = {
    // Standard response for video analysis
    createVideoAnalysisEmbed: (summary) => {
        return new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle("Video Analysis Complete")
            .setDescription(summary.substring(0, 4096))
            .setTimestamp()
            .setFooter({ text: "Sil0v AI | Powered by N0V" });
    },

    // Standard response for system errors
    createErrorEmbed: (message) => {
        return new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle("System Error")
            .setDescription(message)
            .setTimestamp();
    }
};

module.exports = { EmbedFactory };
