import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";
import { join } from "path";
import roundedRect from "../../helpers/roundedRect";
import User from "../../models/User";
import { LevelToXP, XPToLevel } from "../../helpers/level";
import getTranslation from "../../helpers/i18n";

export const shouldRegister = true;

export const data = new SlashCommandBuilder()
	.setName("rank")
	.setDescription("Shows your rank card")
	.setDescriptionLocalization("tr", "Sıralama kartınızı gösterir.");

export async function execute(interaction: ChatInputCommandInteraction) {
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

	if (user.xp <= 1) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"rank.noXP",
						interaction.locale
					),
				}),
			],
		});
	}

	const rank =
		(await User.find({ xp: { $gt: user.xp } }).countDocuments()) + 1;

	const canvas = createCanvas(2048, 512);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Load the background image and draw it to the canvas
	const background = await loadImage(
		join(__dirname, "../../images/rank-card.png")
	);
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	// Draw the user's avatar to the canvas as a circle (416x416px)
	const avatar = await loadImage(
		interaction.user.displayAvatarURL({ extension: "png", size: 512 })
	);
	ctx.save();
	ctx.beginPath();
	ctx.arc(416 / 2 + 48, 416 / 2 + 48, 416 / 2, 0, 2 * Math.PI, true);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar, 48, 48, 416, 416);
	ctx.restore();

	// Draw the user's username to the canvas with specified font from file
	ctx.font = "bold 80px sans-serif";
	ctx.fillStyle = "#fec396";
	ctx.fillText(interaction.user.username, 512 + 16, 256 + 80 / 2);

	ctx.fillStyle = "rgba(12, 3, 28, 0.25)";
	roundedRect(ctx as any, 512, 320, 1488, 96, 48);
	ctx.fill();

	const currentLevel = XPToLevel(user.xp);
	const nextLevelXP =
		Math.floor(LevelToXP(Math.floor(currentLevel) + 1) / 50) * 50;

	const barWidth = 1456 * (user.xp / nextLevelXP);

	const intlFormat = new Intl.NumberFormat(interaction.locale, {
		notation: "compact",
	}).format;

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 36px sans-serif";
	ctx.textAlign = "right";
	ctx.fillText(intlFormat(nextLevelXP), 2000 - 16, 336 + 32 + 18 - 4);
	ctx.fillStyle = "#fec396";

	roundedRect(ctx as any, 528, 336, barWidth, 64, 32);
	ctx.fill();

	ctx.font = "bold 52px sans-serif";
	ctx.fillText(
		`#${rank}   ${Math.floor(currentLevel)}. ${getTranslation(
			"global",
			"level",
			interaction.locale
		)}`,
		2000,
		320 - 26
	);

	// Write current xp to bar
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 36px sans-serif";
	ctx.fillText(
		intlFormat(Math.floor(user.xp)),
		528 + barWidth - 16,
		336 + 32 + 18 - 4
	);

	return await interaction.reply({ files: [canvas.toBuffer()] });
}
