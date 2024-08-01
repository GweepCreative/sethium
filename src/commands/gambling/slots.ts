import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import Log from "../../models/Log";
import { seth, slot } from "../../constants/emojis";
import getTranslation from "../../helpers/i18n";
import { increaseActionCount } from "../../helpers/user/achievements";
import { checkLevelUp } from "../../helpers/level";

export const data = new SlashCommandBuilder()
	.setName("slots")
	.setNameLocalization("tr", "slot")
	.setDescriptionLocalization("tr", "Slot oynar")
	.setDescription("Plays a slot machine")
	.addNumberOption((option) =>
		option
			.setName("amount")
			.setDescription("The amount you want to bet")
			.setDescriptionLocalization("tr", "Bahis miktarı")
			.setRequired(true)
	);

export const timeout = 15000;

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
	try {
		const intl = new Intl.NumberFormat(interaction.locale).format;
		const user = await User.findOne({ id: interaction.user.id });

		if (!user) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.noAccount",
							interaction.locale
						),
					}),
				],
			});
		}

		const amount = interaction.options.getNumber("amount", true);

		if (amount < 1) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"general.invalidAmount",
							interaction.locale
						),
					}),
				],
			});
		}

		if (amount > user.wallet.seth) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"general.infussicientBalance",
							interaction.locale
						),
					}),
				],
			});
		}

		const limit = user.premium.status ? 50000 : 25000;

		if (amount > limit) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"general.excessedLimit",
							interaction.locale,
							{
								limit: `**${intl(limit)}**`,
							}
						),
					}),
				],
			});
		}

		const bet = getTranslation(
			"commands",
			"slots.bet",
			interaction.locale,
			{
				amount: intl(amount),
			}
		);

		let lines = [
			`\`|_SLOTS_|\``,
			slot.rolling.repeat(3) + " " + bet,
			`\`|       |\``,
			`\`|_______|\``,
		];

		const list = [
			["0x", 0],
			["1x", 1],
			["2x", 2],
			["3x", 3],
			["5x", 5],
			["10x", 10],
		];
		let rand = Math.floor(Math.random() * 1000) / 10;

		const rslots: any[] = [];
		let win = 0;

		if (rand <= 20) {
			//1x 20%
			win = amount * 2;
			rslots.push("1x");
			rslots.push("1x");
			rslots.push("1x");
		} else if (rand <= 40) {
			//2x 20%
			win = amount * 3;
			rslots.push("2x");
			rslots.push("2x");
			rslots.push("2x");
		} else if (rand <= 45) {
			//3x 5%
			win = amount * 4;
			rslots.push("3x");
			rslots.push("3x");
			rslots.push("3x");
		} else if (rand <= 47.5) {
			//4x 2.5%
			win = amount * 6;
			rslots.push("5x");
			rslots.push("5x");
			rslots.push("5x");
		} else if (rand <= 48.5) {
			//10x 1%
			win = amount * 11;
			rslots.push("10x");
			rslots.push("10x");
			rslots.push("10x");
		} else {
			var slot1 = Math.max(
				Math.floor(Math.random() * (list.length - 1)),
				1
			);
			var slot2 = Math.max(
				Math.floor(Math.random() * (list.length - 1)),
				1
			);
			var slot3 = Math.max(
				Math.floor(Math.random() * (list.length - 1)),
				1
			);
			if (slot3 == slot1)
				slot2 = Math.max(
					(slot1 + Math.ceil(Math.random() * (list.length - 2))) %
						(list.length - 1),
					1
				);
			if (slot2 == list.length - 2) slot2++;
			rslots.push(list[slot1][0]);
			rslots.push(list[slot2][0]);
			rslots.push(list[slot3][0]);
		}

		await interaction.reply({
			embeds: [
				interaction.client.embedManager.Info({
					content: lines.join("\n"),
				}),
			],
			fetchReply: true,
		});

		await new Promise((r) => setTimeout(r, 3000));

		async function SelectRow(user: any, index: number) {
			lines[1] = "";

			lines[1] += index >= 0 ? slot[rslots[0]] : slot.rolling;
			lines[1] += index >= 2 ? slot[rslots[1]] : slot.rolling;
			lines[1] += index >= 1 ? slot[rslots[2]] : slot.rolling;
			lines[1] += " " + bet;

			if (index >= 2) {
				const isWon =
					rslots[0] === rslots[1] && rslots[1] === rslots[2];

				const change = win - amount;

				if (isWon) {
					await increaseActionCount(
						interaction.client,
						user as any,
						"slots"
					);
				}

				checkLevelUp(interaction.client, user as any, isWon ? 3 : 1);

				user.wallet.seth += change;
				await user.save();
				await new Log({
					from: isWon ? "00000000000000000" : user.id,
					to: isWon ? user.id : "00000000000000000",
					type: "slots",
					amount: Math.abs(change),
				}).save();

				if (isWon) {
					lines[2] +=
						" " +
						getTranslation(
							"commands",
							"slots.win",
							interaction.locale,
							{
								reward: intl(Math.abs(change)),
							}
						).replaceAll("$seth", seth);
				} else {
					lines[2] +=
						" " +
						getTranslation(
							"commands",
							"slots.lose",
							interaction.locale
						);
				}
			}

			try {
				const msg = await interaction.fetchReply();

				if (msg && msg.editable)
					await msg.edit({
						embeds: [
							interaction.client.embedManager.Info({
								content: lines.join("\n"),
							}),
						],
					});
			} catch (e) {
				console.log(e);
			}

			await new Promise((r) => setTimeout(r, 1000));

			if (index < 2) {
				await SelectRow(user, index + 1);
			}
		}

		await SelectRow(user, 0);
	} catch (error) {
		console.error(error);
	}
}
