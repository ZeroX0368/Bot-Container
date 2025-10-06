
const { Events, PermissionsBitField } = require('discord.js');
const ReactionRoles = require('../Schemas/reactionroles');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'reaction_roles_select') return;

        try {
            const guildId = interaction.guild.id;
            const member = interaction.member;

            // Check if reaction roles are configured for this guild
            const reactionRoleData = await ReactionRoles.findOne({ guildId });
            
            if (!reactionRoleData) {
                return await interaction.reply({
                    content: '❌ Reaction roles are not configured for this server!',
                    ephemeral: true
                });
            }

            const selectedRoleIds = interaction.values;

            // Check bot permissions
            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return await interaction.reply({
                    content: '❌ I don\'t have permission to manage roles!',
                    ephemeral: true
                });
            }

            const rolesToAdd = [];
            const rolesToRemove = [];

            // Determine which roles to add and which to remove
            for (const roleId of reactionRoleData.roles) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) continue;

                // Check if bot can manage this role
                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    continue; // Skip roles the bot can't manage
                }

                const hasRole = member.roles.cache.has(roleId);
                const isSelected = selectedRoleIds.includes(roleId);

                if (isSelected && !hasRole) {
                    rolesToAdd.push(role);
                } else if (!isSelected && hasRole) {
                    rolesToRemove.push(role);
                }
            }

            // Apply role changes
            const results = [];

            if (rolesToAdd.length > 0) {
                try {
                    await member.roles.add(rolesToAdd);
                    results.push(`✅ **Added roles:** ${rolesToAdd.map(r => r.name).join(', ')}`);
                } catch (error) {
                    console.error('Error adding roles:', error);
                    results.push(`❌ **Failed to add some roles**`);
                }
            }

            if (rolesToRemove.length > 0) {
                try {
                    await member.roles.remove(rolesToRemove);
                    results.push(`❌ **Removed roles:** ${rolesToRemove.map(r => r.name).join(', ')}`);
                } catch (error) {
                    console.error('Error removing roles:', error);
                    results.push(`❌ **Failed to remove some roles**`);
                }
            }

            if (results.length === 0) {
                return await interaction.reply({
                    content: '🔄 No role changes were made.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: results.join('\n'),
                ephemeral: true
            });

        } catch (error) {
            console.error('Reaction roles event error:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your role selection.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    },
};
