import { REST, Routes, SlashCommandBuilder } from 'discord.js';

// Define a function to register application commands to Discord.
export default async function putApplicationCommands(
    commands: SlashCommandBuilder[], // Array of commands to register.
    clientId: string, // The ID of your bot/application.
    token: string, // Authorization token to authenticate with the Discord API.
    guildID?: string // The ID of the guild to register the commands in (optional).
) {
    // Create a new REST API client instance, specifying the API version.
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        // Log the start of the command registration process for debugging.
        console.log(`Started refreshing application (/) commands${
            guildID ? ` for guild ${guildID}` : ''
        }.`);

        // Use the Discord API to replace the existing commands with the ones provided.
        // This is done via a PUT request to the application commands endpoint.
        await rest.put(
            guildID ? // If a guild ID is provided, register the commands in the guild.
                Routes.applicationGuildCommands(clientId, guildID) : // Guild commands route.
                Routes.applicationCommands(clientId), // Global commands route.
            { body: commands.map(command => command.toJSON()) } // The body of the request contains the commands to register.
        );

        // If the previous operation was successful, log a confirmation message.
        console.log(`Successfully reloaded application (/) commands${
            guildID ? ` for guild ${guildID}` : ''
        }.`);

        return true; // Indicate success.
    } catch (error: any) {
        // In case of an error (e.g., network issues, invalid token),
        // log the error to the console for debugging.
        console.log(error.requestBody.json[23]);

        return false; // Indicate failure.
    }
}