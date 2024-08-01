import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import User from "../models/User";
import Loot from "../models/Loot";
import { createRows, isAdvancingAvailable } from "../helpers/work";
import { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";

export default async function Fishing(interaction: ButtonInteraction) {
	const buttons = interaction.message.components
		.map((row) =>
			row.components.map((button: any) =>
				new ButtonBuilder()
					.setCustomId(button.customId)
					.setEmoji(button.emoji)
					.setStyle(button.style)
					.setDisabled(true)
			)
		)
		.flat();

	let [id, fishName, endtime]: any[] = interaction.customId
		.split("fishing.")?.[1]
		.split(".");

	if (id !== interaction.user.id) {
		if (!interaction.replied)
			await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.notYourAccount",
							interaction.locale
						),
					}),
				],
				ephemeral: true,
			});

		return;
	}

	if (/^fishing\.\d{16,}\.[0-9]$/.test(interaction.customId)) {
		let [id, i]: any[] = interaction.customId
			.split("fishing.")?.[1]
			.split(".");

		if (id !== interaction.user.id) {
			if (!interaction.replied)
				await interaction.reply({
					embeds: [
						interaction.client.embedManager.Error({
							content: getTranslation(
								"errors",
								"account.notYourAccount",
								interaction.locale
							),
						}),
					],
					ephemeral: true,
				});

			return;
		}

		i = parseInt(i);

		buttons[i] = buttons[i].setStyle(ButtonStyle.Danger);

		const msg = await interaction.message.fetch();

		await interaction.deferUpdate();

		if (msg && msg.editable) {
			await msg.edit({
				embeds: [
					{
						...msg.embeds[0],
						description: getTranslation(
							"commands",
							"fishing.youMissed",
							interaction.locale
						),
					},
				],
				components: createRows(buttons) as any,
			});
		}

		return;
	}

	const user = await User.findOne({ id: interaction.user.id })
		.populate("inventory.items.item")
		.populate("inventory.loots.loot")
		.populate("job")
		.exec();

	if (!user) {
		if (!interaction.replied)
			await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.noAccount",
							interaction.locale
						),
					}),
				],
				ephemeral: true,
			});

		return;
	}

	if (!user.job || !user.job.name) {
		if (!interaction.replied)
			await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.noJob",
							interaction.locale
						),
					}),
				],
				ephemeral: true,
			});

		return;
	}

	endtime = parseInt(endtime);

	if (endtime < Date.now()) {
		if (!interaction.replied)
			await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"fishing.ended",
							interaction.locale
						),
					}),
				],
				ephemeral: true,
			});

		return;
	}

	const fish = await Loot.findOne({
		title: fishName,
		job: user.job.name,
	});

	if (!fish) {
		if (!interaction.replied)
			await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"fishing.cannotFindTheFish",
							interaction.locale
						),
					}),
				],
				ephemeral: true,
			});

		return;
	}

	const userLootIndex = (
		user as unknown as PopulatedUser
	).inventory.loots.findIndex((l) => l.loot?.title === fish?.title);
	
	if (userLootIndex === -1) {
		user.inventory.loots.push({
			loot: fish,
			amount: 1,
		});
	} else {
		user.inventory.loots[userLootIndex].amount =
			Math.max(user.inventory.loots[userLootIndex].amount, 0) + 1;
	}

	user.markModified(
		`inventory.loots.${
			userLootIndex === -1
				? user.inventory.loots.length - 1
				: userLootIndex
		}`
	);
	// await user.save();


	await increaseActionCount(interaction.client, user as any, "work");

	user.workExperience = Math.max(user.workExperience || 0, 0) + 1;

	await User.updateOne(
		{
			id: user.id,
		},
		{
			$set: {
				inventory: user.inventory,
				workExperience: user.workExperience,
                actionCounts: user.actionCounts,
			},
		}
	);

	const msg = await interaction.message.fetch();

	await interaction.deferUpdate();

	if (msg && msg.editable) {
		const resButtons = buttons.map((button, i) => {
			if (
				msg.components?.[Math.floor(i / 3)].components?.[i % 3]
					.customId === interaction.customId
			) {
				return button.setStyle(ButtonStyle.Success);
			}

			return button;
		});

		await msg.edit({
			embeds: [
				{
					...msg.embeds[0],
					description: getTranslation(
						"commands",
						"fishing.youCaught",
						interaction.locale
					).replace("$fish", `${fish.emoji} **${fish?.title}**`),
				},
			],
			components: createRows(resButtons) as any,
		});
	}
	await isAdvancingAvailable(user, interaction.client);
	// await user.save();
	
	
}
