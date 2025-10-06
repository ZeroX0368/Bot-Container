
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
} = require("discord.js");
const config = require('../config.json');

// Helper function to get colors from config
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
        .setName("roles")
        .setDescription("Display all roles in the server"),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Permission Denied**\n\nYou need **Send Messages** permission to use this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Bot Permission Denied**\n\nI need **Send Messages** permission to execute this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        try {
            // Get all roles in the server, sorted by position (highest first)
            const roles = interaction.guild.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position);

            if (roles.size === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor())
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent("**🏷️ Roles [0]**\n\nNo roles found in this server!")
                    )
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                    );

                return await interaction.reply({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }

            // Create role list with mentions
            const roleList = roles.map(role => {
                return `<@&${role.id}>`;
            }).join('\n');

            // Split the role list if it's too long for one container
            const maxLength = 4000; // Slightly less than embed limit for safety
            const containers = [];

            if (roleList.length <= maxLength) {
                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor())
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`**🏷️ Roles [${roles.size}]**\n\n${roleList}`)
                    )
                    .addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(`*Total Roles: ${roles.size} • ${interaction.guild.name} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                    );

                containers.push(container);
            } else {
                // Split into multiple containers if too long
                const roleArray = roles.map(role => `<@&${role.id}>`);
                let currentPage = [];
                let currentLength = 0;
                let pageNumber = 1;

                for (const roleText of roleArray) {
                    if (currentLength + roleText.length + 1 > maxLength) {
                        // Create container for current page
                        const container = new ContainerBuilder()
                            .setAccentColor(getEmbedColor())
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent(`**🏷️ Roles [${roles.size}] - Page ${pageNumber}**\n\n${currentPage.join('\n')}`)
                            )
                            .addSeparatorComponents(separator => separator)
                            .addTextDisplayComponents(
                                textDisplay => textDisplay.setContent(`*Total Roles: ${roles.size} • ${interaction.guild.name} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                            );

                        containers.push(container);

                        // Reset for next page
                        currentPage = [roleText];
                        currentLength = roleText.length;
                        pageNumber++;
                    } else {
                        currentPage.push(roleText);
                        currentLength += roleText.length + 1; // +1 for newline
                    }
                }

                // Add the last page if it has content
                if (currentPage.length > 0) {
                    const container = new ContainerBuilder()
                        .setAccentColor(getEmbedColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**🏷️ Roles [${roles.size}] - Page ${pageNumber}**\n\n${currentPage.join('\n')}`)
                        )
                        .addSeparatorComponents(separator => separator)
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`*Total Roles: ${roles.size} • ${interaction.guild.name} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                        );

                    containers.push(container);
                }
            }

            // Send the first container, and if there are multiple pages, send them all
            if (containers.length === 1) {
                await interaction.reply({ 
                    components: [containers[0]], 
                    flags: MessageFlags.IsComponentsV2 
                });
            } else {
                // Send first container as reply
                await interaction.reply({ 
                    components: [containers[0]], 
                    flags: MessageFlags.IsComponentsV2 
                });
                
                // Send remaining containers as follow-ups
                for (let i = 1; i < containers.length; i++) {
                    await interaction.followUp({ 
                        components: [containers[i]], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }
            }

        } catch (error) {
            console.error('Roles command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**\n\nAn error occurred while fetching server roles!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }
    },
};
