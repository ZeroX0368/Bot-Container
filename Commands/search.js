const { SlashCommandBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to get colors from config
function getEmbedColor(client) {
    const color = config.EmbedColor || '#0099ff';
    return parseInt(color.replace('#', ''), 16);
}

function getErrorColor(client) {
    const color = config.ErrorColor || '#ff0000';
    return parseInt(color.replace('#', ''), 16);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search-related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('scriptblox')
                .setDescription('Search for scripts on ScriptBlox')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('Search query for scripts')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('urban')
                .setDescription('Search for definitions on Urban Dictionary')
                .addStringOption(option =>
                    option
                        .setName('query')
                        .setDescription('The term to search for')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand
                .setName('npm')
                .setDescription('Search for npm packages')
                .addStringOption(option =>
                    option
                        .setName('package')
                        .setDescription('The npm package name to search for')
                        .setRequired(true))),

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
                case 'scriptblox':
                    await handleScriptBloxSearch(interaction);
                    break;
                case 'urban':
                    await handleUrbanDictionarySearch(interaction);
                    break;
                
                case 'npm':
                    await handleNpmSearch(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in search command:', error);
            const reply = {
                content: '❌ An error occurred while executing the command.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    },
};

async function handleScriptBloxSearch(interaction) {
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    try {
        const response = await fetch(`https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.result || !data.result.scripts || data.result.scripts.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`🔍 **ScriptBlox Search**\nNo scripts found for query: **${query}**`)
                );

            return await interaction.editReply({ components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Create containers for pagination
        const containers = [];
        const scripts = data.result.scripts;
        const itemsPerPage = 5;

        for (let i = 0; i < scripts.length; i += itemsPerPage) {
            const pageScripts = scripts.slice(i, i + itemsPerPage);
            const container = createScriptContainer(pageScripts, query, i, scripts.length, interaction.client);
            containers.push(container);
        }

        // Use pagination if multiple pages, otherwise show single page
        if (containers.length > 1) {
            await paginationWithIntegratedButtons(interaction, containers, false);
        } else {
            await interaction.editReply({ components: [containers[0]], flags: MessageFlags.IsComponentsV2 });
        }

    } catch (error) {
        console.error('Error searching ScriptBlox:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **ScriptBlox Search Failed**\nSorry, I couldn't search ScriptBlox. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}

function createScriptContainer(scripts, query, startIndex, totalScripts, client) {
    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor(client));

    // Add header section
    container.addTextDisplayComponents(
        textDisplay => textDisplay
            .setContent(`🔍 **ScriptBlox Search Results**\nSearch query: **${query}**\nTotal results: ${totalScripts}`)
    );

    container.addSeparatorComponents(separator => separator);

    // Add each script as a section
    scripts.forEach((script, index) => {
        const globalIndex = startIndex + index + 1;
        const title = script.title || 'Untitled Script';
        const game = script.game?.name || 'Unknown Game';
        const verified = script.isVerified ? '✅' : '❌';
        const views = script.views || 0;
        const url = `https://scriptblox.com/script/${script.slug}`;

        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**${globalIndex}. ${title}**\n**Game:** ${game}\n**Verified:** ${verified}\n**Views:** ${views.toLocaleString()}`)
                )
                .setButtonAccessory(
                    button => button
                        .setLabel('View Script')
                        .setStyle(ButtonStyle.Link)
                        .setURL(url)
                )
        );
    });

    return container;
}

/**
 * Container pagination
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} components - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function pagination(interaction, components, ephemeral) {
    try {
        if (!interaction || !components || components.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (components.length === 1) {
            return await interaction.editReply({ components: components, flags: MessageFlags.IsComponentsV2, fetchReply: true });
        }

        let index = 0;

        const first = new ButtonBuilder()
            .setCustomId('pagefirst')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const prev = new ButtonBuilder()
            .setCustomId('pageprev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const pageCount = new ButtonBuilder()
            .setCustomId('pagecount')
            .setLabel(`${index + 1}/${components.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId('pagenext')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('pagelast')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

        const msg = await interaction.editReply({ 
            components: [components[index], buttons], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these buttons.`, 
                    ephemeral: true 
                });
            }

            if (i.customId === 'pagefirst') {
                index = 0;
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < components.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = components.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${components.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === components.length - 1);
            last.setDisabled(index === components.length - 1);

            await i.update({ 
                components: [components[index], buttons],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [components[index]], 
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });
        });

        return msg;

    } catch (e) {
        console.error(`[ERROR] ${e}`);
    }
}

/**
 * Container pagination with buttons integrated into the container
 *
 * @param {BaseInteraction} interaction - The interaction that triggers the pagination.
 * @param {Array} containers - The containers to show.
 * @param {boolean} ephemeral - Whether the pagination will be ephemeral or not.
 */
async function paginationWithIntegratedButtons(interaction, containers, ephemeral) {
    try {
        if (!interaction || !containers || containers.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
        }

        if (containers.length === 1) {
            return await interaction.editReply({ components: [containers[0]], flags: MessageFlags.IsComponentsV2, fetchReply: true });
        }

        let index = 0;

        const first = new ButtonBuilder()
            .setCustomId('pagefirst')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const prev = new ButtonBuilder()
            .setCustomId('pageprev')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const pageCount = new ButtonBuilder()
            .setCustomId('pagecount')
            .setLabel(`${index + 1}/${containers.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId('pagenext')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('pagelast')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary);

        const buttons = new ActionRowBuilder().addComponents([first, prev, pageCount, next, last]);

        // Clone the container and add buttons directly to it
        const containerWithButtons = new ContainerBuilder(containers[index].toJSON());
        containerWithButtons.addActionRowComponents(buttons);

        const msg = await interaction.editReply({ 
            components: [containerWithButtons], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these buttons.`, 
                    ephemeral: true 
                });
            }

            if (i.customId === 'pagefirst') {
                index = 0;
            } else if (i.customId === 'pageprev') {
                if (index > 0) index--;
            } else if (i.customId === 'pagenext') {
                if (index < containers.length - 1) index++;
            } else if (i.customId === 'pagelast') {
                index = containers.length - 1;
            }

            pageCount.setLabel(`${index + 1}/${containers.length}`);

            // Update button states
            first.setDisabled(index === 0);
            prev.setDisabled(index === 0);
            next.setDisabled(index === containers.length - 1);
            last.setDisabled(index === containers.length - 1);

            // Clone the container and add updated buttons
            const updatedContainer = new ContainerBuilder(containers[index].toJSON());
            updatedContainer.addActionRowComponents(buttons);

            await i.update({ 
                components: [updatedContainer],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });

            collector.resetTimer();
        });

        collector.on("end", () => {
            return interaction.editReply({ 
                components: [containers[index]], 
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                console.error(`[ERROR] ${err.message}`);
            });
        });

        return msg;

    } catch (e) {
        console.error(`[ERROR] ${e}`);
    }
}

async function handleUrbanDictionarySearch(interaction) {
    const query = interaction.options.getString('query');

    await interaction.deferReply();

    try {
        const response = await fetch(`http://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.list || data.list.length === 0) {
            const noResultsContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor(interaction.client))
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`📚 **Urban Dictionary Search**\nNo definitions found for: **${query}**`)
                );

            return await interaction.editReply({ components: [noResultsContainer], flags: MessageFlags.IsComponentsV2 });
        }

        // Create containers for each definition (limit to 10)
        const containers = [];
        const definitions = data.list.slice(0, 10);

        definitions.forEach((definition, index) => {
            // Truncate long text
            const truncateText = (text, maxLength = 1000) => {
                if (!text) return 'N/A';
                return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            };

            const container = new ContainerBuilder()
                .setAccentColor(getEmbedColor(interaction.client));

            // Add header
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`📚 **${query}** - Definition ${index + 1}/${definitions.length}`)
            );

            container.addSeparatorComponents(separator => separator);

            // Add definition
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**📝 Definition:**\n${truncateText(definition.definition.replace(/\[|\]/g, ''))}`)
            );

            // Add example if available
            if (definition.example) {
                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**💡 Example:**\n${truncateText(definition.example.replace(/\[|\]/g, ''))}`)
                );
            }

            container.addSeparatorComponents(separator => separator);

            // Add metadata
            const thumbsUp = definition.thumbs_up || 0;
            const thumbsDown = definition.thumbs_down || 0;
            const author = definition.author || 'Unknown';
            const date = definition.written_on ? new Date(definition.written_on).toLocaleDateString() : 'Unknown';

            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**👤 Author:** ${author}\n**📅 Date:** ${date}\n**👍 Likes:** ${thumbsUp} | **👎 Dislikes:** ${thumbsDown}`)
            );

            containers.push(container);
        });

        // Use pagination if multiple definitions, otherwise show single definition
        if (containers.length > 1) {
            await paginationWithIntegratedButtons(interaction, containers, false);
        } else {
            await interaction.editReply({ components: [containers[0]], flags: MessageFlags.IsComponentsV2 });
        }

    } catch (error) {
        console.error('Error searching Urban Dictionary:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **Urban Dictionary Search Failed**\nSorry, I couldn't search Urban Dictionary. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}





async function handleNpmSearch(interaction) {
    const packageName = interaction.options.getString('package');

    await interaction.deferReply();

    try {
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);

        if (!response.ok) {
            if (response.status === 404) {
                const notFoundContainer = new ContainerBuilder()
                    .setAccentColor(getErrorColor(interaction.client))
                    .addTextDisplayComponents(
                        textDisplay => textDisplay
                            .setContent(`📦 **NPM Package Search**\nPackage not found: **${packageName}**`)
                    );

                return await interaction.editReply({ components: [notFoundContainer], flags: MessageFlags.IsComponentsV2 });
            }
            throw new Error(`NPM API Error: ${response.status}`);
        }

        const data = await response.json();

        // Create container with package information
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Package name and description
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`📦 **@${data.name}**\n${data.description || 'No description available'}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Author information
        let authorInfo = 'Unknown';
        if (data.author) {
            if (typeof data.author === 'string') {
                authorInfo = data.author;
            } else if (data.author.name) {
                authorInfo = data.author.name;
                if (data.author.email) {
                    authorInfo += `\n${data.author.email}`;
                }
            }
        }

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Author**\n${authorInfo}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Email (if available separately)
        if (data.author && data.author.email) {
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Email**\n${data.author.email}`)
            );

            container.addSeparatorComponents(separator => separator);
        }

        // Downloads this year (we'll use a placeholder since we can't get exact download stats without another API)
        const currentYear = new Date().getFullYear();
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Downloads This Year**\nData not available from registry`)
        );

        container.addSeparatorComponents(separator => separator);

        // Last publish date
        const versions = Object.keys(data.versions || {});
        const latestVersion = data['dist-tags']?.latest || versions[versions.length - 1];
        const lastPublish = data.time ? data.time[latestVersion] || data.time.modified : null;
        
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Last Publish**\n${lastPublish ? new Date(lastPublish).toDateString() : 'Unknown'}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Version
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Version**\n${latestVersion || 'Unknown'}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Repository
        let repoUrl = 'Not available';
        let displayUrl = 'Not available';
        if (data.repository) {
            if (typeof data.repository === 'string') {
                repoUrl = data.repository;
            } else if (data.repository.url) {
                repoUrl = data.repository.url;
            }
            
            // Clean up the URL for display and button linking
            if (repoUrl !== 'Not available') {
                displayUrl = repoUrl;
                
                // Convert git:// and git+https:// URLs to https://
                if (repoUrl.startsWith('git://')) {
                    repoUrl = repoUrl.replace('git://', 'https://');
                } else if (repoUrl.startsWith('git+')) {
                    repoUrl = repoUrl.replace('git+', '');
                }
                
                // Remove .git suffix
                repoUrl = repoUrl.replace(/\.git$/, '');
                displayUrl = displayUrl.replace(/^git\+/, '').replace(/\.git$/, '');
                
                // Ensure we have a valid HTTPS URL for the button
                if (!repoUrl.startsWith('https://') && !repoUrl.startsWith('http://')) {
                    // If it's a GitHub shorthand, convert it
                    if (repoUrl.includes('github.com')) {
                        repoUrl = 'https://' + repoUrl.replace(/^.*github\.com[\/:]/, 'github.com/');
                    } else {
                        // Fallback to NPM package page
                        repoUrl = `https://www.npmjs.com/package/${packageName}`;
                    }
                }
            }
        }

        container.addSectionComponents(
            section => section
                .addTextDisplayComponents(
                    textDisplay => textDisplay
                        .setContent(`**Repository**\n${displayUrl === 'Not available' ? displayUrl : `[${displayUrl}](${repoUrl})`}`)
                )
                .setButtonAccessory(
                    button => button
                        .setLabel('Repository')
                        .setStyle(ButtonStyle.Link)
                        .setURL(repoUrl !== 'Not available' ? repoUrl : `https://www.npmjs.com/package/${packageName}`)
                )
        );

        container.addSeparatorComponents(separator => separator);

        // Maintainers
        let maintainers = 'Unknown';
        if (data.maintainers && data.maintainers.length > 0) {
            maintainers = data.maintainers.map(m => m.name || m).slice(0, 3).join(', ');
            if (data.maintainers.length > 3) {
                maintainers += ` and ${data.maintainers.length - 3} more`;
            }
        }

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Maintainers**\n${maintainers}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Keywords
        let keywords = 'None';
        if (data.keywords && data.keywords.length > 0) {
            keywords = data.keywords.slice(0, 10).join(', ');
            if (data.keywords.length > 10) {
                keywords += '...';
            }
        }

        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`**Keywords**\n${keywords}`)
        );

        container.addSeparatorComponents(separator => separator);

        // Footer with timestamp
        const currentTime = Math.floor(Date.now() / 1000);
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`Hôm nay lúc <t:${currentTime}:t>`)
        );

        await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    } catch (error) {
        console.error('Error searching NPM:', error);

        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor(interaction.client))
            .addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`❌ **NPM Package Search Failed**\nSorry, I couldn't search for the package **${packageName}**. Please try again later.\n\n**Error Details:**\n${error.message || 'Unknown error occurred'}`)
            );

        await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
    }
}