
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
} = require("discord.js");
const config = require('../config.json');
const { buildContainerFromEmbedShape } = require('../Container/container');
const { replyV2 } = require('../Container/sendV2');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Role management commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("info")
                .setDescription("Display information about a role")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to get information about")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Create a new role")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("The name of the role")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("color")
                        .setDescription("The color of the role (e.g., #0099ff)")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete a role")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to delete")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a role to a user")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to add")
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to add the role to")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a role from a user")
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to remove")
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to remove the role from")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Permission check for info subcommand (SendMessages)
        if (subcommand === "info") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.SendMessages)) {
                const errorContainer = buildContainerFromEmbedShape({
                    color: parseInt(config.ErrorColor.replace('#', ''), 16),
                    title: "❌ Permission Denied",
                    description: "You need **Send Messages** permission to use this command!",
                    timestamp: new Date()
                });

                return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
            }

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
                const errorContainer = buildContainerFromEmbedShape({
                    color: parseInt(config.ErrorColor.replace('#', ''), 16),
                    title: "❌ Bot Permission Denied",
                    description: "I need **Send Messages** permission to execute this command!",
                    timestamp: new Date()
                });

                return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
            }
        } else {
            // Permission check for other subcommands (ManageRoles)
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                const errorContainer = buildContainerFromEmbedShape({
                    color: parseInt(config.ErrorColor.replace('#', ''), 16),
                    title: "❌ Permission Denied",
                    description: "You need **Manage Roles** permission to use this command!",
                    timestamp: new Date()
                });

                return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
            }

            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                const errorContainer = buildContainerFromEmbedShape({
                    color: parseInt(config.ErrorColor.replace('#', ''), 16),
                    title: "❌ Bot Permission Denied",
                    description: "I need **Manage Roles** permission to execute this command!",
                    timestamp: new Date()
                });

                return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
            }
        }

        try {
            switch (subcommand) {
                case "info":
                    await handleRoleInfo(interaction);
                    break;
                case "create":
                    await handleRoleCreate(interaction);
                    break;
                case "delete":
                    await handleRoleDelete(interaction);
                    break;
                case "add":
                    await handleRoleAdd(interaction);
                    break;
                case "remove":
                    await handleRoleRemove(interaction);
                    break;
            }
        } catch (error) {
            console.error('Role command error:', error);
            const errorContainer = buildContainerFromEmbedShape({
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: "❌ Error",
                description: "An error occurred while executing the command!",
                timestamp: new Date()
            });

            await replyV2(interaction, { embed: errorContainer, ephemeral: true });
        }
    },
};

async function handleRoleInfo(interaction) {
    const role = interaction.options.getRole("role");

    if (!role) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Role not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    // Get role permissions
    const permissions = role.permissions.toArray();
    const permissionsList = permissions.length > 0 
        ? permissions.map(perm => `• ${perm.replace(/([A-Z])/g, ' $1').trim()}`).join('\n')
        : "No special permissions";

    // Format creation date
    const createdAt = `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`;
    const createdAgo = `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`;

    // Get role members count
    const memberCount = role.members.size;

    // Format role color
    const roleColor = role.hexColor !== '#000000' ? role.hexColor : 'Default';

    const roleInfoContainer = buildContainerFromEmbedShape({
        color: role.color || parseInt(config.EmbedColor.replace('#', ''), 16),
        title: `📋 Role Information`,
        fields: [
            {
                name: "ID",
                value: role.id,
                inline: true
            },
            {
                name: "Name",
                value: role.name,
                inline: true
            },
            {
                name: "Color",
                value: roleColor !== 'Default' ? roleColor : 'None',
                inline: true
            },
            {
                name: "Mention",
                value: `\`<@&${role.id}>\``,
                inline: true
            },
            {
                name: "Members",
                value: memberCount.toString(),
                inline: true
            },
            {
                name: "Hoisted",
                value: role.hoist ? "Yes" : "No",
                inline: true
            },
            {
                name: "Position",
                value: role.position.toString(),
                inline: true
            },
            {
                name: "Mentionable",
                value: role.mentionable ? "Yes" : "No",
                inline: true
            },
            {
                name: "Managed",
                value: role.managed ? "Yes" : "No",
                inline: true
            },
            {
                name: "Created",
                value: `${createdAt}\n(${createdAgo})`,
                inline: false
            },
            {
                name: "Permissions",
                value: permissionsList.length > 1024 
                    ? permissionsList.substring(0, 1021) + "..." 
                    : permissionsList,
                inline: false
            }
        ],
        footer: {
            text: `Role Info • ${role.guild.name}`
        },
        timestamp: new Date()
    });

    await replyV2(interaction, { embed: roleInfoContainer });
}

async function handleRoleCreate(interaction) {
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color");

    // Validate color format if provided
    let roleColor = null;
    if (color) {
        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (!colorRegex.test(color)) {
            const errorContainer = buildContainerFromEmbedShape({
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: "❌ Invalid Color",
                description: "Please provide a valid hex color format (e.g., #0099ff)!",
                timestamp: new Date()
            });
            return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
        }
        roleColor = parseInt(color.replace('#', ''), 16);
    }

    try {
        const role = await interaction.guild.roles.create({
            name: name,
            color: roleColor,
            reason: `Role created by ${interaction.user.tag}`
        });

        const successContainer = buildContainerFromEmbedShape({
            color: parseInt(config.EmbedColor.replace('#', ''), 16),
            title: "✅ Role Created",
            fields: [
                {
                    name: "🏷️ Role Name",
                    value: role.name,
                    inline: true
                },
                {
                    name: "🆔 Role ID",
                    value: role.id,
                    inline: true
                },
                {
                    name: "🎨 Color",
                    value: role.hexColor !== '#000000' ? role.hexColor : 'Default',
                    inline: true
                },
                {
                    name: "👤 Created by",
                    value: interaction.user.tag,
                    inline: false
                }
            ],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: successContainer });
    } catch (error) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Failed to create the role! Make sure the bot has proper permissions and the role name is valid.",
            timestamp: new Date()
        });
        await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }
}

async function handleRoleDelete(interaction) {
    const role = interaction.options.getRole("role");

    if (!role) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Role not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.managed) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Cannot delete a managed role (bot roles, boosts, etc.)!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Cannot delete a role higher than or equal to my highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "You cannot delete a role higher than or equal to your highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    try {
        const roleName = role.name;
        const roleId = role.id;
        await role.delete(`Role deleted by ${interaction.user.tag}`);

        const successContainer = buildContainerFromEmbedShape({
            color: parseInt(config.EmbedColor.replace('#', ''), 16),
            title: "✅ Role Deleted",
            fields: [
                {
                    name: "🏷️ Role Name",
                    value: roleName,
                    inline: true
                },
                {
                    name: "🆔 Role ID",
                    value: roleId,
                    inline: true
                },
                {
                    name: "👤 Deleted by",
                    value: interaction.user.tag,
                    inline: false
                }
            ],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: successContainer });
    } catch (error) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Failed to delete the role! Make sure the bot has proper permissions.",
            timestamp: new Date()
        });
        await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }
}

async function handleRoleAdd(interaction) {
    const role = interaction.options.getRole("role");
    const user = interaction.options.getMember("user");

    if (!role) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Role not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (!user) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "User not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (user.roles.cache.has(role.id)) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "User already has this role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Cannot manage a role higher than or equal to my highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "You cannot manage a role higher than or equal to your highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    try {
        await user.roles.add(role, `Role added by ${interaction.user.tag}`);

        const successContainer = buildContainerFromEmbedShape({
            color: parseInt(config.EmbedColor.replace('#', ''), 16),
            title: "✅ Role Added",
            fields: [
                {
                    name: "👤 User",
                    value: `${user.user.tag} (${user.id})`,
                    inline: true
                },
                {
                    name: "🏷️ Role",
                    value: `${role.name} (${role.id})`,
                    inline: true
                },
                {
                    name: "👤 Added by",
                    value: interaction.user.tag,
                    inline: false
                }
            ],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: successContainer });
    } catch (error) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Failed to add the role! Make sure the bot has proper permissions.",
            timestamp: new Date()
        });
        await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }
}

async function handleRoleRemove(interaction) {
    const role = interaction.options.getRole("role");
    const user = interaction.options.getMember("user");

    if (!role) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Role not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (!user) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "User not found in this server!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (!user.roles.cache.has(role.id)) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "User doesn't have this role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Cannot manage a role higher than or equal to my highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "You cannot manage a role higher than or equal to your highest role!",
            timestamp: new Date()
        });
        return await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }

    try {
        await user.roles.remove(role, `Role removed by ${interaction.user.tag}`);

        const successContainer = buildContainerFromEmbedShape({
            color: parseInt(config.EmbedColor.replace('#', ''), 16),
            title: "✅ Role Removed",
            fields: [
                {
                    name: "👤 User",
                    value: `${user.user.tag} (${user.id})`,
                    inline: true
                },
                {
                    name: "🏷️ Role",
                    value: `${role.name} (${role.id})`,
                    inline: true
                },
                {
                    name: "👤 Removed by",
                    value: interaction.user.tag,
                    inline: false
                }
            ],
            timestamp: new Date()
        });

        await replyV2(interaction, { embed: successContainer });
    } catch (error) {
        const errorContainer = buildContainerFromEmbedShape({
            color: parseInt(config.ErrorColor.replace('#', ''), 16),
            title: "❌ Error",
            description: "Failed to remove the role! Make sure the bot has proper permissions.",
            timestamp: new Date()
        });
        await replyV2(interaction, { embed: errorContainer, ephemeral: true });
    }
}
