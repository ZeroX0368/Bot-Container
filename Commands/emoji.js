
const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const config = require('../config.json');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Manage server emojis')
        .addSubcommand(subcommand =>
            subcommand
                .setName('steal')
                .setDescription('Steal an emoji from another server or message')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to steal (custom emoji or emoji ID)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Custom name for the stolen emoji (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('upload')
                .setDescription('Upload a new emoji from an image attachment')
                .addAttachmentOption(option =>
                    option
                        .setName('attachment')
                        .setDescription('Image file to upload as emoji (PNG, JPG, GIF)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the new emoji')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        // Check user permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return await interaction.reply({
                content: '❌ You need **Manage Emojis and Stickers** permission to use this command!',
                ephemeral: true
            });
        }

        // Check bot permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return await interaction.reply({
                content: '❌ I need **Manage Emojis and Stickers** permission to execute this command!',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'steal':
                    await handleStealEmoji(interaction);
                    break;
                case 'upload':
                    await handleUploadEmoji(interaction);
                    break;
            }
        } catch (error) {
            console.error('Emoji command error:', error);
            return await interaction.reply({
                content: '❌ An error occurred while executing the emoji command!',
                ephemeral: true
            });
        }
    },
};

async function handleStealEmoji(interaction) {
    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');
    const customName = interaction.options.getString('name');

    let emojiId = null;
    let emojiName = null;
    let isAnimated = false;

    // Parse emoji from different formats
    const customEmojiMatch = emojiInput.match(/<(a?):(\w+):(\d+)>/);
    
    if (customEmojiMatch) {
        // Custom emoji format <:name:id> or <a:name:id>
        isAnimated = customEmojiMatch[1] === 'a';
        emojiName = customEmojiMatch[2];
        emojiId = customEmojiMatch[3];
    } else if (/^\d+$/.test(emojiInput)) {
        // Just emoji ID
        emojiId = emojiInput;
        emojiName = customName || 'stolen_emoji';
    } else {
        return await interaction.editReply({
            content: '❌ Invalid emoji format! Please provide a custom emoji or emoji ID.'
        });
    }

    const finalName = customName || emojiName;

    // Validate emoji name
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(finalName)) {
        return await interaction.editReply({
            content: '❌ Invalid emoji name! Name must be 2-32 characters and contain only letters, numbers, and underscores.'
        });
    }

    try {
        const extension = isAnimated ? 'gif' : 'png';
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

        // Download the emoji
        const response = await fetch(emojiUrl);
        if (!response.ok) {
            return await interaction.editReply({
                content: '❌ Could not find or download the emoji!'
            });
        }

        const buffer = await response.buffer();

        // Create the emoji
        const createdEmoji = await interaction.guild.emojis.create({
            attachment: buffer,
            name: finalName,
            reason: `Emoji stolen by ${interaction.user.tag}`
        });

        await interaction.editReply({
            content: `✅ Successfully stole emoji: ${createdEmoji} \`${createdEmoji.name}\``
        });

    } catch (error) {
        console.error('Error stealing emoji:', error);
        
        if (error.code === 30008) {
            return await interaction.editReply({
                content: '❌ Server has reached the maximum number of emojis!'
            });
        } else if (error.code === 50035) {
            return await interaction.editReply({
                content: '❌ Invalid emoji name or file format!'
            });
        } else {
            return await interaction.editReply({
                content: '❌ Failed to steal emoji! The emoji might not exist or the server might be at its emoji limit.'
            });
        }
    }
}

async function handleUploadEmoji(interaction) {
    await interaction.deferReply();

    const attachment = interaction.options.getAttachment('attachment');
    const name = interaction.options.getString('name');

    // Validate emoji name
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(name)) {
        return await interaction.editReply({
            content: '❌ Invalid emoji name! Name must be 2-32 characters and contain only letters, numbers, and underscores.'
        });
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(attachment.contentType)) {
        return await interaction.editReply({
            content: '❌ Invalid file type! Please upload a PNG, JPG, or GIF image.'
        });
    }

    // Validate file size (256KB limit for Discord emojis)
    if (attachment.size > 262144) {
        return await interaction.editReply({
            content: '❌ File too large! Emoji files must be under 256KB.'
        });
    }

    try {
        // Download the attachment
        const response = await fetch(attachment.url);
        if (!response.ok) {
            return await interaction.editReply({
                content: '❌ Could not download the attachment!'
            });
        }

        const buffer = await response.buffer();

        // Create the emoji
        const createdEmoji = await interaction.guild.emojis.create({
            attachment: buffer,
            name: name,
            reason: `Emoji uploaded by ${interaction.user.tag}`
        });

        await interaction.editReply({
            content: `✅ Successfully uploaded emoji: ${createdEmoji} \`${createdEmoji.name}\``
        });

    } catch (error) {
        console.error('Error uploading emoji:', error);
        
        if (error.code === 30008) {
            return await interaction.editReply({
                content: '❌ Server has reached the maximum number of emojis!'
            });
        } else if (error.code === 50035) {
            return await interaction.editReply({
                content: '❌ Invalid emoji name or file format!'
            });
        } else {
            return await interaction.editReply({
                content: '❌ Failed to upload emoji! Please check the file format and try again.'
            });
        }
    }
}
