## 🤖 Discord Bot with Slash Commands

A Discord bot built with Node.js and Discord.js featuring slash commands for various server utilities.

## Made By Bucu0368

## Features
- `/server icon` - Get Server Icon
- `/server info` - Get server information

## Screenshots
![image](https://cdn.discordapp.com/attachments/1335597135202353224/1424710388871594055/20251006_174957.jpg?ex=68e4f072&is=68e39ef2&hm=946f0910ac49e895b6dc567d73423eaf2d4972a5be60282d4f4b62e241c4736f&)

## Setup

1. **Create a Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Go to the "Bot" section and create a bot
   - Copy the bot token

2. **Set up Environment Variables:**
   - Add `DISCORD_BOT_TOKEN` with your bot token
   - Add `DISCORD_CLIENT_ID` with your application ID

3. **Invite Bot to Server:**
   - Go to OAuth2 > URL Generator
   - Select "bot" and "applications.commands" scopes
   - Select necessary permissions
   - Use the generated URL to invite your bot

## 🚀 Quick Start
```bash
npm install
node index.js
