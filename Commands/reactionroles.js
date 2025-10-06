
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionsBitField, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const config = require('../config.json');
const ReactionRoles = require('../Schemas/reactionroles');

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
        .setName("reactionroles")
        .setDescription("Manage reaction roles for the server")
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set a channel for reaction roles")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to set for reaction roles")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove reaction roles from a channel")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to remove reaction roles from")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("role-add")
                .setDescription("Add a role to the selection menu")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to add to the selection menu")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("role-remove")
                .setDescription("Remove a role from the selection menu")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to remove from the selection menu")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("reset-all")
                .setDescription("Reset all reaction roles in the server")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Show current reaction roles configuration")
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check user permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            !interaction.member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('You need **Administrator** and **Use Application Commands** permissions to use this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // Check bot permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
            !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
            !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
            !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Bot Permission Denied**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('I need **Manage Roles**, **Manage Messages**, **Manage Channels**, and **Use Application Commands** permissions to execute this command!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'set':
                await handleSetChannel(interaction, guildId);
                break;
            case 'remove':
                await handleRemoveChannel(interaction, guildId);
                break;
            case 'role-add':
                await handleAddRole(interaction, guildId);
                break;
            case 'role-remove':
                await handleRemoveRole(interaction, guildId);
                break;
            case 'reset-all':
                await handleResetAll(interaction, guildId);
                break;
            case 'list':
                await handleList(interaction, guildId);
                break;
        }
    },
};

async function handleSetChannel(interaction, guildId) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased()) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Invalid Channel**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Please select a text channel!')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }

    try {
        // Find existing configuration or create new one
        let reactionRoleData = await ReactionRoles.findOne({ guildId });
        
        if (reactionRoleData) {
            reactionRoleData.channelId = channel.id;
            reactionRoleData.messageId = null; // Reset message ID when channel changes
            await reactionRoleData.save();
        } else {
            reactionRoleData = new ReactionRoles({
                guildId,
                channelId: channel.id,
                roles: [],
                messageId: null
            });
            await reactionRoleData.save();
        }

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Channel Set**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`Reaction roles channel has been set to ${channel}!`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Use `/reactionroles role-add` to add roles to the selection menu.')
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error setting channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while saving to the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleRemoveChannel(interaction, guildId) {
    const channel = interaction.options.getChannel('channel');

    try {
        const reactionRoleData = await ReactionRoles.findOne({ guildId });

        if (!reactionRoleData || reactionRoleData.channelId !== channel.id) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Channel Not Found**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('This channel is not set for reaction roles!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // Delete the select menu message if it exists
        if (reactionRoleData.messageId) {
            try {
                const message = await channel.messages.fetch(reactionRoleData.messageId);
                await message.delete();
            } catch (error) {
                console.warn('Could not delete reaction roles message:', error);
            }
        }

        await ReactionRoles.deleteOne({ guildId });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Channel Removed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`Reaction roles have been removed from ${channel}!`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error removing channel:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while accessing the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleAddRole(interaction, guildId) {
    const role = interaction.options.getRole('role');

    try {
        const reactionRoleData = await ReactionRoles.findOne({ guildId });

        if (!reactionRoleData) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **No Channel Set**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('Please set a channel first using `/reactionroles set`!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (reactionRoleData.roles.includes(role.id)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Role Already Added**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('This role is already in the reaction roles menu!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (reactionRoleData.roles.length >= 25) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Maximum Roles Reached**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('You can only have up to 25 roles in the reaction roles menu!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        reactionRoleData.roles.push(role.id);
        await reactionRoleData.save();

        // Send/update the reaction roles message in the designated channel
        await updateReactionRolesMessage(interaction.guild, reactionRoleData);

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Role Added**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`${role} has been added to the reaction roles menu!`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error adding role:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while saving to the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleRemoveRole(interaction, guildId) {
    const role = interaction.options.getRole('role');

    try {
        const reactionRoleData = await ReactionRoles.findOne({ guildId });

        if (!reactionRoleData) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **No Channel Set**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('Please set a channel first using `/reactionroles set`!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (!reactionRoleData.roles.includes(role.id)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Role Not Found**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('This role is not in the reaction roles menu!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // Remove the role from the array
        reactionRoleData.roles = reactionRoleData.roles.filter(roleId => roleId !== role.id);

        // Update or remove the reaction roles message
        if (reactionRoleData.roles.length === 0) {
            // No roles left, delete the message
            if (reactionRoleData.messageId) {
                try {
                    const channel = interaction.guild.channels.cache.get(reactionRoleData.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(reactionRoleData.messageId);
                        await message.delete();
                    }
                } catch (error) {
                    console.warn('Could not delete reaction roles message:', error);
                }
            }
            reactionRoleData.messageId = null;
        } else {
            // Update the message with remaining roles
            await updateReactionRolesMessage(interaction.guild, reactionRoleData);
        }

        await reactionRoleData.save();

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **Role Removed**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`${role} has been removed from the reaction roles menu!`)
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error removing role:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while accessing the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleResetAll(interaction, guildId) {
    try {
        const reactionRoleData = await ReactionRoles.findOne({ guildId });

        if (!reactionRoleData) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **Nothing to Reset**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('There are no reaction roles configured for this server!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // Delete the select menu message if it exists
        if (reactionRoleData.messageId && reactionRoleData.channelId) {
            try {
                const channel = interaction.guild.channels.cache.get(reactionRoleData.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(reactionRoleData.messageId);
                    await message.delete();
                }
            } catch (error) {
                console.warn('Could not delete reaction roles message:', error);
            }
        }

        await ReactionRoles.deleteOne({ guildId });

        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('✅ **All Reset**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('All reaction roles have been reset for this server!')
            );

        await interaction.reply({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error resetting all:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while accessing the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function handleList(interaction, guildId) {
    try {
        const reactionRoleData = await ReactionRoles.findOne({ guildId });

        if (!reactionRoleData) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('❌ **No Configuration Found**')
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent('There are no reaction roles configured for this server!')
                );

            return await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const channel = interaction.guild.channels.cache.get(reactionRoleData.channelId);
        
        const listContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('📋 **Reaction Roles Configuration**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Channel:** ${channel || 'Unknown Channel'}`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Number of Roles:** ${reactionRoleData.roles.length}`)
            );

        if (reactionRoleData.roles.length > 0) {
            const rolesList = reactionRoleData.roles.map(roleId => {
                const role = interaction.guild.roles.cache.get(roleId);
                return role ? `• ${role.name}` : `• Unknown Role (${roleId})`;
            }).join('\n');

            listContainer.addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Roles:**\n${rolesList}`)
                );
        }

        await interaction.reply({
            components: [listContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error listing roles:', error);
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Database Error**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while accessing the database!')
            );

        await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    }
}

async function updateReactionRolesMessage(guild, reactionRoleData) {
    try {
        const channel = guild.channels.cache.get(reactionRoleData.channelId);
        if (!channel) return;

        const roles = reactionRoleData.roles.map(roleId => guild.roles.cache.get(roleId)).filter(role => role);
        
        if (roles.length === 0) return;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('reaction_roles_select')
            .setPlaceholder('🎭 Select roles to add or remove...')
            .setMinValues(0)
            .setMaxValues(Math.min(roles.length, 25))
            .addOptions(roles.map(role => ({
                label: role.name,
                description: `Click to toggle ${role.name} role`,
                value: role.id,
                emoji: '🎭'
            })));

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        const messageContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('🎭 **Reaction Roles**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('Select the roles you want from the dropdown menu below!')
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You can select multiple roles at once.')
            )
            .addActionRowComponents(actionRow);

        // Always delete old message if it exists
        if (reactionRoleData.messageId) {
            try {
                const existingMessage = await channel.messages.fetch(reactionRoleData.messageId);
                await existingMessage.delete();
            } catch (error) {
                console.warn('Could not delete old reaction roles message:', error);
            }
        }

        // Send new message and store its ID
        const newMessage = await channel.send({
            components: [messageContainer],
            flags: MessageFlags.IsComponentsV2
        });
        reactionRoleData.messageId = newMessage.id;
        await reactionRoleData.save();
    } catch (error) {
        console.error('Error updating reaction roles message:', error);
    }
}
