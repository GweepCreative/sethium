// Import necessary elements from `discord.js`
import { Client, Events } from "discord.js";
import { PopulatedUser } from "../models/User";
/* import { createCanvas, loadImage } from "canvas"; */
import { join } from "path";
import { XPToLevel } from "../helpers/level";
import getTranslation from "../helpers/i18n";

// Export `name` variable using the `ClientReady` event from the `Events` enumeration.
// This indicates that this piece of code should be executed when the client is ready.
export const name = "levelUp";

// Export the `once` flag as `true` to signify that this event should only be triggered once.
export const once = false;

// The `execute` function is called when the event specified in `name` is triggered.
// It takes a `Client` instance as an argument, allowing you to interact with the Discord API.
export async function execute(client: Client, user: PopulatedUser) {
    /* const userDetails = await client.users.fetch(user.id);

    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');

    // Load the background image and draw it to the canvas
    const background = await loadImage(join(__dirname, '../images/level-card.png'));
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Draw the user's avatar to the canvas as a circle (320x320px) to top center
    const avatar = await loadImage(userDetails.displayAvatarURL({ extension: 'png', size: 512 }));
    const size = 120;
    const x = 256 / 2 - size / 2;
    const y = 24;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';

    // Say leveled up to ...
    ctx.textAlign = 'center';
    ctx.fillText(getTranslation("commands", "level.advancedTo", user.language), canvas.width / 2, 192);
    ctx.fillText(getTranslation("commands", "level.level", user.language, {
        level: Math.floor(XPToLevel(user.xp))
    }), canvas.width / 2, 224);

    await userDetails.send({
        content: getTranslation("commands", "level.message", user.language, {
            reward: new Intl.NumberFormat(user.language).format((Math.floor(XPToLevel(user.xp)) + 1) * 2000)
        }),
        files: [canvas.toBuffer()]
    }); */
}