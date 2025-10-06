
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, MessageFlags } = require('discord.js');
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

function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription('Color utilities and information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed information about a color')
                .addStringOption(option =>
                    option
                        .setName('color')
                        .setDescription('Color in hex format (e.g., #FF0000 or FF0000)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('Generate a random color')
        ),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        // Check if bot has required permissions
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ I need "Use Application Commands" permission to execute this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'info':
                    await handleColorInfo(interaction);
                    break;
                case 'random':
                    await handleRandomColor(interaction);
                    break;
            }
        } catch (error) {
            console.error('Color command error:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client));

            errorContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Color Command Failed**\n\nSorry, I couldn't process the color command. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

            await interaction.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }
    },
};

async function handleColorInfo(interaction) {
    let colorInput = interaction.options.getString('color').trim();
    
    // Add # if not present
    if (!colorInput.startsWith('#')) {
        colorInput = '#' + colorInput;
    }

    // Validate hex color
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(colorInput)) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client));

        errorContainer.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`❌ **Invalid Color Format**\n\nPlease provide a valid hex color code.\n\n**Examples:**\n• #FF0000\n• FF0000\n• #F00\n• F00`)
        );

        return await interaction.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }

    // Convert 3-digit hex to 6-digit
    if (colorInput.length === 4) {
        colorInput = '#' + colorInput[1] + colorInput[1] + colorInput[2] + colorInput[2] + colorInput[3] + colorInput[3];
    }

    const colorInt = parseInt(colorInput.replace('#', ''), 16);
    const rgb = hexToRgb(colorInput);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    const container = new ContainerBuilder()
        .setAccentColor(colorInt);

    // Add header section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`🎨 **Color Information**\nAnalyzing color: **${colorInput.toUpperCase()}**`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add color values section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`**🔢 Color Values**\n> ✦ **Hex:** ${colorInput.toUpperCase()}\n> ✦ **RGB:** rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\n> ✦ **HSL:** hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)\n> ✦ **CMYK:** cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)\n> ✦ **Decimal:** ${colorInt}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add footer
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

async function handleRandomColor(interaction) {
    const randomColor = getRandomColor();
    const colorInt = parseInt(randomColor.replace('#', ''), 16);
    const rgb = hexToRgb(randomColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const container = new ContainerBuilder()
        .setAccentColor(colorInt);

    // Add header section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`🎲 **Random Color Generated**\nYour random color is: **${randomColor.toUpperCase()}**`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add color information section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`**🔢 Color Information**\n> ✦ **Hex:** ${randomColor.toUpperCase()}\n> ✦ **RGB:** rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\n> ✦ **HSL:** hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)\n> ✦ **Decimal:** ${colorInt}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add footer
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`*Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
    );

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Helper function to convert RGB to HSL
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

// Helper function to convert RGB to CMYK
function rgbToCmyk(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const k = 1 - Math.max(r, Math.max(g, b));
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;

    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

// Helper function to get complementary color
function getComplementaryColor(hex) {
    const rgb = hexToRgb(hex);
    const compR = 255 - rgb.r;
    const compG = 255 - rgb.g;
    const compB = 255 - rgb.b;
    
    return '#' + [compR, compG, compB].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Helper function to get analogous colors
function getAnalogousColors(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    const analogous1 = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
    const analogous2 = hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
    
    return [analogous1, analogous2];
}

// Helper function to get triadic colors
function getTriadicColors(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    const triadic1 = hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l);
    const triadic2 = hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l);
    
    return [triadic1, triadic2];
}

// Helper function to convert HSL to Hex
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}


