
const { ContainerBuilder, MessageFlags, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const config = require('../config.json');
const BlacklistSchema = require('../Schemas/blacklist');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Check if the bot is mentioned
        const mentionString = `<@${message.client.user.id}>`;
        const mentionStringNick = `<@!${message.client.user.id}>`;
        const messageContent = message.content.trim();
        
        if (message.mentions.has(message.client.user) && 
            message.mentions.users.has(message.client.user.id) &&
            (messageContent === mentionString || messageContent === mentionStringNick)) {
            
            // Check if user or server is blacklisted
            const userBlacklist = await BlacklistSchema.findOne({ 
                type: 'user', 
                targetId: message.author.id 
            });
            
            const serverBlacklist = await BlacklistSchema.findOne({ 
                type: 'server', 
                targetId: message.guild.id 
            });

            if (userBlacklist || serverBlacklist) {
                return; // Silently ignore blacklisted users/servers
            }

            try {
                // Create container
                const container = new ContainerBuilder()
                    .setAccentColor(parseInt((config.EmbedColor || '#0099ff').replace('#', ''), 16));

                // Add title and description
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Hi, I'm ${message.client.user.username}!**\n\nUse with commands via Discord slash commands`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add invite section with button
                container.addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**📨┆Invite me**\nInvite ${message.client.user.username} to your own server!`)
                        )
                        .setButtonAccessory(
                            button => button
                                .setLabel('Invite Bot')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                        )
                );

                container.addSeparatorComponents(separator => separator);

                // Add slash commands info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**❓┇I don't see any slash commands**\nThe bot may not have permissions for this. Open the invite link again and select your server. The bot then gets the correct permissions`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add support section with button
                container.addSectionComponents(
                    section => section
                        .addTextDisplayComponents(
                            textDisplay => textDisplay
                                .setContent(`**❓┆Need support?**\nFor questions you can join our support server!`)
                        )
                        .setButtonAccessory(
                            button => button
                                .setLabel('Support Server')
                                .setStyle(ButtonStyle.Link)
                                .setURL(config.Support)
                        )
                );

                container.addSeparatorComponents(separator => separator);

                // Add error feedback info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**🐞┆Error?**\nFeedback: \`/bot feedback\`!`)
                );

                container.addSeparatorComponents(separator => separator);

                // Add footer info
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`*Requested by: ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

                // Send the container response
                await message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                });

            } catch (error) {
                console.error('Error handling mention:', error);
                
                // Send fallback error message
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(parseInt((config.ErrorColor || '#ff0000').replace('#', ''), 16))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`❌ **Error**\nSomething went wrong while processing your mention. Please try again later.`)
                    );

                await message.reply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { repliedUser: false }
                }).catch(err => console.error('Failed to send error message:', err));
            }
        }
    },
};
