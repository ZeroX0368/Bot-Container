
const {
    SlashCommandBuilder,
    ContainerBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
    StringSelectMenuBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
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
        .setName("serverlist")
        .setDescription("Display all servers the bot is in (Owner only)"),

    async execute(interaction) {
        // Check if user is the bot owner
        if (interaction.user.id !== config.OwnerID) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Owner Only**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('This command can only be used by the bot owner!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        try {
            const guilds = Array.from(interaction.client.guilds.cache.values());
            
            if (guilds.length === 0) {
                const emptyContainer = new ContainerBuilder()
                    .setAccentColor(getEmbedColor())
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent('📭 **No Servers**\n\nThe bot is not in any servers.')
                    );

                return await interaction.editReply({
                    components: [emptyContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Create containers for pagination
            const containers = [];
            const serversPerPage = 5;
            const totalPages = Math.ceil(guilds.length / serversPerPage);

            for (let page = 0; page < totalPages; page++) {
                const start = page * serversPerPage;
                const end = start + serversPerPage;
                const currentServers = guilds.slice(start, end);

                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor());

                // Title
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`🌐 **Server List** (${guilds.length} total)`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add servers for this page
                for (const guild of currentServers) {
                    let serverInfo = `**${guild.name}**\n`;
                    serverInfo += `📊 Members: ${guild.memberCount}\n`;
                    serverInfo += `🆔 ID: ${guild.id}\n`;
                    serverInfo += `📅 Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
                    
                    if (guild.description) {
                        serverInfo += `\n📝 Description: ${guild.description.slice(0, 100)}${guild.description.length > 100 ? '...' : ''}`;
                    }

                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(serverInfo)
                    );

                    // Add server icon as thumbnail if available
                    if (guild.iconURL()) {
                        container.addSectionComponents(
                            section => section
                                .addTextDisplayComponents(
                                    textDisplay => textDisplay.setContent(`**Server Icon**`)
                                )
                                .setThumbnailAccessory(
                                    thumbnail => thumbnail
                                        .setURL(guild.iconURL({ size: 256 }))
                                )
                        );
                    }

                    container.addSeparatorComponents(separator => separator);
                }

                // Page info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*Page ${page + 1} of ${totalPages}*`)
                );

                containers.push(container);
            }

            // Use pagination if multiple pages
            if (containers.length > 1) {
                await pagination(interaction, containers, false);
            } else {
                // Single page - add select menu
                const selectMenu = createServerSelectMenu(guilds.slice(0, serversPerPage), 0);
                containers[0].addActionRowComponents(
                    actionRow => actionRow.setComponents(selectMenu)
                );

                await interaction.editReply({
                    components: [containers[0]],
                    flags: MessageFlags.IsComponentsV2
                });

                // Set up select menu collector
                const filter = i => i.customId.startsWith('server_select_') && i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 300000 // 5 minutes
                });

                collector.on('collect', async i => {
                    const serverId = i.values[0];
                    const guild = interaction.client.guilds.cache.get(serverId);
                    
                    if (guild) {
                        await handleServerInfo(i, guild);
                    }
                });
            }

        } catch (error) {
            console.error('Serverlist command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Error**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('An error occurred while fetching server list!')
                );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};

/**
 * Create select menu for servers on current page
 */
function createServerSelectMenu(servers, pageIndex) {
    const options = servers.map(guild => ({
        label: guild.name.slice(0, 100),
        description: `${guild.memberCount} members • ID: ${guild.id}`,
        value: guild.id
    }));

    return new StringSelectMenuBuilder()
        .setCustomId(`server_select_${pageIndex}`)
        .setPlaceholder('🌐 Select a server to view details...')
        .addOptions(options);
}

/**
 * Handle server info display
 */
async function handleServerInfo(interaction, guild) {
    await guild.members.fetch();

    const owner = await guild.fetchOwner();
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
    
    // Generate invite link
    let inviteLink = 'No invite available';
    try {
        const channels = guild.channels.cache.filter(c => c.type === 0); // Text channels
        if (channels.size > 0) {
            const channel = channels.first();
            if (channel.permissionsFor(guild.members.me).has('CreateInstantInvite')) {
                const invite = await channel.createInvite({
                    maxAge: 0,
                    maxUses: 0,
                    reason: 'Server info command'
                });
                inviteLink = `https://discord.gg/${invite.code}`;
            }
        }
    } catch (error) {
        console.warn('Failed to create invite:', error);
    }

    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor());

    // Server name with icon using section with thumbnail
    const serverNameContent = `🌐 **${guild.name}**`;
    
    if (guild.iconURL()) {
        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(serverNameContent)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail.setURL(guild.iconURL({ size: 256 }))
                )
        );
    } else {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(serverNameContent)
        );
    }

    container.addSeparatorComponents(separator => separator);

    // Server info section with thumbnail
    const serverInfo = [
        `**Server Owner**\n@${owner.user.username} (${owner.user.tag})`,
        ``,
        `**Members**\n${guild.memberCount}`,
        ``,
        `**Channels**\n${guild.channels.cache.size}`,
        ``,
        `**Roles**\n${guild.roles.cache.size}`
    ].join('\n');

    container.addSectionComponents(
        section => section
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(serverInfo)
            )
            .setThumbnailAccessory(
                thumbnail => thumbnail
                    .setURL(guild.iconURL({ size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
            )
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Server ID**\n${guild.id}`)
    );

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Created**\n<t:${createdTimestamp}:F>`)
    );

    if (guild.description) {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Description**\n${guild.description}`)
        );
    }

    container.addSeparatorComponents(separator => separator);

    // Invite link
    if (inviteLink !== 'No invite available') {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`🔗 **Invite Link**\n[Join Server](${inviteLink})`)
        );
    } else {
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`🔗 **Invite Link**\n${inviteLink}`)
        );
    }

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
}

/**
 * Container pagination with integrated select menu
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
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
            .setLabel(`${index + 1}/${components.length}`)
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

        // Add select menu for current page
        const guilds = Array.from(interaction.client.guilds.cache.values());
        const serversPerPage = 5;
        const currentPageServers = guilds.slice(index * serversPerPage, (index + 1) * serversPerPage);
        const selectMenu = createServerSelectMenu(currentPageServers, index);

        // Add both buttons and select menu to container
        components[index].addActionRowComponents(buttons);
        components[index].addActionRowComponents(
            actionRow => actionRow.setComponents(selectMenu)
        );

        const msg = await interaction.editReply({
            components: [components[index]],
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        const selectCollector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({
                    content: `Only **${interaction.user.username}** can use these buttons.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (i.customId === 'pagefirst') {
                index = 0;
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < components.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = components.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${components.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === components.length - 1);
            last.setDisabled(index === components.length - 1);

            // Update select menu for new page
            const currentPageServers = guilds.slice(index * serversPerPage, (index + 1) * serversPerPage);
            const newSelectMenu = createServerSelectMenu(currentPageServers, index);

            // Clear existing components and add new ones
            components[index].components = [];
            components[index].addActionRowComponents(buttons);
            components[index].addActionRowComponents(
                actionRow => actionRow.setComponents(newSelectMenu)
            );

            await i.update({
                components: [components[index]],
                flags: MessageFlags.IsComponentsV2
            });

            collector.resetTimer();
            selectCollector.resetTimer();
        });

        selectCollector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({
                    content: `Only **${interaction.user.username}** can use this menu.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const serverId = i.values[0];
            const guild = interaction.client.guilds.cache.get(serverId);
            
            if (guild) {
                await handleServerInfo(i, guild);
            }
        });

        collector.on('end', () => {
            // Remove components when collector ends
            components[index].components = [];
            interaction.editReply({
                components: [components[index]],
                flags: MessageFlags.IsComponentsV2
            }).catch(() => {});
        });

        selectCollector.on('end', () => {
            // Handled by main collector
        });

        return msg;

    } catch (error) {
        console.error('[PAGINATION ERROR]', error);
    }
}
