
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('../config.json');

// Helper function to get colors from config
function getEmbedColor() {
    return parseInt(config.EmbedColor?.replace('#', '') || '0099ff', 16);
}

function getErrorColor() {
    return parseInt(config.ErrorColor?.replace('#', '') || 'ff0000', 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roblox')
        .setDescription('Roblox-related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Get information about a Roblox user')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Roblox username')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Get a Roblox user\'s avatar image')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Roblox username')
                        .setRequired(true)
                )
        ),

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
                case 'user':
                    await handleUserLookup(interaction);
                    break;
                case 'avatar':
                    await handleAvatarLookup(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in roblox command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
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

async function handleUserLookup(interaction) {
    const username = interaction.options.getString('username');

    await interaction.deferReply();

    try {
        // Step 1: Get user ID from username using the correct API endpoint
        const userSearchResponse = await fetch(`https://users.roblox.com/v1/usernames/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: true
            })
        });
        
        if (!userSearchResponse.ok) {
            throw new Error(`User search failed: ${userSearchResponse.status}`);
        }

        const userSearchData = await userSearchResponse.json();

        if (!userSearchData.data || userSearchData.data.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🔍 **Roblox User Search**\nNo user found with username: **${username}**\n\nMake sure the username is spelled correctly and the user exists.`)
                );

            return await interaction.editReply({ components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const userId = userSearchData.data[0].id;

        // Step 2: Get detailed user information
        const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);

        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user details: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        
        // Get friends count separately with better error handling
        let friendsData = { count: 'N/A' };
        try {
            const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
            if (friendsResponse.ok) {
                friendsData = await friendsResponse.json();
            }
        } catch (error) {
            console.log('Could not fetch friends data:', error.message);
        }

        // Step 3: Get additional user stats
        let followersCount = 'N/A';
        let followingCount = 'N/A';
        
        try {
            const followersResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
            const followingResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
            
            if (followersResponse.ok) {
                const followersData = await followersResponse.json();
                followersCount = followersData.count;
            }
            
            if (followingResponse.ok) {
                const followingData = await followingResponse.json();
                followingCount = followingData.count;
            }
        } catch (error) {
            console.log('Could not fetch follower/following data');
        }

        // Step 4: Get user avatar
        let avatarUrl = null;
        try {
            const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
            if (avatarResponse.ok) {
                const avatarData = await avatarResponse.json();
                if (avatarData.data && avatarData.data.length > 0 && avatarData.data[0].state === 'Completed') {
                    avatarUrl = avatarData.data[0].imageUrl;
                }
            }
        } catch (error) {
            console.log('Could not fetch avatar:', error.message);
        }

        // Format creation date
        const creationDate = new Date(userData.created);
        const formattedDate = creationDate.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create container with user information
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🎮 **${userData.displayName || userData.name}** (@${userData.name})`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add user info section
        const userInfoText = [
            `**User ID**`,
            `${userData.id}`,
            ``,
            `**Friends**`,
            `${friendsData.count !== undefined ? friendsData.count.toLocaleString() : 'N/A'}`,
            ``,
            `**Followers**`,
            `${followersCount !== 'N/A' ? followersCount.toLocaleString() : 'N/A'}`,
            ``,
            `**Following**`,
            `${followingCount !== 'N/A' ? followingCount.toLocaleString() : 'N/A'}`,
            ``,
            `**Bio**`,
            `${userData.description || 'Welcome to the Roblox profile!'}`,
            ``,
            `**Creation Date**`,
            `${formattedDate}`
        ].join('\n');

        // Add avatar if available
        if (avatarUrl) {
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(userInfoText)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(avatarUrl)
                    )
            );
        } else {
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(userInfoText)
                    )
            );
        }

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error fetching Roblox user data:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Roblox User information Failed**\nSorry, I couldn't fetch information for user "${username}". This could be due to:\n\n• User doesn't exist\n• Roblox API is temporarily unavailable\n• User has privacy settings enabled\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}

async function handleAvatarLookup(interaction) {
    const username = interaction.options.getString('username');

    await interaction.deferReply();

    try {
        // Step 1: Get user ID from username
        const userSearchResponse = await fetch(`https://users.roblox.com/v1/usernames/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: true
            })
        });
        
        if (!userSearchResponse.ok) {
            throw new Error(`User search failed: ${userSearchResponse.status}`);
        }

        const userSearchData = await userSearchResponse.json();

        if (!userSearchData.data || userSearchData.data.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🔍 **Roblox Avatar Search**\nNo user found with username: **${username}**\n\nMake sure the username is spelled correctly and the user exists.`)
                );

            return await interaction.editReply({ components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 });
        }

        const userId = userSearchData.data[0].id;
        const userData = userSearchData.data[0];

        // Step 2: Get full body avatar image
        const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png`);
        
        if (!avatarResponse.ok) {
            throw new Error(`Failed to fetch avatar: ${avatarResponse.status}`);
        }

        const avatarData = await avatarResponse.json();

        if (!avatarData.data || avatarData.data.length === 0 || avatarData.data[0].state !== 'Completed') {
            throw new Error('Avatar image not available');
        }

        const avatarUrl = avatarData.data[0].imageUrl;

        // Create container with avatar
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🎮 **${userData.displayName || userData.name}'s Avatar**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add avatar image using MediaGallery
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(avatarUrl)
                )
        );

        // Add user info
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Username:** @${userData.name}\n**Display Name:** ${userData.displayName || userData.name}\n**User ID:** ${userId}`)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error fetching Roblox avatar:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Roblox Avatar Failed**\nSorry, I couldn't fetch the avatar for user "${username}". This could be due to:\n\n• User doesn't exist\n• Avatar is not available\n• Roblox API is temporarily unavailable\n• User has privacy settings enabled\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}
