
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
} = require("discord.js");
const config = require('../config.json');
const WarnSchema = require('../Schemas/warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warning system commands")
        .addSubcommandGroup(group =>
            group
                .setName("admin")
                .setDescription("Admin warning commands")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a warning to a user")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The user to warn")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("reason")
                                .setDescription("Reason for the warning")
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a warning from a user")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The user to remove warning from")
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("warning_id")
                                .setDescription("The ID of the warning to remove")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("clear")
                        .setDescription("Clear all warnings from a user")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The user to clear warnings from")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("reason")
                                .setDescription("Reason for clearing warnings")
                                .setRequired(false)
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View warnings for a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to view warnings for")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        // Check admin permissions for admin commands
        if (subcommandGroup === "admin") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent("**❌ Permission Denied**\n\nYou need **Moderate Members** permission to use admin warning commands!")
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                    );

                return await interaction.reply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                });
            }
        }

        try {
            if (subcommandGroup === "admin") {
                switch (subcommand) {
                    case "add":
                        await handleAddWarn(interaction);
                        break;
                    case "remove":
                        await handleRemoveWarn(interaction);
                        break;
                    case "clear":
                        await handleClearWarns(interaction);
                        break;
                }
            } else {
                switch (subcommand) {
                    case "view":
                        await handleViewWarns(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error('Warning command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**\n\nAn error occurred while executing the command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                });
            } else {
                await interaction.reply({ 
                    components: [errorContainer], 
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                });
            }
        }
    },
};

async function handleAddWarn(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guildId = interaction.guild.id;
    const moderator = interaction.user;

    if (user.id === interaction.user.id) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**❌ Error**\n\nYou cannot warn yourself!")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    if (user.bot) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**❌ Error**\n\nYou cannot warn bots!")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    // Get current warning count for ID generation
    const existingWarns = await WarnSchema.find({ guildId, userId: user.id });
    const warnId = existingWarns.length + 1;

    // Create new warning
    const newWarn = new WarnSchema({
        guildId,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
        warnId,
        timestamp: new Date()
    });

    await newWarn.save();

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**⚠️ Warning Added**")
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**User**\n${user.tag} (${user.id})`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Moderator**\n${moderator.tag}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Warning ID**\n#${warnId}`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Reason**\n${reason}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Total Warnings**\n${existingWarns.length + 1}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}

async function handleRemoveWarn(interaction) {
    const user = interaction.options.getUser("user");
    const warningId = interaction.options.getInteger("warning_id");
    const guildId = interaction.guild.id;
    const moderator = interaction.user;

    // Find the specific warning
    const warning = await WarnSchema.findOne({ guildId, userId: user.id, warnId: warningId });

    if (!warning) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**❌ Error**\n\nWarning #${warningId} not found for ${user.tag}!`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    await WarnSchema.deleteOne({ _id: warning._id });

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**✅ Warning Removed**")
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**User**\n${user.tag} (${user.id})`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Moderator**\n${moderator.tag}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Warning ID**\n#${warningId}`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Original Reason**\n${warning.reason}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}

async function handleClearWarns(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guildId = interaction.guild.id;
    const moderator = interaction.user;

    const warnings = await WarnSchema.find({ guildId, userId: user.id });

    if (warnings.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**❌ Error**\n\n${user.tag} has no warnings to clear!`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    await WarnSchema.deleteMany({ guildId, userId: user.id });

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**🧹 Warnings Cleared**")
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**User**\n${user.tag} (${user.id})`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Moderator**\n${moderator.tag}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Warnings Cleared**\n${warnings.length}`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Reason**\n${reason}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}

async function handleViewWarns(interaction) {
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    const warnings = await WarnSchema.find({ guildId, userId: user.id }).sort({ timestamp: -1 });

    if (warnings.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**📋 User Warnings**")
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`${user.tag} has no warnings!`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
        return await interaction.reply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });
    }

    const warningList = warnings.map((warn, index) => {
        const moderator = interaction.guild.members.cache.get(warn.moderatorId);
        const moderatorName = moderator ? moderator.user.tag : 'Unknown Moderator';
        const timestamp = Math.floor(warn.timestamp.getTime() / 1000);
        return `**${index + 1}.** Warning #${warn.warnId}\n` +
               `└ **Moderator:** ${moderatorName}\n` +
               `└ **Reason:** ${warn.reason}\n` +
               `└ **Date:** <t:${timestamp}:R>`;
    }).join('\n\n');

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**📋 Warnings for ${user.tag}**`)
        )
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(warningList.length > 4096 ? warningList.substring(0, 4093) + "..." : warningList)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}




