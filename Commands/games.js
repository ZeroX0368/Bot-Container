
const { SlashCommandBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, PermissionFlagsBits } = require('discord.js');
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Play various games')
        .addSubcommand(subcommand =>
            subcommand
                .setName('snake')
                .setDescription('Play the classic Snake game')),

    async execute(interaction) {
        // Check if user has required permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.UseApplicationCommands)) {
            return await interaction.reply({
                content: '❌ You need "Use Application Commands" permission to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'snake':
                    await handleSnakeGame(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in games command:', error);
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

async function handleSnakeGame(interaction) {
    const getRandomString = (length) => {
        const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += randomChars.charAt(
                Math.floor(Math.random() * randomChars.length),
            );
        }
        return result;
    };

    const id1 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id2 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id3 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id4 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id5 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id6 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);
    const id7 = getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20) + '-' + getRandomString(20);

    let score = 0;
    const width = 12;
    const height = 8;
    const gameBoard = [];
    let inGame = false;
    let snakeLength = 1;
    const apple = { x: 0, y: 0 };
    let snake = [{ x: 0, y: 0 }];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            gameBoard[y * width + x] = "⬜";
        }
    }

    function gameBoardToString() {
        let str = '';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x == apple.x && y == apple.y) {
                    str += "🔴";
                    continue;
                }
                let flag = true;
                for (let s = 0; s < snake.length; s++) {
                    if (x == snake[s].x && y == snake[s].y) {
                        str += "🟢";
                        flag = false;
                    }
                }
                if (flag) {
                    str += gameBoard[y * width + x];
                }
            }
            str += '\n';
        }
        return str;
    }

    function isLocInSnake(pos) {
        return snake.find((sPos) => sPos.x == pos.x && sPos.y == pos.y);
    }

    function newAppleLoc() {
        let newApplePos = { x: 0, y: 0 };
        do {
            newApplePos = {
                x: parseInt(Math.random() * width),
                y: parseInt(Math.random() * height),
            };
        } while (isLocInSnake(newApplePos));
        apple.x = newApplePos.x;
        apple.y = newApplePos.y;
    }

    function createGameContainer(gameOver = false) {
        const container = new ContainerBuilder()
            .setAccentColor(getEmbedColor(interaction.client));

        // Add header with bot name and command
        container.addTextDisplayComponents(
            textDisplay => textDisplay
                .setContent(`🤖 **${interaction.client.user.username}**\n🐍 • **Snake**`)
        );

        container.addSeparatorComponents(separator => separator);

        if (gameOver) {
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Game Over!**\n\nGG, you scored **${score}** points!`)
            );
        } else {
            container.addTextDisplayComponents(
                textDisplay => textDisplay
                    .setContent(`**Score: ${score}**\n\n${gameBoardToString()}`)
            );
        }

        container.addSeparatorComponents(separator => separator);

        // Add footer with timestamp
        const timestamp = Math.floor(new Date().getTime() / 1000);
    container.addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`*${interaction.user.username} | <t:${timestamp}:t>*`)
    );

        // Create buttons
        const lock1 = new ButtonBuilder()
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(id1)
            .setDisabled(true);

        const w = new ButtonBuilder()
            .setEmoji("⬆️")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id2)
            .setDisabled(gameOver);

        const lock2 = new ButtonBuilder()
            .setLabel('\u200b')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(id7)
            .setDisabled(true);

        const a = new ButtonBuilder()
            .setEmoji("⬅️")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id3)
            .setDisabled(gameOver);

        const s = new ButtonBuilder()
            .setEmoji("⬇️")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id4)
            .setDisabled(gameOver);

        const d = new ButtonBuilder()
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(id5)
            .setDisabled(gameOver);

        const stop = new ButtonBuilder()
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
            .setCustomId(id6)
            .setDisabled(gameOver);

        const row1 = new ActionRowBuilder().addComponents([lock1, w, lock2, stop]);
        const row2 = new ActionRowBuilder().addComponents([a, s, d]);

        container.addActionRowComponents(row1);
        container.addActionRowComponents(row2);

        return container;
    }

    function step() {
        if (apple.x == snake[0].x && apple.y == snake[0].y) {
            score += 1;
            snakeLength++;
            newAppleLoc();
        }

        const container = createGameContainer();
        return interaction.editReply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });
    }

    function gameOver() {
        const container = createGameContainer(true);
        return interaction.editReply({ 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        });
    }

    if (inGame) return;
    inGame = true;
    score = 0;
    snakeLength = 1;
    snake = [{ x: 5, y: 5 }];
    newAppleLoc();

    await interaction.deferReply();

    const container = createGameContainer();
    const message = await interaction.editReply({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true 
    });

    const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
            return await btn.reply({
                content: 'Only the person who started the game can play!',
                ephemeral: true
            });
        }

        await btn.deferUpdate();

        const snakeHead = snake[0];
        const nextPos = { x: snakeHead.x, y: snakeHead.y };

        if (btn.customId === id3) { // Left
            let nextX = snakeHead.x - 1;
            if (nextX < 0) {
                nextX = width - 1;
            }
            nextPos.x = nextX;
        } else if (btn.customId === id2) { // Up
            let nextY = snakeHead.y - 1;
            if (nextY < 0) {
                nextY = height - 1;
            }
            nextPos.y = nextY;
        } else if (btn.customId === id4) { // Down
            let nextY = snakeHead.y + 1;
            if (nextY >= height) {
                nextY = 0;
            }
            nextPos.y = nextY;
        } else if (btn.customId === id5) { // Right
            let nextX = snakeHead.x + 1;
            if (nextX >= width) {
                nextX = 0;
            }
            nextPos.x = nextX;
        } else if (btn.customId === id6) { // Cancel
            gameOver();
            collector.stop();
            return;
        }

        if (isLocInSnake(nextPos)) {
            gameOver();
            collector.stop();
        } else {
            snake.unshift(nextPos);
            if (snake.length > snakeLength) {
                snake.pop();
            }
            step();
        }
    });

    collector.on('end', () => {
        if (inGame) {
            gameOver();
        }
    });
}
