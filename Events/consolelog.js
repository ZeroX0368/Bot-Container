
const { ContainerBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

// Hardcoded console log channel ID
const CONSOLE_LOG_CHANNEL_ID = '1385273334484435108';

// Helper function to get colors from config
function getEmbedColor() {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor() {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

// Override console methods to capture and relay to Discord
function setupConsoleCapture(client) {
    console.log = function(...args) {
        originalLog.apply(console, args);
        sendConsoleMessage(client, 'LOG', args);
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        sendConsoleMessage(client, 'ERROR', args);
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        sendConsoleMessage(client, 'WARN', args);
    };

    console.info = function(...args) {
        originalInfo.apply(console, args);
        sendConsoleMessage(client, 'INFO', args);
    };
}

async function sendConsoleMessage(client, type, args) {
    try {
        const channel = client.channels.cache.get(CONSOLE_LOG_CHANNEL_ID);
        if (!channel) return;

        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        // Skip empty messages
        if (!message.trim()) return;

        const timestamp = new Date().toLocaleString();
        const typeEmoji = {
            'ERROR': '❌',
            'WARN': '⚠️',
            'INFO': 'ℹ️',
            'LOG': '📝'
        }[type] || '📝';

        const typeColor = {
            'ERROR': getErrorColor(),
            'WARN': parseInt('FFA500', 16), // Orange
            'INFO': parseInt('00BFFF', 16), // Deep Sky Blue
            'LOG': getEmbedColor()
        }[type] || getEmbedColor();

        // Truncate message if too long (Discord has limits)
        const truncatedMessage = message.length > 1800 ? 
            message.substring(0, 1800) + '...\n[Message truncated]' : 
            message;

        const container = new ContainerBuilder()
            .setAccentColor(typeColor)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`${typeEmoji} **Console ${type}**\n\`\`\`\n${truncatedMessage}\`\`\`\n*${timestamp}*`)
            );

        await channel.send({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        // Use original console.error to prevent infinite loop
        originalError('Failed to send console log to Discord:', error);
    }
}

module.exports = {
    name: 'ready',
    once: false,
    execute(client) {
        // Set up console capture when the bot is ready
        setupConsoleCapture(client);
        
        // Send initial message if console logging is configured
        const channel = client.channels.cache.get(CONSOLE_LOG_CHANNEL_ID);
        if (channel) {
            originalLog('Console logging event handler initialized for Replit instance.');
        }
    },
};
