
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('../config.json');

// Helper function to get colors from config
function getEmbedColor() {
    return parseInt(config.EmbedColor?.replace('#', '') || '0099ff', 16);
}

function getErrorColor() {
    return parseInt(config.ErrorColor?.replace('#', '') || 'ff0000', 16);
}

// Type color mapping
const TYPE_COLORS = {
    normal: 0xA8A878,
    fire: 0xF08030,
    water: 0x6890F0,
    electric: 0xF8D030,
    grass: 0x78C850,
    ice: 0x98D8D8,
    fighting: 0xC03028,
    poison: 0xA040A0,
    ground: 0xE0C068,
    flying: 0xA890F0,
    psychic: 0xF85888,
    bug: 0xA8B820,
    rock: 0xB8A038,
    ghost: 0x705898,
    dragon: 0x7038F8,
    dark: 0x705848,
    steel: 0xB8B8D0,
    fairy: 0xEE99AC
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Get information about a Pokémon')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name or ID of the Pokémon')
                .setRequired(true)
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

        const pokemonName = interaction.options.getString('name').toLowerCase();
        
        await interaction.deferReply();

        try {
            // Fetch Pokemon data from PokeAPI
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            
            if (!response.ok) {
                throw new Error('Pokemon not found');
            }

            const pokemon = await response.json();
            
            // Fetch species data for additional info
            const speciesResponse = await fetch(pokemon.species.url);
            const species = await speciesResponse.json();

            // Format Pokemon data
            const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            const id = pokemon.id;
            const height = `${Math.floor(pokemon.height / 10)}m ${pokemon.height % 10}cm (${Math.round(pokemon.height * 3.937)}in)`;
            const weight = `${pokemon.weight / 10}kg (${Math.round(pokemon.weight * 0.220462)}lbs)`;
            const types = pokemon.types.map(type => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)).join(', ');
            
            // Get abilities
            const abilities = pokemon.abilities.map(ability => {
                const abilityName = ability.ability.name.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('-');
                return ability.is_hidden ? `${abilityName} (Hidden)` : abilityName;
            });

            // Get stats
            const stats = pokemon.stats.map(stat => {
                const statName = stat.stat.name.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('-');
                return `${statName} [${stat.base_stat}]`;
            });

            // Get moves (limit to first 10)
            const moves = pokemon.moves.slice(0, 10).map(move => {
                return move.move.name.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('-');
            });

            // Get primary type color
            const primaryType = pokemon.types[0].type.name;
            const typeColor = TYPE_COLORS[primaryType] || getEmbedColor();

            // Create container
            const container = new ContainerBuilder()
                .setAccentColor(typeColor);

            // Add Pokemon image and basic info
            container.addSectionComponents(
                section => section
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`**${name}**\n\n**Height**\n${height}\n\n**Weight**\n${weight}\n\n**Type**\n${types}\n\n**Abilities [${abilities.length}]**\n${abilities.join(', ')}\n\n**Stats**\n${stats.join(', ')}\n\n**Moves [${moves.length > 10 ? '10+' : moves.length}]**\n${moves.join(', ')}${moves.length >= 10 ? ', ...' : ''}`)
                    )
                    .setThumbnailAccessory(
                        thumbnail => thumbnail
                            .setURL(pokemon.sprites.front_default || pokemon.sprites.other['official-artwork'].front_default)
                    )
            );

            container.addSeparatorComponents(separator => separator);

            // Add footer with timestamp
            
            const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*${interaction.user.username} | <t:${timestamp}:t>*`)
    );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error fetching Pokemon data:', error);

            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor());

            errorContainer.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Pokemon Not Found**\n\nSorry, I couldn't find a Pokemon named "${pokemonName}". Please check the spelling and try again.\n\n**Tip:** You can use either the Pokemon name or ID number.`)
            );

            await interaction.editReply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
