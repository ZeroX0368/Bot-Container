const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require("discord.js");
const config = require('../config.json');

// Helper functions to get colors from config
function getEmbedColor(client) {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Server information and management commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Display detailed server information")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("icon")
                .setDescription("Display the server's icon")
        ),

    async execute(interaction) {
        // Check if user has SendMessages permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(this.client)) // Use helper function
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('You need **Use Application Commands** permission to use this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check if bot has SendMessages permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(this.client)) // Use helper function
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Bot Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('I need **Send Messages** permission to execute this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "info":
                    await handleServerInfo(interaction);
                    break;
                case "icon":
                    await handleServerIcon(interaction);
                    break;
            }
        } catch (error) {
            console.error('Server command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(this.client)) // Use helper function
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Error**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('An error occurred while executing the command!')
                );

            await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};

async function handleServerInfo(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();

    // Get server statistics
    const totalMembers = guild.memberCount;
    const roleCount = guild.roles.cache.size;
    const channelCount = guild.channels.cache.size;

    // Get server owner
    const owner = await guild.fetchOwner();

    // Format creation date
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    // Get emojis
    const emojis = guild.emojis.cache;
    const emojiDisplay = emojis.size > 0
        ? emojis.map(emoji => `<:${emoji.name}:${emoji.id}>`).slice(0, 30).join(' ')
        : 'No custom emojis';

    // Create container with orange accent color (matching the image)
    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(this.client)); // Use helper function

    // Add server name and basic info with thumbnail in a section
    if (guild.iconURL()) {
        try {
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**${guild.name}**`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(guild.iconURL({ size: 256 }))
                    )
            );
        } catch (error) {
            console.warn('Failed to add server thumbnail:', error);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**${guild.name}**`)
            );
        }
    } else {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**${guild.name}**`)
        );
    }

    container.addSeparatorComponents(separator => separator);

    // Server Owner
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Server Owner**\n@${owner.user.username} (${owner.user.tag})`)
    );

    // Server ID
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**ID**\n${guild.id}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Members
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Members**\n${totalMembers}`)
    );

    // Server Description
    const serverDescription = guild.description || 'N/A';
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Description**\n${serverDescription}`)
    );

    // Roles
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Roles**\n${roleCount}`)
    );

    // Channels
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Channels**\n${channelCount}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Created date
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Created**\n<t:${createdTimestamp}:F>`)
    );

    // Emoji List
    if (emojis.size > 0) {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Emoji List [${emojis.size}]**\n${emojiDisplay}`)
        );
    }

    container.addSeparatorComponents(separator => separator);

    // Footer with user info
    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*${interaction.user.username} | <t:${timestamp}:t>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleServerIcon(interaction) {
    const guild = interaction.guild;
    
    if (!guild.iconURL()) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(this.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **No Server Icon**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('This server does not have an icon set.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(this.client));

    // Add server name
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**${guild.name} Icon**`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add high-resolution server icon using MediaGallery
    try {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(guild.iconURL({ size: 4096 }))
                )
        );
    } catch (error) {
        console.warn('Failed to add server icon to container:', error);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent('❌ Failed to display server icon')
        );
    }

    // Add download link
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`🔗 [Download Icon](${guild.iconURL({ size: 4096 })})`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}