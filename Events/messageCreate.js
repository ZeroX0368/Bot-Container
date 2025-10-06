
const { ContainerBuilder, MessageFlags } = require('discord.js');
const countingSchema = require('../Schemas/counting');
const { StickySchema, getEmbedColor } = require('../Commands/stick');
const { AFKSchema } = require('../Commands/afk');
const { MessageCounter, MessageSettings } = require('../Schemas/messages');
const config = require('../config.json');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // Handle message counting
        await handleMessageCounting(message);

        // Handle AFK system
        await handleAFKSystem(message);

        // Handle stick message interactions
        await handleStickMessages(message);

        const countingData = await countingSchema.findOne({ Guild: message.guild.id });
        
        if (!countingData || message.channel.id !== countingData.Channel) return;

        const expectedNumber = countingData.Count + 1;
        const userInput = parseInt(message.content);

        if (isNaN(userInput)) {
            return;
        }

        if (userInput !== expectedNumber) {
            countingData.Count = 0;
            countingData.LastUser = null;
            await countingData.save();

            const wrongEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: '❌ Wrong Number!',
                description: `**${message.author.username}** ruined it at **${countingData.Count + 1}**!\n\nThe next number is **1**.`,
                timestamp: new Date(),
            };

            await message.channel.send({ embeds: [wrongEmbed] });
            return;
        }

        if (countingData.LastUser === message.author.id) {
            countingData.Count = 0;
            countingData.LastUser = null;
            await countingData.save();

            const sameUserEmbed = {
                color: parseInt(config.ErrorColor.replace('#', ''), 16),
                title: '❌ Same User!',
                description: `**${message.author.username}** counted twice in a row!\n\nThe next number is **1**.`,
                timestamp: new Date(),
            };

            await message.channel.send({ embeds: [sameUserEmbed] });
            return;
        }

        countingData.Count = expectedNumber;
        countingData.LastUser = message.author.id;
        await countingData.save();

        await message.react('✅');
    },
};

// Rate limiting for sticky messages
const stickyRateLimit = new Map();

async function handleStickMessages(message) {
    const channelId = message.channel.id;
    
    try {
        const stickyData = await StickySchema.findOne({ channelId: channelId });
        
        if (!stickyData) return;

        // Check if the message is the sticky message itself
        if (message.id === stickyData.messageId) return;

        // Rate limiting - only allow sticky update every 3 seconds per channel
        const now = Date.now();
        const lastUpdate = stickyRateLimit.get(channelId) || 0;
        
        if (now - lastUpdate < 3000) {
            return; // Skip if too frequent
        }
        
        stickyRateLimit.set(channelId, now);

        // Delete the old sticky message
        const oldMessage = await message.channel.messages.fetch(stickyData.messageId).catch(() => null);
        if (oldMessage) {
            await oldMessage.delete().catch(() => {});
        }

        // Wait a moment to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create new sticky message container
        const stickyContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor(message.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent('📌 **Stickied Message:**')
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(stickyData.content)
            );

        // Send new sticky message
        const newStickyMsg = await message.channel.send({
            components: [stickyContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // Update the stored message ID in MongoDB
        stickyData.messageId = newStickyMsg.id;
        await stickyData.save();

        // Clean up old rate limit entries (older than 5 minutes)
        setTimeout(() => {
            for (const [key, timestamp] of stickyRateLimit.entries()) {
                if (now - timestamp > 300000) { // 5 minutes
                    stickyRateLimit.delete(key);
                }
            }
        }, 60000); // Clean up every minute

    } catch (error) {
        console.error('Error handling sticky message:', error);
    }
}

async function handleAFKSystem(message) {
    try {
        const userId = message.author.id;
        const guildId = message.guild.id;

        // Check if the message author is AFK and remove their status
        const authorAFK = await AFKSchema.findOneAndDelete({ userId: userId, guildId: guildId });
        
        if (authorAFK) {
            // Try to remove [AFK] prefix from nickname
            try {
                const member = message.member;
                const currentNick = member.displayName;
                
                if (currentNick.startsWith('[AFK] ')) {
                    const newNick = currentNick.replace('[AFK] ', '');
                    await member.setNickname(newNick, 'User removed AFK status');
                }
            } catch (error) {
                // Ignore nickname errors
            }

            const afkDuration = Date.now() - authorAFK.timestamp.getTime();
            const duration = Math.floor(afkDuration / 1000);

            const welcomeContainer = new ContainerBuilder()
                .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`✅ **Welcome back, ${message.author}!**\n\nYou were AFK for <t:${Math.floor(authorAFK.timestamp.getTime() / 1000)}:R>`)
                );

            if (authorAFK.mentions > 0) {
                welcomeContainer.addSeparatorComponents(separator => separator)
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`📨 You received **${authorAFK.mentions}** mention${authorAFK.mentions === 1 ? '' : 's'} while you were away.`)
                    );
            }

            await message.reply({
                components: [welcomeContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check for mentions of AFK users
        if (message.mentions.users.size > 0) {
            const mentionedAFKUsers = [];
            
            for (const [mentionedUserId, mentionedUser] of message.mentions.users) {
                if (mentionedUserId === message.author.id) continue; // Skip self-mentions
                
                const afkUser = await AFKSchema.findOne({ userId: mentionedUserId, guildId: guildId });
                
                if (afkUser) {
                    // Increment mention count
                    afkUser.mentions += 1;
                    await afkUser.save();
                    
                    mentionedAFKUsers.push(afkUser);
                }
            }

            // Send AFK notifications for mentioned users
            if (mentionedAFKUsers.length > 0) {
                let afkContent = '💤 **AFK Users Mentioned:**\n\n';
                
                mentionedAFKUsers.forEach((afkUser, index) => {
                    const afkTime = Math.floor(afkUser.timestamp.getTime() / 1000);
                    afkContent += `**${index + 1}.** <@${afkUser.userId}> is currently AFK\n`;
                    afkContent += `   • **Reason:** ${afkUser.reason}\n`;
                    afkContent += `   • **Since:** <t:${afkTime}:R>\n\n`;
                });

                const afkContainer = new ContainerBuilder()
                    .setAccentColor(parseInt(config.EmbedColor.replace('#', ''), 16))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(afkContent)
                    );

                await message.reply({
                    components: [afkContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

    } catch (error) {
        console.error('Error handling AFK system:', error);
    }
}

async function handleMessageCounting(message) {
    try {
        const guildId = message.guild.id;
        const userId = message.author.id;

        // Check if message counting is enabled for this server
        const settings = await MessageSettings.findOne({ guildId: guildId });
        if (settings && !settings.enabled) return;

        // Don't count messages in counting channels
        const countingData = await countingSchema.findOne({ Guild: guildId });
        if (countingData && message.channel.id === countingData.Channel) return;

        // Update user's message count
        await MessageCounter.findOneAndUpdate(
            { userId: userId, guildId: guildId },
            { 
                $inc: { messageCount: 1 },
                $set: { 
                    username: message.author.username,
                    lastUpdated: new Date()
                }
            },
            { upsert: true }
        );

    } catch (error) {
        console.error('Error handling message counting:', error);
    }
}
