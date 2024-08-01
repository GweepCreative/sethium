import {
	ChatInputCommandInteraction,
	GuildMember,
	SlashCommandBuilder,
} from "discord.js";
import { createCanvas, loadImage } from "canvas";
import { join } from "path";
import roundedRect from "../../helpers/roundedRect";
import User from "../../models/User";
import { XPToLevel } from "../../helpers/level";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
	.setName("top")
	.setNameLocalization("tr", "sıralama")
	.setDescription("Get top 10 users")
	.setDescriptionLocalization("tr", "En iyi 10 kullanıcıyı getirir.")
	.addStringOption((option) =>
		option
			.setName("type")
			.setDescription("Type of leaderboard")
			.setDescriptionLocalization("tr", "Sıralama türü")
			.addChoices(
				{
					name: "XP",
					value: "xp",
				},
				{
					name: "Silvon",
					value: "silvon",
				}
			)
			.setRequired(true)
	)
	.addStringOption((option) =>
		option
			.setName("in")
			.setDescription("Coverage of leaderboard")
			.setDescriptionLocalization("tr", "Sıralama kapsamı")
			.addChoices(
				{
					name: "Global",
					value: "global",
				},
				{
					name: "Server",
					value: "server",
				}
			)
			.setRequired(true)
	);

const specialColors = {
	1: "#fbbf24",
	2: "#a1a1aa",
	3: "#fb923c",
} as any;

export async function execute(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply();

	const user = await User.findOne({ id: interaction.user.id });

	const canvas = createCanvas(1024, 682);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Load the background image and draw it to the canvas
	const background = await loadImage(
		join(__dirname, "../../images/top-card.png")
	);
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	const type = interaction.options.getString("type") || "xp";
	const inType = interaction.options.getString("in") || "global";

	const icon = await loadImage(
		inType === "global"
			? interaction.client.user.displayAvatarURL({
					extension: "png",
					size: 512,
			  })
			: interaction.guild?.iconURL({ extension: "png", size: 512 }) ||
					interaction.client.user.displayAvatarURL({
						extension: "png",
						size: 512,
					})
	);

	const getGuildMembers = async () => {
		try {
			const members = [];

			for (const member of (Array.from(
				(await interaction.guild?.members.fetch())?.values() as any
			) || ([] as any)) as GuildMember[]) {
				if (member.user.bot) continue;

				members.push(member.user.id);
			}

			return members;
		} catch (e) {
			console.error(e);

			return [];
		}
	};

	const users =
		type === "xp"
			? await User.find(
					inType === "global"
						? {}
						: { id: { $in: await getGuildMembers() } }
			  )
					.sort({ xp: -1 })
					.limit(10)
			: await User.aggregate([
					...(inType === "global"
						? []
						: [
								{
									$match: {
										id: { $in: await getGuildMembers() },
									},
								},
						  ]),
					{
						$addFields: {
							// new field to hold the total
							total: {
								$sum: ["$wallet.seth", "$bank.seth"],
							},
						},
					},
					{
						$sort: {
							total: -1,
						},
					},
					{
						$unset: ["total"],
					},
			  ]).limit(10);

	async function getRank(user: any) {
		if (type === "xp") {
			return (
				(await User.find({ xp: { $gt: user.xp } }).countDocuments()) + 1
			);
		}
		const result = await User.aggregate([
			{
				$addFields: {
					// new field to hold the total
					total: {
						$sum: ["$wallet.seth", "$bank.seth"],
					},
				},
			},
			{
				$match: {
					total: {
						$gt: user.wallet.seth + user.bank.seth || 0,
					},
				},
			},
			{
				$count: "rank",
			},
		]);

		return (result[0]?.rank || 0) + 1;
	}

	const userRank = await getRank(user);

	ctx.fillStyle = "rgba(12, 3, 28, 0.5)";
	[
		[16, 16, 100, 100, 15],
		[126, 16, 653, 100, 15],
		[789, 16, 219, 100, 15],
		...users.slice(0, 5).map((_, index) => {
			return [16, 126 + 110 * index, 491, 100, 15];
		}),
		...users.slice(5, 10).map((_, index) => {
			return [517, 126 + 110 * index, 491, 100, 15];
		}),
	].forEach(([x, y, width, height, radius]) => {
		roundedRect(ctx as any, x, y, width, height, radius);
		ctx.fill();
	});

	ctx.save();
	ctx.beginPath();
	ctx.arc(32 + 34, 32 + 34, 34, 0, 2 * Math.PI, true);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(icon, 32, 32, 68, 68);
	ctx.restore();

	ctx.font = "bold 50px sans-serif";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(
		`${
			type === "xp"
				? getTranslation("global", "level", interaction.locale)
				: "Silvon"
		} ${getTranslation("global", "ranking", interaction.locale)}`,
		142,
		36 + 50
	);

	ctx.textAlign = "right";
	ctx.fillText(userRank ? `#${userRank}` : "N/A", 992, 36 + 50);

	// Draw user's avatar on x: 805 y: 32 with 68x68 dimensions
	const avatar = await loadImage(
		interaction.user.displayAvatarURL({ extension: "png", size: 512 })
	);
	ctx.save();
	ctx.beginPath();
	ctx.arc(805 + 34, 32 + 34, 34, 0, 2 * Math.PI, true);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(avatar, 805, 32, 68, 68);
	ctx.restore();

	ctx.textAlign = "left";

	const sethium = await loadImage(
		join(__dirname, "../../images/sethium.png")
	);

	const intlFormat = new Intl.NumberFormat(interaction.locale, {
		notation: "compact",
	}).format;

	const userPromises = await Promise.all(
		users.map(async (user) => {
			const member = await interaction.client.users.fetch(user.id);
			return {
				id: user.id,
				username: member.username,
				avatar: member.displayAvatarURL({
					extension: "png",
					size: 512,
				}),
			};
		})
	);

	const avatarImages = await Promise.all(
		userPromises.map(async (user) => {
			return await loadImage(user.avatar);
		})
	);

	for (let i = 0; i < 2; i++) {
		for (const [index, user] of users.slice(i * 5, (i + 1) * 5).entries()) {
			const member = userPromises[i * 5 + index];

			const avatar = avatarImages[i * 5 + index];

			ctx.save();
			ctx.beginPath();
			ctx.arc(
				32 + 34 + i * 501,
				126 + 110 * index + 34 + 16,
				34,
				0,
				2 * Math.PI,
				true
			);
			ctx.closePath();
			ctx.clip();
			ctx.drawImage(avatar, 32 + i * 501, 126 + 110 * index + 16, 68, 68);
			ctx.restore();

			ctx.textAlign = "right";
			ctx.font = "bold 32px sans-serif";
			ctx.fillStyle =
				index < 3 && i === 0 ? specialColors[index + 1] : "#fec396";
			ctx.fillText(
				`#${i * 5 + index + 1}`,
				491 + i * 501,
				126 + 110 * index + 50 + 32 / 2
			);

			ctx.textAlign = "left";
			ctx.font = "semibold 28px sans-serif";
			ctx.fillStyle = "#ffffff";
			ctx.fillText(
				member.username,
				116 + i * 501,
				126 + 110 * index + 50
			);
			ctx.font = "regular 20px sans-serif";
			ctx.fillStyle = "#fec396";

			if (type === "xp") {
				ctx.fillText(
					`${Math.floor(XPToLevel(user.xp))} ${getTranslation(
						"global",
						"level",
						interaction.locale
					)}`,
					116 + i * 501,
					126 + 110 * index + 50 + 20
				);
			} else {
				const text = `${intlFormat(user.wallet.seth + user.bank.seth)}`;
				const width = ctx.measureText(text).width;

				ctx.fillText(text, 116 + i * 501, 126 + 110 * index + 50 + 20);
				ctx.drawImage(
					sethium,
					116 + i * 501 + width + 8,
					126 + 110 * index + 50 + 20 - 17.5,
					20,
					20
				);
			}
		}
	}

	return await interaction.editReply({ files: [canvas.toBuffer()] });
}
