import { StringSelectMenuInteraction } from 'discord.js';
import fs from 'node:fs';

// Define a type for the result of reading modal actions. 
// It discriminates between a successful read (with modals array) and a failed attempt (with an error message).
type SelectMenusReadResult = (
    {
        success: true;
        menus: {
            name: string;
            execute: (interaction: StringSelectMenuInteraction) => any;
        }[]
    } | {
        success: false;
        error: string;
    }
)

export default async function readSelectMenus(path: string): Promise<SelectMenusReadResult> {
    // Check if the given path exists. If not, return an error result.
    if (!fs.existsSync(path)) return {
        success: false,
        error: 'The path provided does not exist.'
    };

    // Read all files in the provided directory path.
    const files = fs.readdirSync(path);

    // If no files are found, return an error result.
    if (!files.length) return {
        success: false,
        error: 'The path provided does not contain any files.'
    };

    // Filter out files that are not TypeScript or JavaScript (likely not modal action files).
    const modals = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    // If no applicable modal files are found, return an error result.
    if (!modals.length) return {
        success: false,
        error: 'The path provided does not contain any modals'
    };

    // Prepare a result object to accumulate successfully loaded modal actions.
    const selectMenuReadResult: SelectMenusReadResult = {
        success: true,
        menus: []
    };

    // Iterate over each found modal file.
    for (const modal of modals) {
        // Dynamically import the modal action module based on the file path.
        const commandFile = await import(`${path}/${modal}`);

        // Validate that the imported module has both a name and an execute function.
        // If not, return an error result.
        if (!commandFile.name || !commandFile.execute) return {
            success: false,
            error: `The select menu listener file "${modal}" does not contain a name or execute function.`
        };

        // Add the validated modal to the result object.
        selectMenuReadResult.menus.push({
            name: commandFile.name,
            execute: commandFile.execute
        });
    }

    // Return the result object filled with successfully loaded modal actions.
    return selectMenuReadResult;
}