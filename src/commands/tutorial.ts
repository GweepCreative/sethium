import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";
export const data = new SlashCommandBuilder()
    .setName('tutorial')
    .setNameLocalization('tr', 'eğitim')
    .setDescriptionLocalization('tr', 'Adımları tamamlayarak botun genel mantığını öğrenebilirsiniz.')
    .setDescription('You can get information about the bot by taking a tutorial.');

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id }) as PopulatedUser;

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'account.noAccount', interaction.locale)
                })
            ]
        });
    }

    let description = '';

    for (let step = 1; step < user.tutorial; step++) {
        description += `**${getTranslation("commands", `tutorial.stepTitle`, interaction.locale, {
            step
        })}**\n➥ ~~*${getTranslation("commands", `tutorial.steps.${step}.description`, interaction.locale)}*~~ `;
        description += `\`/${getTranslation("commands", `tutorial.steps.${step}.command`, interaction.locale)}\`\n\n`
    }

    for (let step = user.tutorial; step <= 7; step++) {
        description += `**${getTranslation("commands", `tutorial.stepTitle`, interaction.locale, {
            step
        })}** ${getTranslation("commands", `tutorial.steps.${step}.description`, interaction.locale)} `;
        description += `\`/${getTranslation("commands", `tutorial.steps.${step}.command`, interaction.locale)}\`\n\n`
    }

    if (user.tutorial >= 7) {
        description += getTranslation("commands", "tutorial.completed", interaction.locale);
    }

    await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation("commands", "tutorial.title", interaction.locale),
                content: description
            })
        ]
    });
}