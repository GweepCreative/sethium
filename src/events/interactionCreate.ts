import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Events,
	Interaction,
} from "discord.js";

import Register from "../buttonActions/register";
import Wallet from "../buttonActions/wallet";
import DiceSelection from "../buttonActions/dice";
import Guess from "../buttonActions/guess";
import Blackjack from "../buttonActions/blackjack";
import Jobs from "../buttonActions/jobs";
import Fishing from "../buttonActions/fishing";
import Mining from "../buttonActions/mining";
import Lumberjacking from "../buttonActions/lumberjacking";
import JobUpgrade from "../buttonActions/job";
import { Butcher } from "../buttonActions/butcher";
import User from "../models/User";
import { Farmer } from "../buttonActions/farmer";
import { Market } from "../buttonActions/market";
import { Profile } from "../buttonActions/profile";
import { Partner } from "../buttonActions/partnership";
import getTranslation from "../helpers/i18n";
import PartnershipStorage from "../buttonActions/partner";
import ChefButtons from "../buttonActions/chef";
import Recipes from "../buttonActions/recipes";

// Export the name of the event and whether it should run only once.
export const name = Events.InteractionCreate;
export const once = false;

// Execute function to handle the interaction.
export async function execute(interaction: Interaction) {
	try {
		// Check if the interaction is a chat input command.
		if (interaction.isChatInputCommand()) {
			// Attempt to fetch the command based on the commandName from the interaction.
			const command = (interaction.client as any).commands?.get(
				interaction.commandName
			);

			// If no matching command is found, log an error message and exit.
			if (!command) {
				console.log(
					`No command matching ${interaction.commandName} was found.`
				);
				return;
			}

			if (!isNaN(command.timeout)) {
				const name = `${interaction.commandName}-${interaction.user.id}`;

				const timeout = interaction.client.timeouts.get(name);
				const now = Date.now();

				if (timeout && timeout > now) {
					return await interaction.reply({
						embeds: [
							interaction.client.embedManager.Error({
								content: getTranslation(
									"errors",
									"general.cooldown",
									interaction.locale,
									{
										time: Math.ceil(timeout / 1000),
									}
								),
							}),
						],
						ephemeral: true,
					});
				}

				interaction.client.timeouts.set(name, now + command.timeout);
			}

			if (interaction.replied) return;

			try {
				if (command.shouldRegister) {
					const user = await User.findOne({
						id: interaction.user.id,
					});

					if (!user) {
						const registerButton = new ButtonBuilder()
							.setLabel(
								getTranslation(
									"commands",
									"register.button",
									interaction.locale
								)
							)
							.setCustomId("register")
							.setStyle(ButtonStyle.Success);

						return await interaction.reply({
							embeds: [
								interaction.client.embedManager
									.Info({
										title: getTranslation(
											"commands",
											"register.title",
											interaction.locale
										),
										content: getTranslation(
											"commands",
											"register.description",
											interaction.locale
										),
									})
									.setFooter({
										text: getTranslation(
											"commands",
											"register.count",
											interaction.locale,
											{
												count: (
													await User.countDocuments()
												).toString(),
											}
										),
									}),
							],
							components: [
								new ActionRowBuilder().addComponents(
									registerButton
								) as any,
							],
							ephemeral: true,
						});
					}
				}

				// Try executing the command, catch and log any errors if they occur.
				await command.execute(interaction);
			} catch (error) {
				console.log(`Error executing ${interaction.commandName}`);
				console.log(error);
			}
		}
		// Check if the interaction is an autocomplete interaction.
		else if (interaction.isAutocomplete()) {
			// Attempt to fetch the command based on the commandName from the interaction.
			const command = (interaction.client as any).commands?.get(
				interaction.commandName
			);

			// If no matching command or its autocomplete handler is found, log an error and respond with an empty array.
			if (!command || !command.autocomplete) {
				console.log(
					`No command matching ${interaction.commandName} was found.`
				);
				return interaction.respond([]);
			}

			// Try handling the autocomplete suggestion, catch any errors, log them, and respond with an empty array.
			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.log(`Error executing ${interaction.commandName}`);
				console.log(error);
				return interaction.respond([]);
			}
		} else if (interaction.isButton()) {
			const handlers = {
				register: Register,
				wallet: Wallet,
				dice: DiceSelection,
				guess: Guess,
				blackjack: Blackjack,
				jobs: Jobs,
				fishing: Fishing,
				mining: Mining,
				lumberjacking: Lumberjacking,
				job: JobUpgrade,
				butcher: Butcher,
				farmer: Farmer,
				market: Market,
				profile: Profile,
				partnership: Partner,
				partner: PartnershipStorage,
				chef: ChefButtons,
				recipes: Recipes,
			};

			const list = Array.from(Object.entries(handlers)).map(
				([regex, handler]) => {
					return { regex: new RegExp(regex), handler };
				}
			);

			const result = list.find(({ regex }) =>
				regex.test(interaction.customId)
			);

			if (!result)
				return await interaction.reply({
					content: "Bu butonun bir işlevi yok.",
					ephemeral: true,
				});

			try {
				await result.handler(interaction);
			} catch (error) {
				console.log(`Error executing ${interaction.customId}`);
				console.log(error);

				try {
					await interaction.message.fetch();
					await interaction.reply({
						content: "Bir hata oluştu.",
						ephemeral: true,
					});
				} catch (e) {}
			}
		}
		// Check if the interaction is a modal submit interaction.
		else if (interaction.isModalSubmit()) {
			// Parse the action part from the customId of the interaction.
			const action = interaction.customId?.split?.(".")?.[0];

			// If the action part is not present, respond with an error message.
			if (!action)
				return await interaction.reply("Geçersiz modal eylemi.");

			// Attempt to fetch the modal based on the parsed action.
			const modal = (interaction.client as any).modals.get(action);

			// If no matching modal is found, log an error message and exit.
			if (!modal) {
				console.log(`No command matching ${action} was found.`);
				return;
			}

			// Try executing the modal's handler, catch and log any errors if they occur.
			try {
				await modal?.execute?.(interaction);
			} catch (error) {
				console.log(`Error executing ${modal.name}`);
				console.log(error);
			}
		} else if (interaction.isStringSelectMenu()) {
			// Parse the action part from the customId of the interaction.
			const action = interaction.customId?.split?.(".")?.[0];

			// If the action part is not present, respond with an error message.
			if (!action)
				return await interaction.reply("Geçersiz menu eylemi.");

			// Attempt to fetch the modal based on the parsed action.
			const menu = (interaction.client as any).selectMenus.get(action);

			// If no matching modal is found, log an error message and exit.
			if (!menu) {
				console.log(`No command matching ${action} was found.`);
				return;
			}

			// Try executing the modal's handler, catch and log any errors if they occur.
			try {
				await menu?.execute?.(interaction);
			} catch (error) {
				console.log(`Error executing ${menu.name}`);
				console.log(error);
			}
		}
	} catch (error) {
		console.log("Error handling interaction", error);
	}
}
