import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import rand from "../../helpers/math/rand";
import getTranslation from "../../helpers/i18n";
import { increaseActionCount } from "../../helpers/user/achievements";
import Partnership from "../../models/Partnership";

export const data = new SlashCommandBuilder()
    .setName('luck')
    .setNameLocalization('tr', 'şans')
    .setDescriptionLocalization('tr', 'Birisine şans dile')
    .setDescription('Wish someone luck')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user you want to wish luck')
            .setDescriptionLocalization('tr', 'Şans dilediğiniz kişi')
            .setRequired(false)
    );

export const timeout = 1000 * 60 * 3;

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id })
        .populate('partner.partner') as unknown as PopulatedUser;

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.noAccount", interaction.locale)
                })
            ]
        });
    }

    const userToWish = interaction.options.getUser('user') || interaction.user;

    const query = await User.findOne({ id: userToWish.id });

    if (!query) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "luck.notRegistered", interaction.locale)
                })
            ]
        });
    }

    let increasment = 1;

    const partnership = await Partnership.findOne({
        $or: [
            { from: user, active: true },
            { to: user, active: true }
        ]
    });

    if (partnership && partnership?.level >= 2) {
        increasment = Math.floor(rand(2, 3));
    }

    await increaseActionCount(interaction.client, query as any, "luck", increasment);

    await query.save();

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Success({
                content: (
                    interaction.user.id === userToWish.id
                        ? getTranslation("commands", "luck.wishedYourself", interaction.locale, {
                            luck: Math.floor(query.luck).toString(),
                            count: increasment.toString()
                        })
                        : getTranslation("commands", "luck.success", interaction.locale, {
                            user: userToWish.tag,
                            luck: Math.floor(query.luck).toString(),
                            count: increasment.toString()
                        })
                )
            })
        ]
    });
}