
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
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

// Function to format permissions
function formatPermissions(member) {
    const adminPermissions = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers'];
    const memberPermissions = member.permissions.toArray();
    
    const hasAdminPerms = adminPermissions.some(perm => memberPermissions.includes(perm));
    
    if (memberPermissions.includes('Administrator')) {
        return 'Administrator';
    } else if (hasAdminPerms) {
        return 'Moderate permissions';
    } else {
        return 'No significant permissions';
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('User information commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Show a user\'s avatar')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user whose avatar to show')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('banner')
                .setDescription('Show a user\'s banner')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user whose banner to show')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed information about a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to get information about')
                        .setRequired(false))),

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

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
                case 'banner':
                    await handleBanner(interaction);
                    break;
                case 'info':
                    await handleInfo(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in user command:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Command Failed**\n\nAn error occurred while executing the command. Please try again later.')
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

async function handleAvatar(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
        // Get different sizes of the avatar
        const avatar512 = targetUser.displayAvatarURL({ size: 512, extension: 'png' });
        const avatar1024 = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });
        const avatar2048 = targetUser.displayAvatarURL({ size: 2048, extension: 'png' });

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`👤 **${targetUser.tag}'s Avatar**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add avatar image using MediaGallery
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(avatar1024)
                )
        );

        container.addSeparatorComponents(separator => separator);

        // Add download links
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📥 Download Links:**\n[512x512](${avatar512}) • [1024x1024](${avatar1024}) • [2048x2048](${avatar2048})`)
        );

        // Add user info
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**User ID:** ${targetUser.id}\n**Username:** ${targetUser.username}`)
        );

        // Add footer
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error fetching avatar:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ **Avatar Fetch Failed**\n\nFailed to fetch the user\'s avatar. Please try again later.')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
}

async function handleBanner(interaction) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    try {
        // Fetch the full user object to get banner info
        const fullUser = await interaction.client.users.fetch(targetUser.id, { force: true });
        
        if (!fullUser.banner) {
            const noBannerContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`❌ **No Banner Found**\n\n${targetUser.tag} doesn't have a banner set.`)
                );

            return await interaction.editReply({
                components: [noBannerContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get different sizes of the banner
        const banner512 = fullUser.bannerURL({ size: 512, extension: 'png' });
        const banner1024 = fullUser.bannerURL({ size: 1024, extension: 'png' });
        const banner2048 = fullUser.bannerURL({ size: 2048, extension: 'png' });

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🎨 **${targetUser.tag}'s Banner**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add banner image using MediaGallery
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(banner1024)
                )
        );

        container.addSeparatorComponents(separator => separator);

        // Add download links
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📥 Download Links:**\n[512x512](${banner512}) • [1024x1024](${banner1024}) • [2048x2048](${banner2048})`)
        );

        // Add user info and accent color if available
        container.addSeparatorComponents(separator => separator);
        let userInfo = `**User ID:** ${targetUser.id}\n**Username:** ${targetUser.username}`;
        
        if (fullUser.hexAccentColor) {
            userInfo += `\n**Accent Color:** ${fullUser.hexAccentColor}`;
        }

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(userInfo)
        );

        // Add footer
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error fetching banner:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ **Banner Fetch Failed**\n\nFailed to fetch the user\'s banner. This could be due to API issues or the user having privacy settings enabled.')
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

async function handleInfo(interaction) {
    await interaction.deferReply();

    try {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent('❌ **Error**\nUser not found in this server.')
                );

            return await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const userAvatar = targetUser.displayAvatarURL({ size: 512, extension: 'png' });
        const isBot = targetUser.bot ? 'Yes 🤖' : 'No 👤';
        const nickname = targetMember.nickname || 'None';
        
        // Get roles excluding @everyone
        const userRoles = targetMember.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position);
        
        const rolesDisplay = userRoles.size > 0 
            ? userRoles.map(role => `<@&${role.id}>`).join(' ')
            : 'None';

        const highestRole = targetMember.roles.highest.name !== '@everyone' 
            ? targetMember.roles.highest 
            : null;

        const highestRoleDisplay = highestRole 
            ? `${highestRole.name} (Color: ${highestRole.hexColor})`
            : '@everyone (No color)';

        const permissions = formatPermissions(targetMember);

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add main header
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`## 👤 User Info: \`${targetUser.displayName}\``)
        );

        container.addSeparatorComponents(separator => separator);

        // Add user information with thumbnail
        const userInfo = [
            `> ✦ **Username:** \`${targetUser.username}\``,
            `> ✦ **ID:** \`${targetUser.id}\``,
            `> ✦ **Bot:** ${isBot}`,
            `> ✦ **Nickname:** ${nickname}`,
            `> ✦ **Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`,
            `> ✦ **Joined Server:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`,
            `> ✦ **Roles:** ${rolesDisplay}`,
            `> ✦ **Highest Role:** ${highestRoleDisplay}`,
            `> ✦ **Permissions:** ${permissions}`
        ].join('\n');

        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(userInfo)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                        .setURL(userAvatar)
                )
        );

        // Add footer
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(new Date().getTime() / 1000)}:R>*`)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error in user info command:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **User Information Failed**\nSorry, I couldn't fetch the user information. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
