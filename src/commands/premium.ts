import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../models/User";
import getTranslation from "../helpers/i18n";
import ProgressBar from "../helpers/general/progressBar";

export const data = new SlashCommandBuilder()
    .setName('premium')
    .setDescriptionLocalization('tr', 'Premium hakkında bilgi almanızı sağlar.')
    .setDescription('Allows you to get information about premium.');

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

    if (user.premium.status) {
        const remainingDays = Math.floor(
            (
                new Date(user.premium.expiration).getTime() - Date.now()
            ) / 1000 / 60 / 60 / 24
        );

        const progress = ProgressBar(remainingDays, 30);

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: getTranslation('commands', 'premium.title', interaction.locale),
                    content: getTranslation('commands', 'premium.activeSubscription', interaction.locale, {
                        time: Math.floor(new Date(user.premium.expiration).getTime() / 1000)
                    }).replace('$progress', progress) + `\n\n**${getTranslation('commands', 'premium.ownedBenefitsTitle', interaction.locale)}**\n${getTranslation('commands', 'premium.benefits', interaction.locale)}`
                })
            ]
        });
    }

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation('commands', 'premium.title', interaction.locale),
                content: `**${getTranslation('commands', 'premium.benefitsTitle', interaction.locale)}**\n${getTranslation('commands', 'premium.benefits', interaction.locale)}`
            })
        ]
    });
}