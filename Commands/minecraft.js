
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder
} = require('discord.js');
const config = require('../config.json');

function getEmbedColor() {
    const color = config?.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor() {
    const color = config?.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Minecraft server utilities')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Check Minecraft server status')
                .addStringOption(option =>
                    option
                        .setName('address')
                        .setDescription('Minecraft server address (e.g., hypixel.net or mc.hypixel.net:25565)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('skin')
                .setDescription('Search for Minecraft player skin')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Minecraft username to search')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('You need **Use Application Commands** permission to use this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'server') {
            await handleServerStatus(interaction);
        } else if (subcommand === 'skin') {
            await handleMcSkin(interaction);
        }
    }
};

async function handleServerStatus(interaction) {
    // Show loading container
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Checking Server...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I check the Minecraft server status...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const serverAddress = interaction.options.getString('address');

    try {
        // Use mcsrvstat.us API to get server status
        const response = await fetch(`https://api.mcsrvstat.us/3/${serverAddress}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch server status');
        }

        const data = await response.json();

        if (!data.online) {
            const offlineContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('🔴 **Server Offline**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`The Minecraft server **${serverAddress}** is currently offline or unreachable.`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.editReply({
                components: [offlineContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Server is online, create status container
        const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        const motd = data.motd?.clean ? data.motd.clean.join('\n') : 'No MOTD available';
        const version = data.version || 'Unknown';
        const protocol = data.protocol || 'Unknown';
        const playersOnline = data.players?.online || 0;
        const playersMax = data.players?.max || 0;
        const serverIcon = data.icon ? `data:image/png;base64,${data.icon}` : null;

        const statusContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🟢 **Server Online: ${data.hostname || serverAddress}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**IP:** \`${data.ip || serverAddress}\`\n**Port:** \`${data.port || 25565}\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📊 Players:** ${playersOnline}/${playersMax}`)
            );

        // Add player list if available
        if (data.players?.list && data.players.list.length > 0) {
            const playerList = data.players.list.slice(0, 10).join(', ');
            const moreText = data.players.list.length > 10 ? ` (+${data.players.list.length - 10} more)` : '';
            statusContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**👥 Online Players:** ${playerList}${moreText}`)
            );
        }

        statusContainer.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**🎮 Version:** ${version}\n**🔧 Protocol:** ${protocol}`)
            );

        // Add MOTD
        if (motd && motd !== 'No MOTD available') {
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📝 MOTD:**\n\`\`\`${motd.substring(0, 500)}\`\`\``)
                );
        }

        // Add server icon if available (skip base64 data URIs as they're too large)
        if (serverIcon && !serverIcon.startsWith('data:')) {
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🖼️ Server Icon:**')
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(serverIcon)
                        )
                );
        } else if (serverIcon && serverIcon.startsWith('data:')) {
            // Just mention that server has an icon but don't try to display it
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('**🖼️ Server Icon:** Available (too large to display)')
                );
        }

        // Add mods/plugins if available
        if (data.mods?.list && data.mods.list.length > 0) {
            const modList = data.mods.list.slice(0, 5).map(mod => mod.name || mod).join(', ');
            const moreText = data.mods.list.length > 5 ? ` (+${data.mods.list.length - 5} more)` : '';
            statusContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**🔌 Mods/Plugins:** ${modList}${moreText}`)
                );
        }

        statusContainer.addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [statusContainer],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Minecraft server status error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Status Check Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while checking the server status. Please verify the address and try again.')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleMcSkin(interaction) {
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
    
    // Show loading container
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('⏳ **Searching...**')
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent('Please wait while I search for the Minecraft skin...')
        );

    await interaction.reply({
        components: [loadingContainer],
        flags: MessageFlags.IsComponentsV2
    });

    const username = interaction.options.getString('name');

    try {
        // Fetch player UUID from Mojang API
        const uuidResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        
        if (!uuidResponse.ok) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Player Not Found**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`Could not find Minecraft player with username: **${username}**`)
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const playerData = await uuidResponse.json();
        const uuid = playerData.id;
        const playerName = playerData.name;

        // Create containers array for pagination
        const containers = [];

        // Container 1: Player Info
        const infoContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🎮 **Minecraft Player: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**UUID:** \`${uuid}\``)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**📸 Skin Preview:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/full/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(infoContainer);

        // Container 2: Skin Views
        const skinContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`🎨 **Skin Views: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**Front View:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/front/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(skinContainer);

        // Container 3: Head & Body
        const headContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`👤 **Head & Face: ${playerName}**`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**3D Head:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/head/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('**Face:**')
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`https://visage.surgeplay.com/face/512/${uuid}`)
                    )
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        containers.push(headContainer);

        // Use pagination
        await paginateContainers(interaction, containers);

    } catch (error) {
        console.error('Minecraft skin search error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Search Failed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while searching for the Minecraft skin. Please try again.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function paginateContainers(interaction, components) {
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle, ComponentType } = require('discord.js');

    if (components.length === 1) {
        return await interaction.editReply({ 
            components: [components[0]], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
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

    const containerWithButtons = new ContainerBuilder(components[index].toJSON());
    containerWithButtons.addActionRowComponents(buttons);

    const msg = await interaction.editReply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [containerWithButtons], 
        fetchReply: true 
    });

    const collector = await msg.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 180000 
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

        first.setDisabled(index === 0);
        prev.setDisabled(index === 0);
        next.setDisabled(index === components.length - 1);
        last.setDisabled(index === components.length - 1);

        const updatedContainer = new ContainerBuilder(components[index].toJSON());
        updatedContainer.addActionRowComponents(buttons);

        await i.update({ 
            flags: MessageFlags.IsComponentsV2, 
            components: [updatedContainer] 
        });

        collector.resetTimer();
    });

    collector.on("end", () => {
        return interaction.editReply({ 
            flags: MessageFlags.IsComponentsV2, 
            components: [components[index]] 
        }).catch(() => {});
    });

    return msg;
}
