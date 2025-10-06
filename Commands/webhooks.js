
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../config.json');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
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
        .setName('webhook')
        .setDescription('Manage webhooks in this server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new webhook')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to create webhook in (defaults to current channel)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the webhook (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a webhook')
                .addStringOption(option =>
                    option
                        .setName('webhook_url')
                        .setDescription('The webhook URL to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all webhooks in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('say')
                .setDescription('Send a message through a webhook')
                .addStringOption(option =>
                    option
                        .setName('webhook_url')
                        .setDescription('The webhook URL to use')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The message to send')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Custom username for the webhook')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('avatar_url')
                        .setDescription('Custom avatar URL for the webhook')
                        .setRequired(false))),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Webhooks" permission to use this command.',
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
            return await interaction.reply({
                content: '❌ I need "Manage Webhooks" permission to execute this command.',
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'delete':
                    await handleDelete(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                case 'say':
                    await handleSay(interaction);
                    break;
                default:
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(getErrorColor(interaction.client))
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent('❌ Unknown subcommand.')
                        );
                    
                    await interaction.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in webhook command:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ An error occurred while executing the command.')
                );

            const reply = {
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleCreate(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const name = interaction.options.getString('name') || `Webhook-${Date.now()}`;

    try {
        const webhook = await channel.createWebhook({
            name: name,
            reason: `Webhook created by ${interaction.user.tag} via bot command`
        });

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`✅ **Webhook Created Successfully**\n\n**Name:** ${webhook.name}\n**Channel:** <#${channel.id}>\n**ID:** ${webhook.id}`)
        );

        container.addSeparatorComponents(separator => separator);

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Webhook URL:**\n||${webhook.url}||`)
        );

        container.addSeparatorComponents(separator => separator);

        const currentTime = Math.floor(Date.now() / 1000);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Created by ${interaction.user.tag} • <t:${currentTime}:R>*`)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error creating webhook:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to create webhook. Make sure I have permission to manage webhooks in that channel.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const webhookUrl = interaction.options.getString('webhook_url');

    try {
        // Extract webhook ID and token from URL
        const webhookRegex = /https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/;
        const match = webhookUrl.match(webhookRegex);

        if (!match) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Invalid webhook URL format.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const [, webhookId, webhookToken] = match;

        // Delete the webhook
        const response = await fetch(`https://discord.com/api/v10/webhooks/${webhookId}/${webhookToken}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Webhook Deleted Successfully**\n\n**Webhook ID:** ${webhookId}\n**Deleted by:** ${interaction.user.tag}`)
            );

            container.addSeparatorComponents(separator => separator);

            const currentTime = Math.floor(Date.now() / 1000);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`*<t:${currentTime}:R>*`)
            );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Failed to delete webhook. The webhook may not exist or the URL is invalid.')
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    } catch (error) {
        console.error('Error deleting webhook:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ An error occurred while deleting the webhook.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleList(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const webhooks = await interaction.guild.fetchWebhooks();
        const webhookArray = Array.from(webhooks.values());

        if (webhookArray.length === 0) {
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('📭 **No Webhooks Found**\n\nThere are no webhooks in this server.')
                );

            return await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Create containers for pagination
        const containers = [];
        const itemsPerPage = 5;

        for (let i = 0; i < webhookArray.length; i += itemsPerPage) {
            const pageWebhooks = webhookArray.slice(i, i + itemsPerPage);
            const container = createWebhookListContainer(pageWebhooks, i, webhookArray.length, interaction.client);
            containers.push(container);
        }

        // Use pagination if multiple pages, otherwise show single page
        if (containers.length > 1) {
            await paginationWithIntegratedButtons(interaction, containers, true);
        } else {
            await interaction.editReply({
                components: [containers[0]],
                flags: MessageFlags.IsComponentsV2
            });
        }

    } catch (error) {
        console.error('Error listing webhooks:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to fetch webhooks. Make sure I have permission to manage webhooks.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

function createWebhookListContainer(webhooks, startIndex, totalWebhooks, client) {
    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(client));

    // Add header section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`🔗 **Server Webhooks**\nTotal: ${totalWebhooks} webhook${totalWebhooks !== 1 ? 's' : ''}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add each webhook as a section
    webhooks.forEach((webhook, index) => {
        const globalIndex = startIndex + index + 1;
        const createdAt = Math.floor(webhook.createdAt.getTime() / 1000);

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**${globalIndex}. ${webhook.name}**\n**Channel:** <#${webhook.channelId}>\n**ID:** \`${webhook.id}\`\n**Created:** <t:${createdAt}:R>`)
        );

        if (index < webhooks.length - 1) {
            container.addSeparatorComponents(separator => separator);
        }
    });

    return container;
}

async function handleSay(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const webhookUrl = interaction.options.getString('webhook_url');
    const message = interaction.options.getString('message');
    const username = interaction.options.getString('username');
    const avatarUrl = interaction.options.getString('avatar_url');

    try {
        // Validate webhook URL format
        const webhookRegex = /https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/;
        if (!webhookRegex.test(webhookUrl)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Invalid webhook URL format.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const payload = {
            content: message
        };

        if (username) {
            payload.username = username;
        }

        if (avatarUrl) {
            payload.avatar_url = avatarUrl;
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Message Sent Successfully**\n\n**Message:** ${message.substring(0, 1000)}${message.length > 1000 ? '...' : ''}`)
            );

            container.addSeparatorComponents(separator => separator);

            let metadata = `**Sent by:** ${interaction.user.tag}`;
            if (username) {
                metadata += `\n**Username:** ${username}`;
            }

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(metadata)
            );

            container.addSeparatorComponents(separator => separator);

            const currentTime = Math.floor(Date.now() / 1000);
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`*<t:${currentTime}:R>*`)
            );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } else {
            const errorText = await response.text();
            console.error('Webhook error:', response.status, errorText);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ Failed to send message through webhook. The webhook may be invalid or deleted.')
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    } catch (error) {
        console.error('Error sending webhook message:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ An error occurred while sending the message.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

/**
 * Container pagination with buttons integrated into the container
 */
async function paginationWithIntegratedButtons(interaction, containers, ephemeral) {
    try {
        if (!interaction || !containers || containers.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (containers.length === 1) {
            return await interaction.editReply({ 
                components: [containers[0]], 
                flags: MessageFlags.IsComponentsV2 
            });
        }

        let index = 0;

        const first = new ButtonBuilder()
            .setCustomId('pagefirst')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const prev = new ButtonBuilder()
            .setCustomId('pageprev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const pageCount = new ButtonBuilder()
            .setCustomId('pagecount')
            .setLabel(`${index + 1}/${containers.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId('pagenext')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('pagelast')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

        // Clone the container and add buttons directly to it
        const containerWithButtons = new ContainerBuilder(containers[index].toJSON());
        containerWithButtons.addActionRowComponents(buttons);

        const msg = await interaction.editReply({ 
            components: [containerWithButtons], 
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these buttons.`, 
                    ephemeral: true 
                });
            }

            if (i.customId === 'pagefirst') {
                index = 0;
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < containers.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = containers.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${containers.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === containers.length - 1);
            last.setDisabled(index === containers.length - 1);

            // Clone the container and add updated buttons
            const updatedContainer = new ContainerBuilder(containers[index].toJSON());
            updatedContainer.addActionRowComponents(buttons);

            await i.update({ 
                components: [updatedContainer],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [containers[index]], 
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });
        });

        return msg;

    } catch (e) {
        console.error(`[ERROR] ${e}`);
    }
}
