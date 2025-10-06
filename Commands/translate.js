
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

const LANGUAGES = {
    'af': 'Afrikaans', 'sq': 'Albanian', 'am': 'Amharic', 'ar': 'Arabic', 'hy': 'Armenian',
    'az': 'Azerbaijani', 'eu': 'Basque', 'be': 'Belarusian', 'bn': 'Bengali', 'bs': 'Bosnian', 'bg': 'Bulgarian',
    'ca': 'Catalan', 'ceb': 'Cebuano', 'zh-cn': 'Chinese (Simplified)', 'zh-tw': 'Chinese (Traditional)', 'co': 'Corsican',
    'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch', 'en': 'English', 'eo': 'Esperanto', 'et': 'Estonian',
    'fi': 'Finnish', 'fr': 'French', 'fy': 'Frisian', 'gl': 'Galician', 'ka': 'Georgian', 'de': 'German', 'el': 'Greek',
    'gu': 'Gujarati', 'ht': 'Haitian Creole', 'ha': 'Hausa', 'haw': 'Hawaiian', 'he': 'Hebrew', 'hi': 'Hindi', 'hmn': 'Hmong',
    'hu': 'Hungarian', 'is': 'Icelandic', 'ig': 'Igbo', 'id': 'Indonesian', 'ga': 'Irish', 'it': 'Italian', 'ja': 'Japanese',
    'jw': 'Javanese', 'kn': 'Kannada', 'kk': 'Kazakh', 'km': 'Khmer', 'ko': 'Korean', 'ku': 'Kurdish (Kurmanji)', 'ky': 'Kyrgyz',
    'lo': 'Lao', 'la': 'Latin', 'lv': 'Latvian', 'lt': 'Lithuanian', 'lb': 'Luxembourgish', 'mk': 'Macedonian', 'mg': 'Malagasy',
    'ms': 'Malay', 'ml': 'Malayalam', 'mt': 'Maltese', 'mi': 'Maori', 'mr': 'Marathi', 'mn': 'Mongolian', 'my': 'Myanmar (Burmese)',
    'ne': 'Nepali', 'no': 'Norwegian', 'ny': 'Nyanja', 'ps': 'Pashto', 'fa': 'Persian', 'pl': 'Polish', 'pt': 'Portuguese',
    'pa': 'Punjabi', 'ro': 'Romanian', 'ru': 'Russian', 'sm': 'Samoan', 'gd': 'Scots Gaelic', 'sr': 'Serbian', 'st': 'Sesotho',
    'sn': 'Shona', 'sd': 'Sindhi', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian', 'so': 'Somali', 'es': 'Spanish', 'su': 'Sundanese',
    'sw': 'Swahili', 'sv': 'Swedish', 'tg': 'Tajik', 'ta': 'Tamil', 'te': 'Telugu', 'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian',
    'ur': 'Urdu', 'uz': 'Uzbek', 'vi': 'Vietnamese', 'cy': 'Welsh', 'xh': 'Xhosa', 'yi': 'Yiddish', 'yo': 'Yoruba', 'zu': 'Zulu'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text to another language')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.UseApplicationCommands)
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The text to translate')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('language')
                .setDescription('Target language to translate to')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // Filter languages based on user input
            let filtered = Object.entries(LANGUAGES)
                .filter(([code, name]) => 
                    name.toLowerCase().includes(focusedValue) || 
                    code.toLowerCase().includes(focusedValue)
                )
                .slice(0, 25) // Discord limits to 25 choices
                .map(([code, name]) => ({
                    name: `${name} (${code})`,
                    value: code
                }));

            // If no matches and user hasn't typed anything, show popular languages
            if (filtered.length === 0 && focusedValue === '') {
                filtered = [
                    { name: 'English (en)', value: 'en' },
                    { name: 'Spanish (es)', value: 'es' },
                    { name: 'French (fr)', value: 'fr' },
                    { name: 'German (de)', value: 'de' },
                    { name: 'Italian (it)', value: 'it' },
                    { name: 'Portuguese (pt)', value: 'pt' },
                    { name: 'Russian (ru)', value: 'ru' },
                    { name: 'Japanese (ja)', value: 'ja' },
                    { name: 'Korean (ko)', value: 'ko' },
                    { name: 'Chinese (Simplified) (zh-cn)', value: 'zh-cn' }
                ];
            }

            // If still no matches, show first 25 languages
            if (filtered.length === 0) {
                filtered = Object.entries(LANGUAGES)
                    .slice(0, 25)
                    .map(([code, name]) => ({
                        name: `${name} (${code})`,
                        value: code
                    }));
            }

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Autocomplete error:', error);
            // Provide fallback options
            await interaction.respond([
                { name: 'English (en)', value: 'en' },
                { name: 'Spanish (es)', value: 'es' },
                { name: 'French (fr)', value: 'fr' }
            ]);
        }
    },

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

        const text = interaction.options.getString('text');
        const targetLang = interaction.options.getString('language');

        // Validate language code
        if (!LANGUAGES[targetLang]) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Invalid Language**\n\nPlease select a valid language from the autocomplete list!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            return await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply();

        try {
            // Make API call to Google Translate
            const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Discord Bot'
                }
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Parse the response - Google Translate API returns nested arrays
            if (!data || !data[0] || !data[0][0] || !data[0][0][0]) {
                throw new Error('Invalid response from translation API');
            }

            const translatedText = data[0].map(item => item[0]).join('');
            const detectedLang = data[2] || 'auto';
            
            // Find detected language name
            const detectedLangName = LANGUAGES[detectedLang] || detectedLang;
            const targetLangName = LANGUAGES[targetLang];

            // Create response container
            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**🌐 Translation**")
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Original Text (${detectedLangName}):**`)
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Translated Text (${targetLangName}):**\n${translatedText}`)
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*Requested by ${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            await interaction.editReply({ 
                components: [container], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error('Translation error:', error);
            
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Translation Failed**")
                )
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("Sorry, I couldn't translate that text. Please try again later.")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Error Details:**\n${error.message || 'Unknown error occurred'}`)
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            await interaction.editReply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 
            });
        }
    },
};
