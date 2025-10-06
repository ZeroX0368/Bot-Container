
const config = require('../config.json');
const BlacklistSchema = require('../Schemas/blacklist');
const { activeGiveaways, getEmbedColor, getErrorColor } = require('../Commands/giveaway');
const { ContainerBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle button interactions for giveaways
        if (interaction.isButton() && interaction.customId.startsWith('giveaway_join_')) {
            await handleGiveawayJoin(interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        // Check if command is being used in DMs
        if (!interaction.guild) {
            const errorEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: '❌ Commands only work in servers',
                description: 'This command can only be used in Discord servers, not in direct messages.',
                timestamp: new Date()
            };
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if user or server is blacklisted
        const userBlacklist = await BlacklistSchema.findOne({ 
            type: 'user', 
            targetId: interaction.user.id 
        });
        
        const serverBlacklist = await BlacklistSchema.findOne({ 
            type: 'server', 
            targetId: interaction.guildId 
        });

        if (userBlacklist) {
            const errorEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: '❌ Blacklisted User',
                description: `You are blacklisted from using this bot.\n**Reason:** ${userBlacklist.reason}`,
                timestamp: new Date()
            };
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (serverBlacklist) {
            const errorEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: '❌ Blacklisted Server',
                description: `This server is blacklisted from using this bot.\n**Reason:** ${serverBlacklist.reason}`,
                timestamp: new Date()
            };
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            const errorEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: 'Error',
                description: 'There was an error while executing this command!',
                timestamp: new Date()
            };
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};

async function handleGiveawayJoin(interaction) {
    const messageId = interaction.message.id;
    const giveaway = activeGiveaways.get(messageId);

    if (!giveaway) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This giveaway has ended or is no longer valid.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (giveaway.ended) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ This giveaway has already ended.')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    if (giveaway.participants.has(interaction.user.id)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('❌ You are already entered in this giveaway!')
            );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    giveaway.participants.add(interaction.user.id);

    const successContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor(interaction.client))
        .addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`✅ **You've entered the giveaway!**\n\n**Prize:** ${giveaway.prize}\n**Total Entries:** ${giveaway.participants.size}`)
        );

    await interaction.reply({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
    });
}
