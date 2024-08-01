import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";

import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('hourly')
    .setNameLocalization('tr', 'saatlik')
    .setDescriptionLocalization('tr', 'Saatlik ödülünü al!')
    .setDescription('Claim your hourly reward!');

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id });

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'account.noAccount', interaction.locale)
                })
            ]
        });
    }

    if(!user.premium.status) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'hourly.notPremium', interaction.locale)
                })
            ]
        });
    }

    const lastHourly = new Date(user.lastHourly || Date.now()).getTime();

    const nextHourly = lastHourly + 60 * 60 * 1000;

    if (user.lastHourly && (Date.now() < nextHourly)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'hourly.alreadyClaimed', interaction.locale, {
                        time: Math.floor(new Date(nextHourly).getTime() / 1000)
                    })
                })
            ],
            ephemeral: true
        });
    }

    user.lastHourly = new Date();
    user.wallet.seth += 10000;

    await user.save();

    const intlFormat = new Intl.NumberFormat(interaction.locale).format;

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Success({
                content: getTranslation('commands', 'hourly.claimed', interaction.locale, {
                    reward: intlFormat(10000)
                })
            })
        ]
    });
}