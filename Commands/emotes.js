
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
} = require("discord.js");
const config = require('../config.json');

// Helper function to get colors from config
function getEmbedColor() {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor() {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emotes')
        .setDescription('Display server emotes')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Display all server emotes with statistics')
        ),

    async execute(interaction) {
        // Check user permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Permission Denied**\n\nYou need **Use Application Commands** permission to use this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        // Check bot permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Bot Permission Denied**\n\nI need **Use Application Commands** permission to execute this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'server':
                    await handleServerEmotes(interaction);
                    break;
            }
        } catch (error) {
            console.error('Emotes command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**\n\nAn error occurred while fetching server emotes!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }
    },
};

async function handleServerEmotes(interaction) {
    const guild = interaction.guild;
    const emojis = guild.emojis.cache;

    // Separate static and animated emojis
    const staticEmojis = emojis.filter(emoji => !emoji.animated);
    const animatedEmojis = emojis.filter(emoji => emoji.animated);
    const totalEmojis = emojis.size;

    if (totalEmojis === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**📱 Server Emotes**\n\nThis server has no custom emotes!")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${guild.name} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });
    }

    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor());

    // Add title and statistics
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**📱 Server Emotes**\n\n**${staticEmojis.size} Static, ${animatedEmojis.size} Animated (${totalEmojis}) Total**`)
    );

    container.addSeparatorComponents(separator => separator);

    // Display static emojis if any
    if (staticEmojis.size > 0) {
        const staticEmoteList = staticEmojis.map(emoji => `${emoji}`).join(' ');
        
        // Split into chunks if too long (Discord has message limits)
        const maxLength = 1800;
        if (staticEmoteList.length <= maxLength) {
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Static Emotes [${staticEmojis.size}]**\n${staticEmoteList}`)
            );
        } else {
            // Split static emojis into multiple parts
            const staticArray = staticEmojis.map(emoji => `${emoji}`);
            let currentChunk = '';
            let chunkNumber = 1;
            
            for (const emoji of staticArray) {
                if ((currentChunk + emoji + ' ').length > maxLength) {
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**Static Emotes [${staticEmojis.size}] - Part ${chunkNumber}**\n${currentChunk}`)
                    );
                    currentChunk = emoji + ' ';
                    chunkNumber++;
                } else {
                    currentChunk += emoji + ' ';
                }
            }
            
            // Add remaining chunk
            if (currentChunk.trim()) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Static Emotes [${staticEmojis.size}] - Part ${chunkNumber}**\n${currentChunk}`)
                );
            }
        }
        
        if (animatedEmojis.size > 0) {
            container.addSeparatorComponents(separator => separator);
        }
    }

    // Display animated emojis if any
    if (animatedEmojis.size > 0) {
        const animatedEmoteList = animatedEmojis.map(emoji => `${emoji}`).join(' ');
        
        // Split into chunks if too long
        const maxLength = 1800;
        if (animatedEmoteList.length <= maxLength) {
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Animated Emotes [${animatedEmojis.size}]**\n${animatedEmoteList}`)
            );
        } else {
            // Split animated emojis into multiple parts
            const animatedArray = animatedEmojis.map(emoji => `${emoji}`);
            let currentChunk = '';
            let chunkNumber = 1;
            
            for (const emoji of animatedArray) {
                if ((currentChunk + emoji + ' ').length > maxLength) {
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**Animated Emotes [${animatedEmojis.size}] - Part ${chunkNumber}**\n${currentChunk}`)
                    );
                    currentChunk = emoji + ' ';
                    chunkNumber++;
                } else {
                    currentChunk += emoji + ' ';
                }
            }
            
            // Add remaining chunk
            if (currentChunk.trim()) {
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Animated Emotes [${animatedEmojis.size}] - Part ${chunkNumber}**\n${currentChunk}`)
                );
            }
        }
    }

    container.addSeparatorComponents(separator => separator);

    // Add footer
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*${guild.name} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
    );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}
