
const {
    SlashCommandBuilder,
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display help information for commands')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.UseApplicationCommands),

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

        try {
            await handleAllCommands(interaction);
        } catch (error) {
            console.error('Help command error:', error);
            const errorContainer = new ContainerBuilder()
                .setAccentColor(getErrorColor())
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent("**❌ Error**\n\nAn error occurred while fetching help information!")
                )
                .addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            await interaction.reply({ 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }
    },

    
};

async function handleSpecificCommand(interaction, commandName) {
    const command = interaction.client.commands.get(commandName);
    
    if (!command) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(getErrorColor())
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**❌ Command Not Found**\n\nThe command \`${commandName}\` was not found!`)
            )
            .addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
            );

        return await interaction.reply({ 
            components: [errorContainer], 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
        });
    }

    const container = new ContainerBuilder()
        .setAccentColor(getEmbedColor());

    // Command title
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**📋 Command Help: /${commandName}**`)
    );

    container.addSeparatorComponents(separator => separator);

    // Command description
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`**Description:** ${command.data.description}`)
    );

    // Check if command has subcommands or subcommand groups
    const subcommands = command.data.options?.filter(option => option.type === 1) || [];
    const subcommandGroups = command.data.options?.filter(option => option.type === 2) || [];

    if (subcommandGroups.length > 0) {
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**Subcommand Groups:**")
        );

        subcommandGroups.forEach(group => {
            let groupText = `**/${commandName} ${group.name}** - ${group.description}`;
            
            if (group.options) {
                group.options.forEach(subcommand => {
                    groupText += `\n└ **/${commandName} ${group.name} ${subcommand.name}** - ${subcommand.description}`;
                });
            }
            
            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(groupText)
            );
        });
    }

    if (subcommands.length > 0) {
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**Subcommands:**")
        );

        let subcommandText = '';
        subcommands.forEach(subcommand => {
            subcommandText += `└ **/${commandName} ${subcommand.name}** - ${subcommand.description}\n`;
        });
        
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(subcommandText.trim())
        );
    }

    // Check for regular options
    const regularOptions = command.data.options?.filter(option => option.type !== 1 && option.type !== 2) || [];
    if (regularOptions.length > 0) {
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent("**Options:**")
        );

        let optionsText = '';
        regularOptions.forEach(option => {
            const required = option.required ? '(Required)' : '(Optional)';
            optionsText += `• **${option.name}** ${required} - ${option.description}\n`;
        });
        
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(optionsText.trim())
        );
    }

    container.addSeparatorComponents(separator => separator);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
    );

    await interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    });
}

async function handleAllCommands(interaction) {
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

    const commands = interaction.client.commands;
    const containers = [];
    const commandsPerPage = 5;
    const commandArray = Array.from(commands.values());
    const totalPages = Math.ceil(commandArray.length / commandsPerPage);

    // Create containers for each page
    for (let page = 0; page < totalPages; page++) {
        const start = page * commandsPerPage;
        const end = start + commandsPerPage;
        const currentCommands = commandArray.slice(start, end);

        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor());

        // Add title
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`**📚 Command Help (Page ${page + 1}/${totalPages})**`)
        );

        container.addSeparatorComponents(separator => separator);

        // Add each command
        currentCommands.forEach((command, index) => {
            let commandText = `**/${command.data.name}** - ${command.data.description}`;
            
            // Check for subcommand groups
            const subcommandGroups = command.data.options?.filter(option => option.type === 2) || [];
            if (subcommandGroups.length > 0) {
                subcommandGroups.forEach(group => {
                    commandText += `\n└ **/${command.data.name} ${group.name}** - ${group.description}`;
                    if (group.options) {
                        group.options.forEach(subcommand => {
                            commandText += `\n  └ **/${command.data.name} ${group.name} ${subcommand.name}** - ${subcommand.description}`;
                        });
                    }
                });
            }

            // Check for direct subcommands
            const subcommands = command.data.options?.filter(option => option.type === 1) || [];
            if (subcommands.length > 0) {
                subcommands.forEach(subcommand => {
                    commandText += `\n└ **/${command.data.name} ${subcommand.name}** - ${subcommand.description}`;
                });
            }

            container.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(commandText)
            );

            if (index < currentCommands.length - 1) {
                container.addSeparatorComponents(separator => separator);
            }
        });

        // Add footer
        container.addSeparatorComponents(separator => separator);
        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*Total Commands: ${commandArray.length} • Use \`/help\` for detailed help*`)
        );

        container.addTextDisplayComponents(
            textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );

        containers.push({ container, commands: currentCommands });
    }

    // Use pagination if more than one page
    if (containers.length === 1) {
        const selectMenu = createCommandSelectMenu(containers[0].commands, 0);
        
        // Create buttons for support and invite
        const supportButton = new ButtonBuilder()
            .setCustomId('help_support')
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛠️');

        const inviteButton = new ButtonBuilder()
            .setCustomId('help_invite')
            .setLabel('Invite Bot')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔗');

        // Add select menu and buttons to container
        containers[0].container.addActionRowComponents(
            actionRow => actionRow.setComponents(selectMenu)
        );
        containers[0].container.addActionRowComponents(
            actionRow => actionRow.setComponents([supportButton, inviteButton])
        );
        
        await interaction.editReply({
            components: [containers[0].container],
            flags: MessageFlags.IsComponentsV2
        });
    } else {
        await paginationWithSelect(interaction, containers);
    }
}

/**
 * Create a select menu for commands on current page
 */
function createCommandSelectMenu(commands, pageIndex) {
    const options = commands.map(command => ({
        label: `/${command.data.name}`,
        description: command.data.description.slice(0, 100),
        value: `command_${command.data.name}_${pageIndex}`
    }));

    return new StringSelectMenuBuilder()
        .setCustomId(`help_select_${pageIndex}`)
        .setPlaceholder('📋 Select a command...')
        .addOptions(options);
}

/**
 * Container pagination with select menu
 */
async function paginationWithSelect(interaction, containerData) {
    try {
        if (!interaction || !containerData || containerData.length === 0) {
            throw new Error('[PAGINATION] Invalid args');
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
            .setLabel(`${index + 1}/${containerData.length}`)
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

        const selectMenu = createCommandSelectMenu(containerData[index].commands, index);
        
        // Create buttons for support and invite
        const supportButton = new ButtonBuilder()
            .setCustomId('help_support')
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛠️');

        const inviteButton = new ButtonBuilder()
            .setCustomId('help_invite')
            .setLabel('Invite Bot')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔗');
        
        // Add components to container
        containerData[index].container.addActionRowComponents(
            actionRow => actionRow.setComponents([first, prev, pageCount, next, last])
        );
        containerData[index].container.addActionRowComponents(
            actionRow => actionRow.setComponents(selectMenu)
        );
        containerData[index].container.addActionRowComponents(
            actionRow => actionRow.setComponents([supportButton, inviteButton])
        );

        const msg = await interaction.editReply({ 
            components: [containerData[index].container], 
            flags: MessageFlags.IsComponentsV2,
            fetchReply: true 
        });

        const collector = msg.createMessageComponentCollector({ 
            time: 300000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({ 
                    content: `Only **${interaction.user.username}** can use these controls.`, 
                    ephemeral: true 
                });
            }

            if (i.isButton()) {
                // Handle support and invite buttons
                if (i.customId === 'help_support') {
                    const config = require('../config.json');
                    const supportUrl = config.Support || "https://discord.gg/support";
                    
                    const supportContainer = new ContainerBuilder()
                        .setAccentColor(getEmbedColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`🛠️ **Support Server**\n\n[Click here to join our support server](${supportUrl})`)
                        );

                    return await i.reply({
                        components: [supportContainer],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }

                if (i.customId === 'help_invite') {
                    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${i.client.user.id}&permissions=8&scope=bot%20applications.commands`;
                    
                    const inviteContainer = new ContainerBuilder()
                        .setAccentColor(getEmbedColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`🔗 **Invite Bot**\n\n[Click here to invite ${i.client.user.username} to your server](${inviteUrl})`)
                        );

                    return await i.reply({
                        components: [inviteContainer],
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                    });
                }
                if (i.customId === 'pagefirst') {
                    index = 0;
                } else if (i.customId === 'pageprev') {
                    if (index > 0) index--;
                } else if (i.customId === 'pagenext') {
                    if (index < containerData.length - 1) index++;
                } else if (i.customId === 'pagelast') {
                    index = containerData.length - 1;
                }

                pageCount.setLabel(`${index + 1}/${containerData.length}`);

                // Update button states
                first.setDisabled(index === 0);
                prev.setDisabled(index === 0);
                next.setDisabled(index === containerData.length - 1);
                last.setDisabled(index === containerData.length - 1);

                const updatedSelectMenu = createCommandSelectMenu(containerData[index].commands, index);
                
                // Create new container by cloning the original and adding components
                const updatedContainer = new ContainerBuilder()
                    .setAccentColor(getEmbedColor());

                // Add the same content as the original container for current page
                const currentCommands = containerData[index].commands;
                const totalPages = containerData.length;
                
                // Add title
                updatedContainer.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📚 Command Help (Page ${index + 1}/${totalPages})**`)
                );

                updatedContainer.addSeparatorComponents(separator => separator);

                // Add each command
                currentCommands.forEach((command, cmdIndex) => {
                    let commandText = `**/${command.data.name}** - ${command.data.description}`;
                    
                    // Check for subcommand groups
                    const subcommandGroups = command.data.options?.filter(option => option.type === 2) || [];
                    if (subcommandGroups.length > 0) {
                        subcommandGroups.forEach(group => {
                            commandText += `\n└ **/${command.data.name} ${group.name}** - ${group.description}`;
                            if (group.options) {
                                group.options.forEach(subcommand => {
                                    commandText += `\n  └ **/${command.data.name} ${group.name} ${subcommand.name}** - ${subcommand.description}`;
                                });
                            }
                        });
                    }

                    // Check for direct subcommands
                    const subcommands = command.data.options?.filter(option => option.type === 1) || [];
                    if (subcommands.length > 0) {
                        subcommands.forEach(subcommand => {
                            commandText += `\n└ **/${command.data.name} ${subcommand.name}** - ${subcommand.description}`;
                        });
                    }

                    updatedContainer.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(commandText)
                    );

                    if (cmdIndex < currentCommands.length - 1) {
                        updatedContainer.addSeparatorComponents(separator => separator);
                    }
                });

                // Add footer
                updatedContainer.addSeparatorComponents(separator => separator);
                updatedContainer.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*Total Commands: ${containerData.map(c => c.commands).flat().length} • Use \`/help\` for detailed help*`)
                );

                updatedContainer.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );
                
                // Create buttons for support and invite
                const supportButton = new ButtonBuilder()
                    .setCustomId('help_support')
                    .setLabel('Support Server')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛠️');

                const inviteButton = new ButtonBuilder()
                    .setCustomId('help_invite')
                    .setLabel('Invite Bot')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔗');

                // Add updated components
                updatedContainer.addActionRowComponents(
                    actionRow => actionRow.setComponents([first, prev, pageCount, next, last])
                );
                updatedContainer.addActionRowComponents(
                    actionRow => actionRow.setComponents(updatedSelectMenu)
                );
                updatedContainer.addActionRowComponents(
                    actionRow => actionRow.setComponents([supportButton, inviteButton])
                );

                await i.update({ 
                    components: [updatedContainer],
                    flags: MessageFlags.IsComponentsV2
                }).catch(err => {
                    console.error(`[ERROR] ${err.message}`);
                });

            } else if (i.isStringSelectMenu()) {
                const selectedValue = i.values[0];
                const commandName = selectedValue.split('_')[1];
                
                // Create ephemeral response for select menu
                const command = interaction.client.commands.get(commandName);
                
                if (!command) {
                    const errorContainer = new ContainerBuilder()
                        .setAccentColor(getErrorColor())
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`**❌ Command Not Found**\n\nThe command \`${commandName}\` was not found!`)
                        )
                        .addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(`*<t:${Math.floor(Date.now() / 1000)}:R>*`)
                        );

                    return await i.reply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                    });
                }

                const container = new ContainerBuilder()
                    .setAccentColor(getEmbedColor());

                // Command title
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**📋 Command Help: /${commandName}**`)
                );

                container.addSeparatorComponents(separator => separator);

                // Command description
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`**Description:** ${command.data.description}`)
                );

                // Check if command has subcommands or subcommand groups
                const subcommands = command.data.options?.filter(option => option.type === 1) || [];
                const subcommandGroups = command.data.options?.filter(option => option.type === 2) || [];

                if (subcommandGroups.length > 0) {
                    container.addSeparatorComponents(separator => separator);
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent("**Subcommand Groups:**")
                    );

                    subcommandGroups.forEach(group => {
                        let groupText = `**/${commandName} ${group.name}** - ${group.description}`;
                        
                        if (group.options) {
                            group.options.forEach(subcommand => {
                                groupText += `\n└ **/${commandName} ${group.name} ${subcommand.name}** - ${subcommand.description}`;
                            });
                        }
                        
                        container.addTextDisplayComponents(
                            textDisplay => textDisplay.setContent(groupText)
                        );
                    });
                }

                if (subcommands.length > 0) {
                    container.addSeparatorComponents(separator => separator);
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent("**Subcommands:**")
                    );

                    let subcommandText = '';
                    subcommands.forEach(subcommand => {
                        subcommandText += `└ **/${commandName} ${subcommand.name}** - ${subcommand.description}\n`;
                    });
                    
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(subcommandText.trim())
                    );
                }

                // Check for regular options
                const regularOptions = command.data.options?.filter(option => option.type !== 1 && option.type !== 2) || [];
                if (regularOptions.length > 0) {
                    container.addSeparatorComponents(separator => separator);
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent("**Options:**")
                    );

                    let optionsText = '';
                    regularOptions.forEach(option => {
                        const required = option.required ? '(Required)' : '(Optional)';
                        optionsText += `• **${option.name}** ${required} - ${option.description}\n`;
                    });
                    
                    container.addTextDisplayComponents(
                        textDisplay => textDisplay.setContent(optionsText.trim())
                    );
                }

                container.addSeparatorComponents(separator => separator);
                container.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(`*${i.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

                await i.reply({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
                });
            }

            collector.resetTimer();
        });

        collector.on("end", () => {
            // Create container without interactive components - just the original content
            const finalContainer = new ContainerBuilder()
                .setAccentColor(getEmbedColor());

            const currentCommands = containerData[index].commands;
            const totalPages = containerData.length;
            
            // Add title
            finalContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`**📚 Command Help (Page ${index + 1}/${totalPages})**`)
            );

            finalContainer.addSeparatorComponents(separator => separator);

            // Add each command
            currentCommands.forEach((command, cmdIndex) => {
                let commandText = `**/${command.data.name}** - ${command.data.description}`;
                
                // Check for subcommand groups
                const subcommandGroups = command.data.options?.filter(option => option.type === 2) || [];
                if (subcommandGroups.length > 0) {
                    subcommandGroups.forEach(group => {
                        commandText += `\n└ **/${command.data.name} ${group.name}** - ${group.description}`;
                        if (group.options) {
                            group.options.forEach(subcommand => {
                                commandText += `\n  └ **/${command.data.name} ${group.name} ${subcommand.name}** - ${subcommand.description}`;
                            });
                        }
                    });
                }

                // Check for direct subcommands
                const subcommands = command.data.options?.filter(option => option.type === 1) || [];
                if (subcommands.length > 0) {
                    subcommands.forEach(subcommand => {
                        commandText += `\n└ **/${command.data.name} ${subcommand.name}** - ${subcommand.description}`;
                    });
                }

                finalContainer.addTextDisplayComponents(
                    textDisplay => textDisplay.setContent(commandText)
                );

                if (cmdIndex < currentCommands.length - 1) {
                    finalContainer.addSeparatorComponents(separator => separator);
                }
            });

            // Add footer
            finalContainer.addSeparatorComponents(separator => separator);
            finalContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*Total Commands: ${containerData.map(c => c.commands).flat().length} • Use \`/help\` for detailed help*`)
            );

            finalContainer.addTextDisplayComponents(
                textDisplay => textDisplay.setContent(`*${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:R>*`)
            );
            
            return interaction.editReply({ 
                components: [finalContainer], 
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
