
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
} = require("discord.js");
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("moderation")
        .setDescription("Moderation commands for server management")
        .addSubcommand(subcommand =>
            subcommand
                .setName("ban")
                .setDescription("Ban a member from the server")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to ban")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for the ban")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("kick")
                .setDescription("Kick a member from the server")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to kick")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for the kick")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("timeout")
                .setDescription("Timeout a member (1m to 32d)")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to timeout")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("Duration (e.g., 1m, 1h, 1d)")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for the timeout")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("untimeout")
                .setDescription("Remove timeout from a member")
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to remove timeout from")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for removing timeout")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("banlist")
                .setDescription("Display all banned users and bots in the server")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("unban")
                .setDescription("Unban a user by their ID")
                .addStringOption(option =>
                    option
                        .setName("member_id")
                        .setDescription("The ID of the member to unban")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for the unban")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("unbanall")
                .setDescription("Unban all users and bots in the server")
        ),

    async execute(interaction) {
        // Check if user has Administrator permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Permission Denied")
                .setDescription("You need **Administrator** permission to use this command!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if bot has Administrator permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Bot Permission Denied")
                .setDescription("I need **Administrator** permission to execute moderation commands!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "ban":
                    await handleBan(interaction);
                    break;
                case "kick":
                    await handleKick(interaction);
                    break;
                case "timeout":
                    await handleTimeout(interaction);
                    break;
                case "untimeout":
                    await handleUntimeout(interaction);
                    break;
                case "banlist":
                    await handleBanlist(interaction);
                    break;
                case "unban":
                    await handleUnban(interaction);
                    break;
                case "unbanall":
                    await handleUnbanAll(interaction);
                    break;
            }
        } catch (error) {
            console.error('Moderation command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Error")
                .setDescription("An error occurred while executing the command!")
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};

async function handleBan(interaction) {
    const member = interaction.options.getMember("member");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Member not found in this server!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.id === interaction.user.id) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("You cannot ban yourself!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("You cannot ban someone with higher or equal role!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await member.ban({ reason: reason });

    const embed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("🔨 Member Banned")
        .addFields(
            { name: "Member", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleKick(interaction) {
    const member = interaction.options.getMember("member");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Member not found in this server!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.id === interaction.user.id) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("You cannot kick yourself!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("You cannot kick someone with higher or equal role!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await member.kick(reason);

    const embed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("👢 Member Kicked")
        .addFields(
            { name: "Member", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleTimeout(interaction) {
    const member = interaction.options.getMember("member");
    const duration = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Member not found in this server!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const timeoutDuration = parseDuration(duration);
    if (!timeoutDuration || timeoutDuration > 32 * 24 * 60 * 60 * 1000) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Invalid duration! Use format like: 1m, 1h, 1d (max 32d)")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.id === interaction.user.id) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("You cannot timeout yourself!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await member.timeout(timeoutDuration, reason);

    const embed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("⏰ Member Timed Out")
        .addFields(
            { name: "Member", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Duration", value: duration, inline: true },
            { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleUntimeout(interaction) {
    const member = interaction.options.getMember("member");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Member not found in this server!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!member.communicationDisabledUntil) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("This member is not timed out!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await member.timeout(null, reason);

    const embed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ Timeout Removed")
        .addFields(
            { name: "Member", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleBanlist(interaction) {
    await interaction.deferReply();
    
    const bans = await interaction.guild.bans.fetch();
    const banArray = Array.from(bans.values());

    if (banArray.length === 0) {
        const noBansContainer = new ContainerBuilder()
            .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📭 **No Banned Users**\n\nThis server has no banned users.')
            );

        return await interaction.editReply({
            components: [noBansContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(banArray.length / itemsPerPage);
    const containers = [];

    // Create containers for each page
    for (let page = 0; page < totalPages; page++) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const currentBans = banArray.slice(start, end);

        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🔨 **Banned Users (Page ${page + 1}/${totalPages})**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add each banned user
        currentBans.forEach((ban, index) => {
            const globalIndex = start + index + 1;
            const reason = ban.reason || 'No reason provided';
            const truncatedReason = reason.length > 100 ? reason.substring(0, 100) + '...' : reason;

            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${globalIndex}. ${ban.user.tag}**\n**ID:** \`${ban.user.id}\`\n**Reason:** ${truncatedReason}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(ban.user.displayAvatarURL())
                    )
            );

            if (index < currentBans.length - 1) {
                container.addSeparatorComponents(separator => separator);
            }
        });

        // Add footer
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Total: ${banArray.length} banned users*`)
        );

        containers.push(container);
    }

    // Use pagination if more than one page
    if (containers.length === 1) {
        await interaction.editReply({
            components: [containers[0]],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        // Add pagination function if not already present
        await paginateContainers(interaction, containers);
    }
}

async function handleUnban(interaction) {
    const memberId = interaction.options.getString("member_id");
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
        await interaction.guild.bans.remove(memberId, reason);

        const embed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle("✅ User Unbanned")
            .addFields(
                { name: "User ID", value: memberId, inline: true },
                { name: "Moderator", value: `${interaction.user.tag}`, inline: true },
                { name: "Reason", value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("User not found in ban list or invalid user ID!")
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function handleUnbanAll(interaction) {
    const bans = await interaction.guild.bans.fetch();

    if (bans.size === 0) {
        const embed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("No banned users found in this server!")
            .setTimestamp();
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply();

    let unbannedCount = 0;
    for (const ban of bans.values()) {
        try {
            await interaction.guild.bans.remove(ban.user.id, `Unban all command by ${interaction.user.tag}`);
            unbannedCount++;
        } catch (error) {
            console.error(`Failed to unban ${ban.user.tag}:`, error);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ Mass Unban Complete")
        .addFields(
            { name: "Total Unbanned", value: `${unbannedCount}/${bans.size}`, inline: true },
            { name: "Moderator", value: `${interaction.user.tag}`, inline: true }
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function parseDuration(duration) {
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return amount * 60 * 1000; // minutes
        case 'h': return amount * 60 * 60 * 1000; // hours
        case 'd': return amount * 24 * 60 * 60 * 1000; // days
        default: return null;
    }
}

async function paginateContainers(interaction, containers) {
    if (containers.length === 1) {
        return await interaction.editReply({
            components: [containers[0]],
            flags: MessageFlags.IsComponentsV2
        });
    }

    let currentPage = 0;
    const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

    const getButtons = (currentPage, totalPages) => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setEmoji('⏪')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('page')
                    .setLabel(`${currentPage + 1}/${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setEmoji('⏩')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages - 1)
            );
    };

    const message = await interaction.editReply({
        components: [containers[currentPage], getButtons(currentPage, containers.length)],
        flags: MessageFlags.IsComponentsV2
    });

    const collector = message.createMessageComponentCollector({
        time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return await buttonInteraction.reply({
                content: 'You cannot use these buttons.',
                ephemeral: true
            });
        }

        switch (buttonInteraction.customId) {
            case 'first':
                currentPage = 0;
                break;
            case 'prev':
                currentPage = Math.max(0, currentPage - 1);
                break;
            case 'next':
                currentPage = Math.min(containers.length - 1, currentPage + 1);
                break;
            case 'last':
                currentPage = containers.length - 1;
                break;
        }

        await buttonInteraction.update({
            components: [containers[currentPage], getButtons(currentPage, containers.length)],
            flags: MessageFlags.IsComponentsV2
        });
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({
                components: [containers[currentPage]],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            // Message might have been deleted
        }
    });
}
