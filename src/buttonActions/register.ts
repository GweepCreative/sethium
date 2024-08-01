import { ButtonInteraction } from "discord.js";
import User from "../models/User";
import { createAchievementMap } from "../helpers/user/achievements";

export default async function Register(interaction: ButtonInteraction) {
	const result = await User.findOne({ id: interaction.user.id });

	if (result) {
		return await interaction.reply({
			content: "Zaten kayıtlısınız.",
			ephemeral: true,
		});
	}

	const user = new User({
		id: interaction.user.id,
		experience: 0,
		inventory: {
			loots: [],
			tools: [],
		},
		job: null,
		farmer: {
			zones: [],
		},
		achievements: createAchievementMap(),
		language: interaction.locale === "tr" ? "tr" : "en-US",
		premium: {
			status: false,
			expiration: new Date(0),
		},
	});

	await user.save();

	return await interaction.reply({
		content: "Başarıyla kayıt oldunuz.",
		ephemeral: true,
	});
}
