// Import necessary modules from discord.js and node file system (fs)
import { Events, Interaction } from 'discord.js';
import fs from 'node:fs';

// Define a type for the result of reading event listeners, supporting both success and failure outcomes
type EventListenersReadResult = (
    {
        success: true;
        listeners: {
            name: keyof typeof Events;
            once?: boolean;
            execute: (interaction: Interaction, ...args: any[]) => any;
        }[]
    } | {
        success: false;
        error: string;
    }
)

// Function that asynchronously reads event listeners from a given path and returns a structured result
export default async function readEventListeners(path: string): Promise<EventListenersReadResult> {
    // Check if the provided path exists, return an error if not
    if (!fs.existsSync(path)) return {
        success: false,
        error: 'The path provided does not exist.'
    };

    // Read all files in the provided directory
    const files = fs.readdirSync(path);

    // Return an error if the directory is empty
    if (!files.length) return {
        success: false,
        error: 'The path provided does not contain any files.'
    };

    // Filter out files that do not have .ts or .js extensions (not event listeners)
    const eventListeners = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    // Return an error if no event listeners (js or ts files) are found
    if (!eventListeners.length) return {
        success: false,
        error: 'The path provided does not contain any event listeners.'
    };

    // Initialize our result structure with success but empty listeners array
    const eventListenersReadResult: EventListenersReadResult = {
        success: true,
        listeners: []
    };

    // Loop through each potential event listener file
    for (const eventListener of eventListeners) {
        // Import the event listener file dynamically based on the constructed path
        const eventListenerFile = await import(`${path}/${eventListener}`);

        // If the imported file does not have the required structure, return an error
        if (!eventListenerFile.name || !eventListenerFile.execute) return {
            success: false,
            error: `The event listener file "${eventListener}" does not contain a name or execute function.`
        };

        // If the imported file is valid, add its details to our results array
        eventListenersReadResult.listeners.push({
            name: eventListenerFile.name,   // Event name
            once: Boolean(eventListenerFile.once), // Whether the event should only execute once
            execute: eventListenerFile.execute     // The function to execute when the event occurs
        });
    }

    // Finally, return the populated result indicating success and the list of event listeners
    return eventListenersReadResult;
}