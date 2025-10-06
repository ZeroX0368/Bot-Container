
const { SlashCommandBuilder, ContainerBuilder, MessageFlags } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Display server member statistics'),

    async execute(interaction) {
        const guild = interaction.guild;
        
        // Fetch all members to get accurate counts
        await guild.members.fetch();
        
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount;
        
        // Create container with server statistics
        const container = new ContainerBuilder()
            .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16));

        // Add main content
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`📊 **${guild.name} Member Count**`)
        );

        container.addSeparatorComponents(separator => separator);

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`There are total **${totalMembers}** members in this server`)
        );

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Humans:** ${humanCount}`)
        );

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Bots:** ${botCount}`)
        );

        // Add footer with timestamp
        const timestamp = Math.floor(new Date().getTime() / 1000);
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*Server ID: ${guild.id} • <t:${timestamp}:R>*`)
        );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
