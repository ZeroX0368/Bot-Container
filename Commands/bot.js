
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
} = require("discord.js");
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bot")
        .setDescription("Bot management and information commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("invite")
                .setDescription("Get the bot's invite link")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("support")
                .setDescription("Get the support server link")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("ping")
                .setDescription("Check the bot's latency")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("uptime")
                .setDescription("Check how long the bot has been running")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("feedback")
                .setDescription("Send feedback to the developers")
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("Your feedback message")
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        ),

    async execute(interaction) {
        // Check if user has SendMessages permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Permission Denied")
                .setDescription("You need **Send Messages** permission to use this command!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if bot has SendMessages permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Bot Permission Denied")
                .setDescription("I need **Send Messages** permission to execute this command!")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case "invite":
                    await handleInvite(interaction);
                    break;
                case "support":
                    await handleSupport(interaction);
                    break;
                case "ping":
                    await handlePing(interaction);
                    break;
                case "uptime":
                    await handleUptime(interaction);
                    break;
                case "feedback":
                    await handleFeedback(interaction);
                    break;
            }
        } catch (error) {
            console.error('Bot command error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Error")
                .setDescription("An error occurred while executing the command!")
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};

async function handleInvite(interaction) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const inviteButton = new ButtonBuilder()
        .setLabel("Invite Bot")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl)
        .setEmoji("🔗");

    const row = new ActionRowBuilder().addComponents(inviteButton);

    const inviteEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("🤖 Invite Me!")
        .setDescription(`Click the button below to invite ${interaction.client.user.username} to your server!`)
        .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.reply({ embeds: [inviteEmbed], components: [row] });
}

async function handleSupport(interaction) {
    const supportUrl = config.Support || "https://discord.gg/support";

    const supportButton = new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL(supportUrl)
        .setEmoji("🛠️");

    const row = new ActionRowBuilder().addComponents(supportButton);

    const supportEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("🛠️ Need Help?")
        .setDescription("Join our support server for assistance, updates, and community!")
        .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.reply({ embeds: [supportEmbed], components: [row] });
}

async function handlePing(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const pingEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("🏓 Pong!")
        .addFields(
            {
                name: "📡 Roundtrip Latency",
                value: `${roundtripLatency}ms`,
                inline: true
            },
            {
                name: "💓 API Latency",
                value: `${apiLatency}ms`,
                inline: true
            }
        )
        .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [pingEmbed] });
}

async function handleUptime(interaction) {
    const uptime = process.uptime();
    const uptimeString = formatUptime(uptime);

    const uptimeEmbed = new EmbedBuilder()
        .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
        .setTitle("⏰ Bot Uptime")
        .setDescription(`${interaction.client.user.username} has been running for:`)
        .addFields(
            {
                name: "🕐 Uptime",
                value: uptimeString,
                inline: true
            }
        )
        .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    await interaction.reply({ embeds: [uptimeEmbed] });
}

async function handleFeedback(interaction) {
    const message = interaction.options.getString("message");
    const feedbackChannelId = config.FeedBackChannelID;

    if (!feedbackChannelId) {
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Feedback channel is not configured!")
            .setTimestamp();
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    try {
        const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelId);
        
        if (!feedbackChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
                .setTitle("❌ Error")
                .setDescription("Feedback channel not found!")
                .setTimestamp();
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const feedbackEmbed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle("📝 New Feedback")
            .setDescription(message)
            .addFields(
                { name: "👤 User", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: "🏠 Server", value: `${interaction.guild.name} (${interaction.guild.id})`, inline: true },
                { name: "📍 Channel", value: `${interaction.channel.name} (${interaction.channel.id})`, inline: false }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: "Feedback System", iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await feedbackChannel.send({ embeds: [feedbackEmbed] });

        const successEmbed = new EmbedBuilder()
            .setColor(parseInt(config.EmbedColor.replace('#', ''), 16))
            .setTitle("✅ Feedback Sent!")
            .setDescription("Thank you for your feedback! Your message has been sent to our development team.")
            .addFields({
                name: "📝 Your Message",
                value: message.length > 100 ? message.substring(0, 97) + "..." : message,
                inline: false
            })
            .setFooter({
                text: `Sent by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    } catch (error) {
        console.error('Feedback error:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(parseInt(config.ErrorColor.replace('#', ''), 16))
            .setTitle("❌ Error")
            .setDescription("Failed to send feedback. Please try again later.")
            .setTimestamp();
        
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

function getLatencyStatus(roundtrip, api) {
    const maxLatency = Math.max(roundtrip, api);
    if (maxLatency < 100) return "🟢 Excellent";
    if (maxLatency < 200) return "🟡 Good";
    if (maxLatency < 500) return "🟠 Fair";
    return "🔴 Poor";
}

function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}
