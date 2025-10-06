const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');
const { MessageCounter, MessageSettings } = require('../Schemas/messages');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Message Counter')
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
        .addSubcommandGroup(group =>
            group
                .setName('view')
                .setDescription('View message statistics')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('user')
                        .setDescription('Display the number of messages sent by a member')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('Member to view statistics for')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('Display top 10 members with the most messages sent')))
        .addSubcommandGroup(group =>
            group
                .setName('admin')
                .setDescription('Manage message counter (Admin only)')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('settings')
                        .setDescription('Configure message counter'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Enable message counter'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable message counter'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reset-all')
                        .setDescription('Reset all message counters'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add messages to a member\'s message counter')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('Member to add messages for')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option
                                .setName('amount')
                                .setDescription('Number of messages to add')
                                .setRequired(true)
                                .setMinValue(1)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove messages from a member\'s message counter')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('Member to remove messages from')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option
                                .setName('amount')
                                .setDescription('Number of messages to remove')
                                .setRequired(true)
                                .setMinValue(1)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reset')
                        .setDescription('Reset a member\'s message counter')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('Member to reset')
                                .setRequired(true)))),

    async execute(interaction) {
        // Check basic permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16));

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **No Permission**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You need "Use Application Commands" permission to use this command!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        // Check admin permissions for admin commands
        if (group === 'admin' && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16));

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **No Permission**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('You need **Administrator** permission to use admin commands!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            return await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        try {
            if (group === 'view') {
                if (subcommand === 'user') {
                    await handleViewUser(interaction);
                } else if (subcommand === 'leaderboard') {
                    await handleLeaderboard(interaction);
                }
            } else if (group === 'admin') {
                switch (subcommand) {
                    case 'settings':
                        await handleSettings(interaction);
                        break;
                    case 'enable':
                        await handleEnable(interaction);
                        break;
                    case 'disable':
                        await handleDisable(interaction);
                        break;
                    case 'reset-all':
                        await handleResetAll(interaction);
                        break;
                    case 'add':
                        await handleAdd(interaction);
                        break;
                    case 'remove':
                        await handleRemove(interaction);
                        break;
                    case 'reset':
                        await handleReset(interaction);
                        break;
                }
            }
        } catch (error) {
            console.error('Messages command error:', error);
            const container = new ContainerBuilder()
                .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16));

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('❌ **Error**')
            );

            container.addSeparatorComponents(separator => separator);

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent('An error occurred while executing the command!')
            );

            const timestamp = Math.floor(new Date().getTime() / 1000);
            container.addSeparatorComponents(separator => separator);
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
            );

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};

async function handleViewUser(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const userStats = await MessageCounter.findOne({ userId: user.id, guildId: guildId });
    const messageCount = userStats ? userStats.messageCount : 0;

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    // Add title
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('📊 **Message Statistics**')
    );

    container.addSeparatorComponents(separator => separator);

    // Add user info
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`💬 **Messages:** ${messageCount.toLocaleString()}`)
    );

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`👤 **Member:** ${user}`)
    );
    container.addSeparatorComponents(separator => separator);

    // Add footer
    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*ID: ${user.id} • <t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] }
    });
}

async function handleLeaderboard(interaction) {
    const guildId = interaction.guild.id;

    const topUsers = await MessageCounter.find({ guildId: guildId })
        .sort({ messageCount: -1 })
        .limit(10);

    if (topUsers.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent('📊 **Message Leaderboard**')
        );

        container.addSeparatorComponents(separator => separator);

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent('No statistics data available yet!')
        );

        const timestamp = Math.floor(new Date().getTime() / 1000);
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
        );

        return await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    let leaderboard = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const medal = medals[i] || `**${i + 1}.**`;
        const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
        const displayName = member ? member.displayName : user.username;

        leaderboard += `${medal} ${displayName} - **${user.messageCount.toLocaleString()}** messages\n`;
    }

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    // Add title
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('📊 **Message Leaderboard**')
    );

    container.addSeparatorComponents(separator => separator);

    // Add leaderboard content
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(leaderboard)
    );

    // Add footer
    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*Server: ${interaction.guild.name} • <t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleSettings(interaction) {
    const guildId = interaction.guild.id;

    let settings = await MessageSettings.findOne({ guildId: guildId });
    if (!settings) {
        settings = await MessageSettings.create({ guildId: guildId });
    }

    const totalUsers = await MessageCounter.countDocuments({ guildId: guildId });
    const totalMessages = await MessageCounter.aggregate([
        { $match: { guildId: guildId } },
        { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]);

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('⚙️ **Message Counter Settings**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`📊 **Status:** ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}`)
    );

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`👥 **Tracked users:** ${totalUsers}`)
    );

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`💬 **Total messages:** ${totalMessages[0]?.total?.toLocaleString() || 0}`)
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*Guild ID: ${guildId} • <t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleEnable(interaction) {
    const guildId = interaction.guild.id;

    await MessageSettings.findOneAndUpdate(
        { guildId: guildId },
        { enabled: true },
        { upsert: true }
    );

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('✅ **Message Counter Enabled**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('Message counter has been enabled for this server!')
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleDisable(interaction) {
    const guildId = interaction.guild.id;

    await MessageSettings.findOneAndUpdate(
        { guildId: guildId },
        { enabled: false },
        { upsert: true }
    );

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('❌ **Message Counter Disabled**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('Message counter has been disabled for this server!')
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleResetAll(interaction) {
    const guildId = interaction.guild.id;

    await interaction.deferReply();

    const result = await MessageCounter.deleteMany({ guildId: guildId });

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('🔄 **Reset All**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`Deleted data for **${result.deletedCount}** users!`)
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleAdd(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    await MessageCounter.findOneAndUpdate(
        { userId: user.id, guildId: guildId },
        { 
            $inc: { messageCount: amount },
            $set: { 
                username: user.username,
                lastUpdated: new Date()
            }
        },
        { upsert: true }
    );

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('➕ **Add Messages**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`Added **${amount.toLocaleString()}** messages to ${user}!`)
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleRemove(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    const userStats = await MessageCounter.findOne({ userId: user.id, guildId: guildId });
    if (!userStats) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16));

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent('❌ **Error**')
        );

        container.addSeparatorComponents(separator => separator);

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`No data found for ${user}!`)
        );

        const timestamp = Math.floor(new Date().getTime() / 1000);
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
        );

        return await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const newCount = Math.max(0, userStats.messageCount - amount);

    await MessageCounter.findOneAndUpdate(
        { userId: user.id, guildId: guildId },
        { 
            messageCount: newCount,
            lastUpdated: new Date()
        }
    );

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('➖ **Remove Messages**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`Removed **${amount.toLocaleString()}** messages from ${user}!\nCurrent message count: **${newCount.toLocaleString()}**`)
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleReset(interaction) {
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    const result = await MessageCounter.findOneAndDelete({ userId: user.id, guildId: guildId });

    if (!result) {
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.ErrorColor.replace('#', ''), 16));

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent('❌ **Error**')
        );

        container.addSeparatorComponents(separator => separator);

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`No data found for ${user}!`)
        );

        const timestamp = Math.floor(new Date().getTime() / 1000);
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
        );

        return await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    const container = new ContainerBuilder()
        .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent('🔄 **Reset**')
    );

    container.addSeparatorComponents(separator => separator);

    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`Reset message counter for ${user}!`)
    );

    const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*<t:${timestamp}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}