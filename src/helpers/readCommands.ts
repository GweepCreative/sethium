import { AutocompleteInteraction, ChatInputCommandInteraction, Client, Events, SlashCommandBuilder } from 'discord.js';
import fs from 'node:fs';

type CommandsReadResult = (
    {
        success: true;
        commands: {
            data: SlashCommandBuilder;
            execute: (interaction: ChatInputCommandInteraction) => any;
            autocomplete?: (interaction: AutocompleteInteraction) => Promise<any>;
            timeout?: number;
            shouldRegister?: boolean;
            admin?: boolean;
        }[]
    } | {
        success: false;
        error: string;
    }
)

// Function to read commands from a given directory
export default async function readCommands(path: string): Promise<CommandsReadResult> {
    // Check if the specified path exists
    if (!fs.existsSync(path)) return {
        success: false,
        error: 'The path provided does not exist.'
    };

    // Read all files from the specified path
    const files = fs.readdirSync(path);

    // If no files are present, return an error
    if (!files.length) return {
        success: false,
        error: 'The path provided does not contain any files.'
    };

    // Prepare the command read result
    const commandReadResult: CommandsReadResult = {
        success: true,
        commands: []
    };

    const directories = files.filter(file => fs.lstatSync(`${path}/${file}`).isDirectory());

    // If there are directories present, read commands from each directory
    if (directories.length) {
        const subCommands = await Promise.all(directories.map(directory => readCommands(`${path}/${directory}`)));

        // If any of the sub-commands failed to read, return the error
        for (const subCommand of subCommands) {
            if (!subCommand.success) return subCommand;
        }

        // Merge the sub-commands into a single array and return the result
        commandReadResult.commands = subCommands.map(subCommand => subCommand.success ? subCommand.commands : []).flat()
    }

    // Filter out files that are not JavaScript or TypeScript command files
    const commands = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    // If no command files are found, return an error
    if (!commands.length && commandReadResult.commands.length < 1) return {
        success: false,
        error: 'The path provided does not contain any commands'
    };

    // Loop through each command file found
    for (const command of commands) {
        // Dynamically import the command module
        const commandFile = await import(`${path}/${command}`);

        // Verify that the imported module has both data and execute properties
        if (!commandFile.data || !commandFile.execute) return {
            success: false,
            error: `The event listener file "${command}" does not contain a name or execute function.`
        };

        // Add the command to the command read result including its data, execute method, and optional autocomplete method
        commandReadResult.commands.push({
            data: commandFile.data,
            execute: commandFile.execute,
            autocomplete: commandFile.autocomplete,
            timeout: commandFile.timeout ?? undefined,
            shouldRegister: commandFile.shouldRegister ?? false,
            admin: commandFile.admin ?? false
        });
    }

    // Return the successfully read commands
    return commandReadResult;
}