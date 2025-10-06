
const config = require('../config.json');
const BlacklistSchema = require('../Schemas/blacklist');

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
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            if (interaction.commandName === 'translate') {
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
                    console.error('Translate autocomplete error:', error);
                    // Provide fallback options
                    await interaction.respond([
                        { name: 'English (en)', value: 'en' },
                        { name: 'Spanish (es)', value: 'es' },
                        { name: 'French (fr)', value: 'fr' }
                    ]);
                }
            }
            return;
        }
    }
};
