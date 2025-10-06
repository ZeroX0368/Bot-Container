const {
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require("discord.js");
const config = require('../config.json');
const BlacklistSchema = require('../Schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist")
        .setDescription("Owner-only blacklist management commands")
        .setDMPermission(false)
        .addSubcommandGroup(group =>
            group
                .setName('user')
                .setDescription('Manage user blacklist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a user to blacklist')
                        .addUserOption(option =>
                            option
                                .setName('member')
                                .setDescription('The user to blacklist')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('memberid')
                                .setDescription('The user ID to blacklist')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Reason for blacklisting')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a user from blacklist')
                        .addUserOption(option =>
                            option
                                .setName('member')
                                .setDescription('The user to unblacklist')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('memberid')
                                .setDescription('The user ID to unblacklist')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all blacklisted users')
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('server')
                .setDescription('Manage server blacklist')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a server to blacklist')
                        .addStringOption(option =>
                            option
                                .setName('serverid')
                                .setDescription('The server ID to blacklist')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Reason for blacklisting')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a server from blacklist')
                        .addStringOption(option =>
                            option
                                .setName('serverid')
                                .setDescription('The server ID to unblacklist')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all blacklisted servers')
                )
        ),

    async execute(interaction) {
        // Owner-only check
        if (interaction.user.id !== config.OwnerID) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Access Denied")
                .setDescription("This command is only available to the bot owner!")
                .setTimestamp();

            return await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            if (group === 'user') {
                switch (subcommand) {
                    case 'add':
                        await handleUserAdd(interaction);
                        break;
                    case 'remove':
                        await handleUserRemove(interaction);
                        break;
                    case 'list':
                        await handleUserList(interaction);
                        break;
                }
            } else if (group === 'server') {
                switch (subcommand) {
                    case 'add':
                        await handleServerAdd(interaction);
                        break;
                    case 'remove':
                        await handleServerRemove(interaction);
                        break;
                    case 'list':
                        await handleServerList(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error('Blacklist command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Error")
                .setDescription("An error occurred while executing the command!")
                .setTimestamp();

            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    },
};

async function handleUserAdd(interaction) {
    const member = interaction.options.getUser('member');
    const memberId = interaction.options.getString('memberid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member && !memberId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Please provide either a member or member ID!")
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    const targetId = member ? member.id : memberId;
    const targetTag = member ? member.tag : `User ID: ${memberId}`;

    // Check if already blacklisted
    const existing = await BlacklistSchema.findOne({ type: 'user', targetId });
    if (existing) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Already Blacklisted")
            .setDescription(`${targetTag} is already blacklisted!`)
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    // Add to blacklist
    await BlacklistSchema.create({
        guildId: 'global',
        type: 'user',
        targetId,
        reason,
        addedBy: interaction.user.id
    });

    const successEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ User Blacklisted")
        .addFields(
            { name: "User", value: targetTag, inline: true },
            { name: "Added By", value: interaction.user.tag, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleUserRemove(interaction) {
    const member = interaction.options.getUser('member');
    const memberId = interaction.options.getString('memberid');

    if (!member && !memberId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Please provide either a member or member ID!")
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    const targetId = member ? member.id : memberId;
    const targetTag = member ? member.tag : `User ID: ${memberId}`;

    const deleted = await BlacklistSchema.findOneAndDelete({ type: 'user', targetId });
    if (!deleted) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Not Found")
            .setDescription(`${targetTag} is not blacklisted!`)
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ User Removed from Blacklist")
        .addFields(
            { name: "User", value: targetTag, inline: true },
            { name: "Removed By", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleUserList(interaction) {
    const blacklistedUsers = await BlacklistSchema.find({ type: 'user' });

    if (blacklistedUsers.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle("📋 Blacklisted Users")
            .setDescription("No users are currently blacklisted!")
            .setTimestamp();

        return await interaction.reply({ embeds: [emptyEmbed] });
    }

    const embeds = [];
    const itemsPerPage = 10;

    for (let i = 0; i < blacklistedUsers.length; i += itemsPerPage) {
        const pageUsers = blacklistedUsers.slice(i, i + itemsPerPage);
        const userList = pageUsers.map((user, index) => {
            return `**${i + index + 1}.** <@${user.targetId}> (${user.targetId})\n└ Reason: ${user.reason}\n└ Added: <t:${Math.floor(user.addedAt.getTime() / 1000)}:R>`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle(`📋 Blacklisted Users (${blacklistedUsers.length} total)`)
            .setDescription(userList)
            .setFooter({
                text: `Page ${Math.floor(i / itemsPerPage) + 1}/${Math.ceil(blacklistedUsers.length / itemsPerPage)}`
            })
            .setTimestamp();

        embeds.push(embed);
    }

    await paginateEmbeds(interaction, embeds);
}

async function handleServerAdd(interaction) {
    const serverId = interaction.options.getString('serverid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if already blacklisted
    const existing = await BlacklistSchema.findOne({ type: 'server', targetId: serverId });
    if (existing) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Already Blacklisted")
            .setDescription(`Server ${serverId} is already blacklisted!`)
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    // Add to blacklist
    await BlacklistSchema.create({
        guildId: 'global',
        type: 'server',
        targetId: serverId,
        reason,
        addedBy: interaction.user.id
    });

    const successEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ Server Blacklisted")
        .addFields(
            { name: "Server ID", value: serverId, inline: true },
            { name: "Added By", value: interaction.user.tag, inline: true },
            { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleServerRemove(interaction) {
    const serverId = interaction.options.getString('serverid');

    const deleted = await BlacklistSchema.findOneAndDelete({ type: 'server', targetId: serverId });
    if (!deleted) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Not Found")
            .setDescription(`Server ${serverId} is not blacklisted!`)
            .setTimestamp();

        return await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        });
    }

    const successEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("✅ Server Removed from Blacklist")
        .addFields(
            { name: "Server ID", value: serverId, inline: true },
            { name: "Removed By", value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleServerList(interaction) {
    const blacklistedServers = await BlacklistSchema.find({ type: 'server' });

    if (blacklistedServers.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle("📋 Blacklisted Servers")
            .setDescription("No servers are currently blacklisted!")
            .setTimestamp();

        return await interaction.reply({ embeds: [emptyEmbed] });
    }

    const embeds = [];
    const itemsPerPage = 10;

    for (let i = 0; i < blacklistedServers.length; i += itemsPerPage) {
        const pageServers = blacklistedServers.slice(i, i + itemsPerPage);
        const serverList = pageServers.map((server, index) => {
            return `**${i + index + 1}.** ${server.targetId}\n└ Reason: ${server.reason}\n└ Added: <t:${Math.floor(server.addedAt.getTime() / 1000)}:R>`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle(`📋 Blacklisted Servers (${blacklistedServers.length} total)`)
            .setDescription(serverList)
            .setFooter({
                text: `Page ${Math.floor(i / itemsPerPage) + 1}/${Math.ceil(blacklistedServers.length / itemsPerPage)}`
            })
            .setTimestamp();

        embeds.push(embed);
    }

    await paginateEmbeds(interaction, embeds);
}

async function paginateEmbeds(interaction, embeds) {
    if (embeds.length === 1) {
        return await interaction.reply({ embeds: [embeds[0]] });
    }

    let currentIndex = 0;

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('first')
                .setEmoji('⏪')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('prev')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('page')
                .setLabel(`1/${embeds.length}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(embeds.length === 1),
            new ButtonBuilder()
                .setCustomId('last')
                .setEmoji('⏩')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(embeds.length === 1)
        );

    const message = await interaction.reply({
        embeds: [embeds[currentIndex]],
        components: [buttons],
        fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return await buttonInteraction.reply({
                content: 'Only the command user can use these buttons!',
                ephemeral: true
            });
        }

        switch (buttonInteraction.customId) {
            case 'first':
                currentIndex = 0;
                break;
            case 'prev':
                if (currentIndex > 0) currentIndex--;
                break;
            case 'next':
                if (currentIndex < embeds.length - 1) currentIndex++;
                break;
            case 'last':
                currentIndex = embeds.length - 1;
                break;
        }

        // Update button states
        buttons.components[0].setDisabled(currentIndex === 0);
        buttons.components[1].setDisabled(currentIndex === 0);
        buttons.components[2].setLabel(`${currentIndex + 1}/${embeds.length}`);
        buttons.components[3].setDisabled(currentIndex === embeds.length - 1);
        buttons.components[4].setDisabled(currentIndex === embeds.length - 1);

        await buttonInteraction.update({
            embeds: [embeds[currentIndex]],
            components: [buttons]
        });
    });

    collector.on('end', () => {
        buttons.components.forEach(button => button.setDisabled(true));
        interaction.editReply({ components: [buttons] }).catch(() => {});
    });
}