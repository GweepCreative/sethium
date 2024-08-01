import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import getTranslation from "../helpers/i18n";
import sentenceCase from "../helpers/cases/sentenceCase";
import User from "../models/User";

export const data = new SlashCommandBuilder()
    .setName('bekleme-süreleri')
    .setNameLocalization("en-US", "cooldowns")
    .setDescription('Komutların bekleme sürelerini gösterir')
    .setDescriptionLocalization("en-US", "Shows the cooldowns of commands");

export async function execute(interaction: ChatInputCommandInteraction) {
    /* const cooldowns = Array.from(interaction.client.cooldownedCommands.values());

    let description = '';

    for (const cooldown of cooldowns) {
        const current = interaction.client.timeouts.get(`${cooldown.name}-${interaction.user.id}`);

        description += `**${sentenceCase(cooldown.localizations?.[interaction.locale] ?? cooldown.name)}** `;
        if (current === undefined) {
            description += getTranslation("global", "na", interaction.locale) + '\n\n';
        } else {
            description += `<t:${Math.floor(current / 1000)}:R>\n\n`;
        }
    }

    await interaction.reply({
        embeds: [interaction.client.embedManager.Success({
            content: description
        })],
        ephemeral: true
    }); */

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

    const lastDaily = new Date(user.lastDaily as any ?? 0).getTime();
    const lastHourly = new Date(user.lastHourly as any ?? 0).getTime();
    const lastVote = new Date(user.votes[user.votes.length - 1] as any ?? 0).getTime();

    let description = '';

    description += `**${getTranslation("global", "daily", interaction.locale)}** `;

    if (Date.now() - lastDaily >= 24 * 60 * 60 * 1000) {
        description += getTranslation("global", "na", interaction.locale) + '\n\n';
    } else {
        description += `<t:${Math.floor((lastDaily + 86400000) / 1000)}:R>\n\n`;
    }

    description += `**${getTranslation("global", "hourly", interaction.locale)}** `;

    if (Date.now() - lastHourly >= 60 * 60 * 1000) {
        description += getTranslation("global", "na", interaction.locale) + '\n\n';
    } else {
        description += `<t:${Math.floor((lastHourly + 3600000) / 1000)}:R>\n\n`;
    }

    description += `**${getTranslation("global", "vote", interaction.locale)}** `;

    if (Date.now() - lastVote >= 12 * 60 * 60 * 1000) {
        description += getTranslation("global", "na", interaction.locale) + '\n\n';
    } else {
        description += `<t:${Math.floor((lastVote + 43200000) / 1000)}:R>\n\n`;
    }

    await interaction.reply({
        embeds: [interaction.client.embedManager.Info({
            content: description
        })]
    });
}