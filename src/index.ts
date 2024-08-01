import dotenv from "dotenv";
import { ActivityType, Client, GatewayIntentBits, Locale } from "discord.js";
import readEventListeners from "./helpers/readEventListeners";
import path from "path";
import readCommands from "./helpers/readCommands";
import putApplicationCommands from "./helpers/putApplicationCommands";
import mongoose from "mongoose";
import readModalActions from "./helpers/readModalActions";
import createTopGGWebhook from "./helpers/topggWebhook";
import readSelectMenus from "./helpers/readSelectMenus";
import EmbedManager from "./helpers/embed";

import "./i18n";

import i18next from "i18next";
import User from "./models/User";
import checkPremiumsPassed from "./helpers/user/premium";

// Load environment variables from .env file into process.env.
dotenv.config();

// Main async function to run the bot.
async function main() {
	// Connect to MongoDB and log in to Discord client upon successful connection.
	await mongoose.connect(process.env.MONGODB_URL || "");
	console.log("Connected to MongoDB.");

	// Initialize Discord client with specified intents.
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildPresences,
		],
	});

	// Read event listeners from the events directory, log an error if unsuccessful.
	const eventListeners = await readEventListeners(
		path.join(__dirname, "events")
	);
	if (!eventListeners?.success) return console.log(eventListeners.error);

	// Register the event listeners to the Discord client.
	for (const eventListener of eventListeners.listeners) {
		// Use .once or .on based on the listener's 'once' property.
		if (eventListener.once) {
			client.once(eventListener.name, (interaction, ...args: any[]) =>
				eventListener.execute(interaction, ...args)
			);
		} else {
			client.on(eventListener.name, (interaction, ...args: any[]) =>
				eventListener.execute(interaction, ...args)
			);
		}
	}

	// Read command files from the commands directory, log an error if unsuccessful.
	const commands = await readCommands(path.join(__dirname, "commands"));
	if (!commands?.success) return console.log(commands.error);

	// Map to store command data and execution logic keyed by command name.
	const commandsMap = new Map<
		string,
		{
			data: any;
			execute: any;
		}
	>();

	// Populate commandsMap with commands data.
	for (const command of commands.commands) {
		commandsMap.set(command.data.name, command);
	}
	// Read modal action files, log an error if unsuccessful.
	const modalActions = await readModalActions(
		path.join(__dirname, "modalActions")
	);
	if (!modalActions?.success) return console.log(modalActions.error);

	// Map to store modal execution logic keyed by modal name.
	const modalsMap = new Map<
		string,
		{
			name: string;
			execute: any;
		}
	>();

	// Populate modalsMap with modals data.
	for (const modal of modalActions.modals) {
		modalsMap.set(modal.name, modal);
	}

	// Read modal action files, log an error if unsuccessful.
	const selectMenus = await readSelectMenus(
		path.join(__dirname, "selectMenus")
	);
	if (!selectMenus?.success) return console.log(selectMenus.error);

	// Map to store modal execution logic keyed by modal name.
	const selectMenusMap = new Map<
		string,
		{
			name: string;
			execute: any;
		}
	>();

	// Populate modalsMap with modals data.
	for (const menu of selectMenus.menus) {
		selectMenusMap.set(menu.name, menu);
	}

	(client as any).commands = commandsMap;
	(client as any).modals = modalsMap;
	(client as any).selectMenus = selectMenusMap;
	(client as any).timeouts = new Map();

	const userCommands = [];
	const adminCommands = [];

	const cooldownedCommands = new Map<
		string,
		{
			name: string;
			localizations: Partial<Record<Locale, string | null>> | undefined;
			timeout: number;
		}
	>();

	for (const command of commands.commands) {
		if (command.admin) {
			adminCommands.push(command.data);
		} else {
			userCommands.push(command.data);
		}

		if (command.timeout) {
			cooldownedCommands.set(command.data.name, {
				name: command.data.name,
				localizations: command.data.name_localizations,
				timeout: command.timeout,
			});
		}
	}

	(client as any).cooldownedCommands = cooldownedCommands;

	// Attach commands and modals map to the client object for ease of access.
	const applicationCommandsResult = await putApplicationCommands(
		userCommands,
		process.env.APPLICATION_ID!,
		process.env.TOKEN!
	);

	// Upload commands to Discord and log an error if unsuccessful.
	if (!applicationCommandsResult)
		return console.log("Error putting application commands.");

	const adminCommandsResult = await putApplicationCommands(
		adminCommands,
		process.env.APPLICATION_ID!,
		process.env.TOKEN!,
		process.env.ADMIN_GUILD!
	);

	// Upload admin commands to Discord and log an error if unsuccessful.
	if (!adminCommandsResult)
		return console.log("Error putting admin commands.");

	await client.login(process.env.TOKEN);

	(client as any).embedManager = new EmbedManager(client as Client<true>);

	if (process.env.TOPGG_WEBHOOK === "true")
		await createTopGGWebhook(
			client,
			process.env.TOPGG_WEBHOOK_AUTHORIZATION!
		);

	setInterval(async () => {
		await checkPremiumsPassed();
	}, 1000 * 60);

	await checkPremiumsPassed();

	process.on("unhandledRejection", (error) => {
		console.error("Unhandled promise rejection:", error);
	});

	process.on("uncaughtException", (error) => {
		console.error("Uncaught exception:", error);
	});

	process.on("SIGINT", async () => {
		console.log("Shutting down...");
		await client.destroy();
		process.exit(0);
	});

	client.user?.setPresence?.({
		activities: [
			{
				name: "Silvo",
				type: ActivityType.Playing,
			},
		],
		status: "online",
	});
}

// Function to run main and restart it on error
async function runMainWithErrorHandling() {
	try {
		await main();
	} catch (error) {
		console.log("Error occurred:", error); // Log the error
		console.log("Restarting main function...");
		await runMainWithErrorHandling(); // Restart the main function on error
	}
}

// Start the process
runMainWithErrorHandling();
