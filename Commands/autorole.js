
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
} = require("discord.js");
const config = require('../config.json');
const AutoroleSchema = require('../Schemas/autorole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manages automatic role assignments for new members.')
        .setDMPermission(false) // This command is guild-specific
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles) // Only users with Manage Roles can use this command

        // Subcommand Group: Bots
        .addSubcommandGroup(group =>
            group
                .setName('bots')
                .setDescription('Manage auto-roles for new bots.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a role to be automatically given to new bots.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('The role to add for new bots.')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a role from being automatically given to new bots.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('The role to remove for new bots.')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all roles automatically given to new bots.')))

        // Subcommand Group: Humans
        .addSubcommandGroup(group =>
            group
                .setName('humans')
                .setDescription('Manage auto-roles for new human members.')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a role to be automatically given to new human members.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('The role to add for new human members.')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a role from being automatically given to new human members.')
                        .addRoleOption(option =>
                            option
                                .setName('role')
                                .setDescription('The role to remove for new human members.')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all roles automatically given to new human members.')))

        // Subcommand: reset-all
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-all')
                .setDescription('Resets all auto-role settings (for bots and humans) for this server.'))

        // Subcommand: reset-bots
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-bots')
                .setDescription('Resets all auto-role settings for new bots for this server.'))

        // Subcommand: reset-humans
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-humans')
                .setDescription('Resets all auto-role settings for new human members for this server.')),

    // --- Command Execution Logic ---
    async execute(interaction) {
        // Check if user has ManageRoles permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Permission Denied")
                .setDescription("You need **Manage Roles** permission to use this command!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if bot has ManageRoles permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Bot Permission Denied")
                .setDescription("I need **Manage Roles** permission to execute autorole commands!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Defer to show "Bot is thinking..."

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            // Get or create guild autorole settings
            let autoroleData = await AutoroleSchema.findOne({ guildId: guildId });
            if (!autoroleData) {
                autoroleData = new AutoroleSchema({
                    guildId: guildId,
                    humans: [],
                    bots: []
                });
            }

            const type = subcommandGroup; // 'bots' or 'humans'

            if (type && ['bots', 'humans'].includes(type)) {
                const rolesArray = autoroleData[type]; // Reference to either humans[] or bots[]

                switch (subcommand) {
                    case 'add': {
                        const role = interaction.options.getRole('role');

                        // Check bot's role hierarchy
                        if (role.position >= interaction.guild.members.me.roles.highest.position) {
                            return interaction.editReply({
                                content: `❌ I cannot assign the role \`${role.name}\` because it is higher than or equal to my highest role. Please ensure my role is above the role you want me to assign.`,
                                ephemeral: true
                            });
                        }

                        if (rolesArray.includes(role.id)) {
                            return interaction.editReply(`\`${role.name}\` is already set for new ${type}.`);
                        }

                        rolesArray.push(role.id);
                        await autoroleData.save();
                        return interaction.editReply(`✅ Added \`${role.name}\` to auto-assign for new ${type}.`);
                    }
                    case 'remove': {
                        const role = interaction.options.getRole('role');
                        const index = rolesArray.indexOf(role.id);

                        if (index === -1) {
                            return interaction.editReply(`\`${role.name}\` is not currently set for new ${type}.`);
                        }

                        rolesArray.splice(index, 1);
                        await autoroleData.save();
                        return interaction.editReply(`✅ Removed \`${role.name}\` from auto-assign for new ${type}.`);
                    }
                    case 'list': {
                        let description = '';
                        if (rolesArray.length === 0) {
                            description = `No auto-roles configured for new ${type} in this server.`;
                        } else {
                            // Attempt to resolve role names
                            const roleNames = rolesArray.map(roleId => {
                                const role = interaction.guild.roles.cache.get(roleId);
                                return role ? `\`${role.name}\`` : `<@&${roleId}> (Deleted Role)`;
                            });
                            description = `Auto-roles for new ${type}:\n` + roleNames.join('\n');
                        }

                        const embed = new EmbedBuilder()
                            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
                            .setTitle(`Auto-Roles for New ${type.charAt(0).toUpperCase() + type.slice(1)}`)
                            .setDescription(description)
                            .setTimestamp();

                        return interaction.editReply({ embeds: [embed] });
                    }
                }
            } else { // Reset commands
                switch (subcommand) {
                    case 'reset-all': {
                        autoroleData.humans = [];
                        autoroleData.bots = [];
                        await autoroleData.save();
                        return interaction.editReply('✅ All auto-role settings for this server have been reset.');
                    }
                    case 'reset-bots': {
                        autoroleData.bots = [];
                        await autoroleData.save();
                        return interaction.editReply('✅ Auto-role settings for new bots in this server have been reset.');
                    }
                    case 'reset-humans': {
                        autoroleData.humans = [];
                        await autoroleData.save();
                        return interaction.editReply('✅ Auto-role settings for new human members in this server have been reset.');
                    }
                }
            }
        } catch (error) {
            console.error('Autorole command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Error")
                .setDescription("An error occurred while executing the command!")
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
