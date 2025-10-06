
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');
const { buildContainerFromEmbedShape } = require('../Container/container');
const config = require('../config.json');

// Helper function to get embed color from config
function getEmbedColor() {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

// Helper function to get error color from config
function getErrorColor() {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Send a message to a channel')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to send')
                .setRequired(true)
                .setMaxLength(2000))
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the message to')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

    async execute(interaction) {
        // Check bot permissions
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages) ||
            !botMember.permissions.has(PermissionFlagsBits.ViewChannel) ||
            !botMember.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            
            const container = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Bot Missing Permissions**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('I need "Manage Messages", "View Channel", and "Use Application Commands" permissions!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check user permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
            !interaction.member.permissions.has(PermissionFlagsBits.ViewChannel) ||
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            
            const container = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **No Permission**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You need "Manage Messages", "View Channel", and "Use Application Commands" permissions!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Check if bot can send messages in target channel
        if (!targetChannel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
            const container = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Cannot Send Message**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`I don't have permission to send messages in ${targetChannel}!`)
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        // Check if user can send messages in target channel
        if (!targetChannel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
            const container = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **No Permission**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`You don't have permission to send messages in ${targetChannel}!`)
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        try {
            // Send the message to the target channel using container system
            const messageContainer = buildContainerFromEmbedShape({
                description: message,
                color: getEmbedColor(),
                footer: {
                    text: `Sent by ${interaction.user.tag}`
                },
                timestamp: new Date()
            });

            await targetChannel.send({
                components: [messageContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Send success confirmation using buildContainerFromEmbedShape
            const container = buildContainerFromEmbedShape({
                title: '✅ Message Sent Successfully',
                description: `Message sent to ${targetChannel}`,
                color: getEmbedColor(),
                fields: [
                    {
                        name: '📝 Message Content',
                        value: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
                        inline: false
                    }
                ],
                timestamp: new Date(),
                footer: {
                    text: `ID: ${interaction.user.id}`
                }
            });

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });

        } catch (error) {
            console.error('Echo command error:', error);
            
            const container = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Error**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while sending the message!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};
