// Import necessary elements from `discord.js`
import { Client, Events } from "discord.js";

// Export `name` variable using the `ClientReady` event from the `Events` enumeration.
// This indicates that this piece of code should be executed when the client is ready.
export const name = Events.ClientReady;

// Export the `once` flag as `true` to signify that this event should only be triggered once.
export const once = true;

// The `execute` function is called when the event specified in `name` is triggered.
// It takes a `Client` instance as an argument, allowing you to interact with the Discord API.
export function execute(client: Client) {
    // Check if the client's user property is null.
    // This could happen if the client is not properly logged in to Discord.
    if (!client.user) return;

    // If the client is correctly logged in, log a message to the console with the bot's tag.
    // The tag is a combination of the bot's username and discriminator.
    console.log(`Logged in as ${client.user.tag}!`);
}