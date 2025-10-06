
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");
const config = require('../config.json');

// Helper functions to get colors from config
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
        .setName("channelinfo")
        .setDescription("Display detailed information about a channel")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("The channel to get information about")
                .setRequired(false)
        ),

    async execute(interaction) {
        // Check if user has ViewChannel and UseApplicationCommands permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ViewChannel) ||
            !interaction.member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Permission Denied**")
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("You need **View Channel** and **Use Application Commands** permissions to use this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        // Check if bot has ViewChannel and UseApplicationCommands permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ViewChannel) ||
            !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Bot Permission Denied**")
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("I need **View Channel** and **Use Application Commands** permissions to execute this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        try {
            await handleChannelInfo(interaction);
        } catch (error) {
            console.error('Channel info command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**")
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("An error occurred while executing the command!")
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

async function handleChannelInfo(interaction) {
    // Get the target channel (if not specified, use current channel)
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

    // Check if user can view the target channel
    if (!targetChannel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ViewChannel)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**❌ Permission Denied**")
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("You don't have permission to view that channel!")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        return await interaction.reply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    // Get channel type name
    const channelTypeNames = {
        [ChannelType.GuildText]: "GuildText",
        [ChannelType.DM]: "DM",
        [ChannelType.GuildVoice]: "GuildVoice",
        [ChannelType.GroupDM]: "GroupDM",
        [ChannelType.GuildCategory]: "GuildCategory",
        [ChannelType.GuildAnnouncement]: "GuildAnnouncement",
        [ChannelType.AnnouncementThread]: "AnnouncementThread",
        [ChannelType.PublicThread]: "PublicThread",
        [ChannelType.PrivateThread]: "PrivateThread",
        [ChannelType.GuildStageVoice]: "GuildStageVoice",
        [ChannelType.GuildForum]: "GuildForum"
    };

    const channelTypeName = channelTypeNames[targetChannel.type] || "Unknown";

    // Format creation timestamp
    const createdTimestamp = Math.floor(targetChannel.createdTimestamp / 1000);

    // Get category name
    const categoryName = targetChannel.parent ? targetChannel.parent.name : "No category";

    // Get channel topic
    const channelTopic = targetChannel.topic || "No topic";

    // Check if channel is NSFW
    const isNSFW = targetChannel.nsfw ? "Yes" : "No";

    // Get channel URL
    const channelURL = `https://discord.com/channels/${interaction.guild.id}/${targetChannel.id}`;

    // Create container
    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**📋 Channel Info: ${targetChannel.name}**`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ ID:** \`${targetChannel.id}\``)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Type:** ${channelTypeName}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Created:** <t:${createdTimestamp}:R>`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Category:** ${categoryName}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Position:** ${targetChannel.position}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ NSFW:** ${isNSFW}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Topic:** ${channelTopic}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Channel:** ${channelURL}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**✦ Channel URL:** \`\`${channelURL}\`\``)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*-# Requested by <@${interaction.user.id}>*`)
        );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] }
    });
}
