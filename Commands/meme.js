
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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
        .setName('meme')
        .setDescription('Get a random meme')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const response = await fetch('https://meme-api.com/gimme');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (!data.url) {
                throw new Error('No meme URL received from API');
            }

            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor());

            // Add title
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`😂 **${data.title || 'Random Meme'}**`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add meme image using MediaGallery
            if (data.url) {
                const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder().setURL(data.url)
                        )
                );

                container.addSeparatorComponents(separator => separator);
            }

            // Add meme info
            const memeInfo = [
                `📱 **Subreddit:** ${data.subreddit || 'Unknown'}`,
                `👤 **Author:** ${data.author || 'Unknown'}`,
                `👍 **Upvotes:** ${data.ups ? data.ups.toString() : '0'}`
            ].join('\n');

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(memeInfo)
            );

            // Add original post link if available
            if (data.postLink) {
                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🔗 [View Original Post](${data.postLink})`)
                );
            }

            // Add footer
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`*Requested by ${interaction.user.username} • Powered by meme-api.com*`)
            );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error fetching meme:', error);

            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            errorContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ **Meme Fetch Failed**\n\nSorry, I couldn\'t fetch a meme right now. The API might be temporarily unavailable. Please try again later.')
            );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
