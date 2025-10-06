
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

const IMAGE_API_KEY = 'bucu';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI-powered commands')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.UseApplicationCommands)
        .addSubcommand(subcommand =>
            subcommand
                .setName('imagine')
                .setDescription('Generate an image from a text prompt using AI')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('The prompt to generate an image from')
                        .setRequired(true)
                        .setMaxLength(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('chatbot')
                .setDescription('Chat with AI using Pollinations API')
                .addStringOption(option =>
                    option
                        .setName('prompt')
                        .setDescription('Your message to the AI')
                        .setRequired(true)
                        .setMaxLength(1000))),

    async execute(interaction) {
        // Check user permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Permission Denied**\n\nYou need **Use Application Commands** permission to use this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        // Check bot permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Bot Permission Denied**\n\nI need **Use Application Commands** permission to execute this command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'imagine':
                    await handleImageGenerate(interaction);
                    break;
                case 'chatbot':
                    await handleChatbot(interaction);
                    break;
                default:
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(getErrorColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent("**❌ Unknown Subcommand**\n\nThe specified subcommand is not recognized!")
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                        );

                    await interaction.reply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                    });
            }
        } catch (error) {
            console.error('AI command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**\n\nAn error occurred while executing the AI command!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            const reply = { 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleImageGenerate(interaction) {
    const prompt = interaction.options.getString('prompt');

    // Create loading container
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**🎨 AI Image Generation**\n\nPlease wait while I create your image...")
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Prompt:** ${prompt}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [loadingContainer], 
        flags: MessageFlags.IsComponentsV2 
    });

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        const response = await fetch(`https://imagine-bucu.vercel.app/image?prompt=${encodedPrompt}`, {
            method: 'GET',
            headers: {
                'x-api-key': IMAGE_API_KEY
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const imageUrl = data.image || data.imageUrl || data.image_url || data.url;

        if (!imageUrl) {
            throw new Error('No image URL received from API');
        }

        // Create success container with image
        const { ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
        
        const successContainer = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**🎨 AI Image Generation Complete**")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Prompt:**\n\`\`\`${data.prompt || prompt}\`\`\``)
            );

        // Add image using MediaGallery
        try {
            successContainer.addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder().setURL(imageUrl)
                    )
            );
        } catch (error) {
            console.warn('Failed to add image to container:', error);
        }

        // Add information section
        const infoText = `**Image ID:** ${data.imageId || 'N/A'}\n**Status:** ${data.status || 'completed'}\n**Duration:** ${data.duration || 'N/A'}`;
        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Information**\n${infoText}`)
        );

        successContainer.addSeparatorComponents(separator => separator);

        // Add footer
        successContainer.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
        )
        .addActionRowComponents(
            actionRow => actionRow.setComponents(
                new ButtonBuilder()
                    .setLabel('Invite Bot')
                    .setURL(`https://discord.com/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&permissions=8&integration_type=0&scope=bot`)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Join Server')
                    .setURL(config.Support)
                    .setStyle(ButtonStyle.Link)
            )
        );

        await interaction.editReply({ 
            components: [successContainer], 
            flags: MessageFlags.IsComponentsV2 
        });

    } catch (error) {
        console.error('Error generating image:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**❌ Image Generation Failed**\n\nSorry, I couldn't generate the image. Please try again later.")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Error:** ${error.message}`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}

async function handleChatbot(interaction) {
    const prompt = interaction.options.getString('prompt');

    // Create loading container
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(getEmbedColor())
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**🤖 AI Chatbot**\n\nPlease wait while I process your request...")
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**Your Prompt:** ${prompt}`)
        )
        .addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

    await interaction.reply({ 
        components: [loadingContainer], 
        flags: MessageFlags.IsComponentsV2 
    });

    try {
        // Make API call to Pollinations AI
        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const aiResponse = await response.text();

        // Create response container
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**🤖 AI Chatbot**")
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**Your Prompt:** ${prompt}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**AI Response:**\n${aiResponse}`)
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            )
            .addActionRowComponents(
                actionRow => actionRow.setComponents(
                    new ButtonBuilder()
                        .setLabel('Invite Bot')
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&permissions=8&integration_type=0&scope=bot`)
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setLabel('Join Server')
                        .setURL(config.Support)
                        .setStyle(ButtonStyle.Link)
                )
            );

        await interaction.editReply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: [] }
        });

    } catch (error) {
        console.error('Chatbot API error:', error);
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("**❌ Error**")
            )
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent("Failed to get response from AI API. Please try again later.")
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        await interaction.editReply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
}
