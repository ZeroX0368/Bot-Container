
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('../config.json');

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

const apiKey = process.env.WEATHER_API_KEY || 'ad57104408a74a32951215248251809';

// Weather condition emojis
const weatherEmojis = {
    'clear': '☀️',
    'sunny': '☀️',
    'partly cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'rain': '🌧️',
    'light rain': '🌦️',
    'heavy rain': '🌧️',
    'thunderstorm': '⛈️',
    'snow': '🌨️',
    'fog': '🌫️',
    'mist': '🌫️',
    'wind': '💨',
    'default': '🌤️'
};

function getWeatherEmoji(condition) {
    const lowerCondition = condition.toLowerCase();
    return weatherEmojis[lowerCondition] || weatherEmojis['default'];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get current weather information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('current')
                .setDescription('Get current weather for a location')
                .addStringOption(option =>
                    option
                        .setName('location')
                        .setDescription('City name or coordinates (e.g., "London" or "Ho Chi Minh City")')
                        .setRequired(true))),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'current') {
            await handleCurrentWeather(interaction);
        }
    },
};

async function handleCurrentWeather(interaction) {
    const location = interaction.options.getString('location');
    
    await interaction.deferReply();

    try {
        // You need to get a free API key from weatherapi.com
        const response = await fetch(`http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`);
        
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error('Location not found. Please check the spelling and try again.');
            }
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        const { location: loc, current } = data;

        // Format the weather information
        const weatherEmoji = getWeatherEmoji(current.condition.text);
        
        const { ContainerBuilder, MessageFlags } = require('discord.js');
        
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add header section
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`${weatherEmoji} **Weather in ${loc.name}, ${loc.region ? loc.region + ', ' : ''}${loc.country}**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add location details section with thumbnail
        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**📍 Location Details**\n> ✦ **City:** ${loc.name}\n> ✦ **Country:** ${loc.country}\n> ✦ **Coordinates:** ${loc.lat}, ${loc.lon}\n> ✦ **Timezone:** ${loc.tz_id}\n> ✦ **Local Time:** ${loc.localtime}\n> ✦ **Last Updated:** ${current.last_updated}`)
                )
                .setThumbnailAccessory(
                    thumbnail => thumbnail
                        .setURL(`https:${current.condition.icon}`)
                )
        );

        container.addSeparatorComponents(separator => separator);

        // Add current conditions section
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**🌤️ Current Conditions**\n> ✦ **Condition:** ${current.condition.text}\n> ✦ **Temperature:** ${current.temp_c}°C (Feels like ${current.feelslike_c}°C)\n> ✦ **Wind:** ${current.wind_mph} mph (${current.wind_dir})\n> ✦ **Humidity:** ${current.humidity}%\n> ✦ **UV Index:** ${current.uv}\n> ✦ **Visibility:** ${current.vis_km} km / ${current.vis_miles} mi`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add additional data section
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**📊 Additional Data**\n> ✦ **Pressure:** ${current.pressure_mb} mb (${current.pressure_in}" Hg)\n> ✦ **Precipitation:** ${current.precip_mm} mm / ${current.precip_in} in\n> ✦ **Cloud Cover:** ${current.cloud}%\n> ✦ **Wind Chill:** ${current.windchill_c}°C / ${current.windchill_f}°F\n> ✦ **Heat Index:** ${current.heatindex_c}°C / ${current.heatindex_f}°F\n> ✦ **Dew Point:** ${current.dewpoint_c}°C / ${current.dewpoint_f}°F\n> ✦ **Gust Speed:** ${current.gust_kph} kph / ${current.gust_mph} mph`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add footer information
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`*Requested by ${interaction.user.username} • Powered by WeatherAPI.com • <t:${Math.floor(new Date().getTime() / 1000)}:R>*`)
        );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

    } catch (error) {
        console.error('Error fetching weather data:', error);

        const { ContainerBuilder, MessageFlags } = require('discord.js');
        
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client));

        errorContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`❌ **Weather Fetch Failed**\n\n${error.message.includes('Location not found') 
                    ? `Sorry, I couldn't find weather data for "${location}". Please check the spelling and try again.`
                    : `Sorry, I couldn't fetch weather data for "${location}". Please try again later.`}`)
        );

        errorContainer.addSeparatorComponents(separator => separator);

        errorContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**💡 Tips**\n• Try using just the city name (e.g., "London")\n• Include country for better results (e.g., "Paris, France")\n• Check spelling of the location`)
        );

        await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
