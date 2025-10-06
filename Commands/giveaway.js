
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = client.config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = client.config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

// In-memory storage for giveaways (in production, use a database)
const activeGiveaways = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration (e.g., 1m, 1h, 1d)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addStringOption(option =>
                    option
                        .setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to host the giveaway (defaults to current channel)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('requirements')
                        .setDescription('Requirements to enter (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option
                        .setName('messageid')
                        .setDescription('Message ID of the giveaway to end')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll winners for a giveaway')
                .addStringOption(option =>
                    option
                        .setName('messageid')
                        .setDescription('Message ID of the giveaway to reroll')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a giveaway')
                .addStringOption(option =>
                    option
                        .setName('messageid')
                        .setDescription('Message ID of the giveaway to delete')
                        .setRequired(true))),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
            !interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ You need "Manage Messages" and "Use Application Commands" permissions to use this command.')
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
                case 'start':
                    await handleStartGiveaway(interaction);
                    break;
                case 'end':
                    await handleEndGiveaway(interaction);
                    break;
                case 'reroll':
                    await handleRerollGiveaway(interaction);
                    break;
                case 'list':
                    await handleListGiveaways(interaction);
                    break;
                case 'delete':
                    await handleDeleteGiveaway(interaction);
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
            console.error('Error in giveaway command:', error);
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

async function handleStartGiveaway(interaction) {
    await interaction.deferReply();

    const duration = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const requirements = interaction.options.getString('requirements') || 'None';

    // Parse duration
    const durationMs = parseDuration(duration);
    if (!durationMs) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Invalid duration format. Use formats like: 1m, 1h, 1d, 2w')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    const endTime = Date.now() + durationMs;
    const endTimestamp = Math.floor(endTime / 1000);

    // Create giveaway container
    const giveawayContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('🎉 **GIVEAWAY** 🎉')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${endTimestamp}:R>\n**Requirements:** ${requirements}\n**Hosted by:** ${interaction.user}`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('Click the 🎉 button below to enter!')
        );

    // Create join button
    const joinButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_join_${Date.now()}`)
                .setLabel('🎉 Enter Giveaway')
                .setStyle(ButtonStyle.Primary)
        );

    try {
        const giveawayMessage = await channel.send({
            components: [giveawayContainer, joinButton],
            flags: MessageFlags.IsComponentsV2
        });

        // Store giveaway data
        const giveawayData = {
            messageId: giveawayMessage.id,
            channelId: channel.id,
            guildId: interaction.guild.id,
            hostId: interaction.user.id,
            prize: prize,
            winners: winners,
            requirements: requirements,
            endTime: endTime,
            participants: new Set(),
            ended: false
        };

        activeGiveaways.set(giveawayMessage.id, giveawayData);

        // Set timeout to end giveaway
        setTimeout(() => endGiveawayAuto(giveawayMessage.id, interaction.client), durationMs);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`✅ **Giveaway Started!**\n\nGiveaway has been created in ${channel}!\nMessage ID: \`${giveawayMessage.id}\``)
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error creating giveaway:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to create giveaway. Please check my permissions.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleEndGiveaway(interaction) {
    await interaction.deferReply();

    const messageId = interaction.options.getString('messageid');
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Giveaway not found or already ended.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    if (giveaway.hostId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You can only end giveaways you created (or be an administrator).')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    await endGiveaway(messageId, interaction.client, true);

    const successContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent('✅ **Giveaway Ended!**\n\nThe giveaway has been ended early and winners have been selected.')
        );

    await interaction.editReply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleRerollGiveaway(interaction) {
    await interaction.deferReply();

    const messageId = interaction.options.getString('messageid');
    
    // Check if giveaway exists (even if ended)
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Giveaway not found.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    if (giveaway.hostId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You can only reroll giveaways you created (or be an administrator).')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    const winners = selectWinners(Array.from(giveaway.participants), giveaway.winners);

    if (winners.length === 0) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ No participants to reroll from.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const winnersText = winners.map(id => `<@${id}>`).join(', ');

        const rerollContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🎉 **GIVEAWAY REROLLED** 🎉')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**New Winner${winners.length > 1 ? 's' : ''}:** ${winnersText}\n**Prize:** ${giveaway.prize}\n**Rerolled by:** ${interaction.user}`)
            );

        await channel.send({
            components: [rerollContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Giveaway Rerolled!**\n\nNew winners have been selected and announced.')
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error rerolling giveaway:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to reroll giveaway.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleListGiveaways(interaction) {
    await interaction.deferReply();

    const guildGiveaways = Array.from(activeGiveaways.values())
        .filter(g => g.guildId === interaction.guild.id && !g.ended);

    if (guildGiveaways.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📋 **Active Giveaways**\n\nNo active giveaways in this server.')
            );

        return await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    let giveawayList = '';
    guildGiveaways.forEach((giveaway, index) => {
        const endTimestamp = Math.floor(giveaway.endTime / 1000);
        giveawayList += `**${index + 1}.** ${giveaway.prize}\n`;
        giveawayList += `   • Winners: ${giveaway.winners}\n`;
        giveawayList += `   • Ends: <t:${endTimestamp}:R>\n`;
        giveawayList += `   • Participants: ${giveaway.participants.size}\n`;
        giveawayList += `   • Message ID: \`${giveaway.messageId}\`\n\n`;
    });

    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`📋 **Active Giveaways**\n\n${giveawayList}`)
        );

    await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleDeleteGiveaway(interaction) {
    await interaction.deferReply();

    const messageId = interaction.options.getString('messageid');
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Giveaway not found.')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    if (giveaway.hostId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You can only delete giveaways you created (or be an administrator).')
            );

        return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId).catch(() => null);

        if (message) {
            await message.delete();
        }

        activeGiveaways.delete(messageId);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('✅ **Giveaway Deleted!**\n\nThe giveaway has been deleted successfully.')
            );

        await interaction.editReply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error deleting giveaway:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ Failed to delete giveaway.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

// Utility functions
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([smhdw])$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

function selectWinners(participants, winnerCount) {
    if (participants.length === 0) return [];
    
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(winnerCount, participants.length));
}

async function endGiveaway(messageId, client, manual = false) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway || giveaway.ended) return;

    giveaway.ended = true;

    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId);

        const winners = selectWinners(Array.from(giveaway.participants), giveaway.winners);

        // Update original message
        const endedContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('🎉 **GIVEAWAY ENDED** 🎉')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Prize:** ${giveaway.prize}\n**Winners:** ${giveaway.winners}\n**Participants:** ${giveaway.participants.size}\n**Requirements:** ${giveaway.requirements}\n**Hosted by:** <@${giveaway.hostId}>`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(winners.length > 0 ? `**Winner${winners.length > 1 ? 's' : ''}:** ${winners.map(id => `<@${id}>`).join(', ')}` : '**No valid entries!**')
            );

        await message.edit({
            components: [endedContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // Send winner announcement
        if (winners.length > 0) {
            const winnerContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor(client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🎉 **Congratulations!** 🎉\n\n${winners.map(id => `<@${id}>`).join(', ')}\n\nYou won **${giveaway.prize}**!`)
                );

            await channel.send({
                components: [winnerContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}

async function endGiveawayAuto(messageId, client) {
    await endGiveaway(messageId, client, false);
}

// Export functions for button handler
module.exports.activeGiveaways = activeGiveaways;
module.exports.getEmbedColor = getEmbedColor;
module.exports.getErrorColor = getErrorColor;
