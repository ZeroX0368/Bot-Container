
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { replyV2, sendV2 } = require('../Container/sendV2');
const { createErrorContainer, createInfoContainer, buildContainerFromEmbedShape } = require('../Container/container');
const config = require('../config.json');

// Helper function to get embed color from config
function getEmbedColor() {
    const color = config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

// Helper function to get error color from config
function getErrorColor() {
    const color = config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to a channel')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The announcement message')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the announcement to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addRoleOption(option =>
            option
                .setName('mention')
                .setDescription('Role to mention in the announcement')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = createErrorContainer(
                'You need **Manage Messages** and **Use Application Commands** permissions to use this command!',
                interaction.client
            );

            return await replyV2(interaction, { 
                embed: errorContainer, 
                ephemeral: true 
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.SendMessages) ||
            !interaction.guild.members.me.permissions.has(PermissionFlagsBits.EmbedLinks)) {
            const errorContainer = createErrorContainer(
                'I need **Send Messages** and **Embed Links** permissions to execute this command!',
                interaction.client
            );

            return await replyV2(interaction, { 
                embed: errorContainer, 
                ephemeral: true 
            });
        }

        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const mentionRole = interaction.options.getRole('mention');

        try {
            // Check if bot can send messages to the target channel
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                const errorContainer = createErrorContainer(
                    `I don't have permission to send messages in ${channel}!`,
                    interaction.client
                );

                return await replyV2(interaction, { 
                    embed: errorContainer, 
                    ephemeral: true 
                });
            }

            // Create the announcement container with role mention embedded if provided
            let announcementDescription = message;
            if (mentionRole) {
                announcementDescription = `${mentionRole}\n\n${message}`;
            }

            const announcementContainer = buildContainerFromEmbedShape({
                title: '📢・Announcement!',
                description: announcementDescription,
                color: getEmbedColor(),
                timestamp: new Date(),
                footer: { 
                    text: `announce by: ${interaction.user.username}`
                }
            });

            // Send the announcement to the target channel (no content field with Components V2)
            await sendV2(channel, {
                embed: announcementContainer
            });

            // Create success confirmation container
            const successContainer = buildContainerFromEmbedShape({
                title: '✅ Announcement Sent',
                description: 'Announcement has been sent successfully!',
                color: getEmbedColor(),
                fields: [
                    {
                        name: '📘┆Channel',
                        value: `${channel} (${channel.name})`,
                        inline: true
                    }
                ],
                timestamp: new Date()
            });

            if (mentionRole) {
                successContainer.addSeparatorComponents(separator => separator);
                successContainer.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**🏷️┆Mentioned Role**\n${mentionRole} (${mentionRole.name})`)
                );
            }

            await replyV2(interaction, { 
                embed: successContainer 
            });

        } catch (error) {
            console.error('Announce command error:', error);
            
            const errorContainer = createErrorContainer(
                'An error occurred while sending the announcement!',
                interaction.client
            );

            await replyV2(interaction, { 
                embed: errorContainer, 
                ephemeral: true 
            });
        }
    },
};
