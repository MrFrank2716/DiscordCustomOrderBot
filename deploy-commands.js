const { REST, Routes } = require('discord.js');
const { commands } = require('./bot.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        // Convert command builders to JSON
        const commandsData = commands.map(command => command.toJSON());

        // Deploy commands globally or to a specific guild
        if (process.env.GUILD_ID) {
            // Guild-specific commands (faster update)
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsData }
            );
            console.log(`Successfully reloaded ${commandsData.length} application (/) commands for guild ${process.env.GUILD_ID}.`);
        } else {
            // Global commands (takes up to 1 hour to update)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commandsData }
            );
            console.log(`Successfully reloaded ${commandsData.length} global application (/) commands.`);
        }
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

deployCommands();
