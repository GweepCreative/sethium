import { ActionRowBuilder, ChatInputCommandInteraction, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import User from "../../models/User";
import Job from "../../models/Job";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('jobs')
    .setNameLocalization('tr', 'meslekler')
    .setDescriptionLocalization('tr', 'Size en uygun olan işi seçin!')
    .setDescription('Choose the one job that suits you best!');

export const shouldRegister = true;

const emojis = {
    "Madenci": "<:madenci:1226425260539383828>",
    "Oduncu": "<:oduncu:1226425297877073950>",
    "Balıkçı": "<:balikci:1226425286250463232>"
} as any;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id });

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.noAccount", interaction.locale)
                })
            ]
        });
    }

    if (user.job && user.job.name) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "job.alreadyHasJob", interaction.locale)
                })
            ]
        });
    }
 
    const jobs = await Job.find({ parent: "" });

    const embed = interaction.client.embedManager.Info({
        title: getTranslation("commands", "jobs.title", interaction.locale),
        content: getTranslation("commands", "jobs.description", interaction.locale),
    });

    const select = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`jobs.select.${interaction.user.id}`)
                .setPlaceholder(getTranslation("commands", "jobs.select", interaction.locale))
                .setOptions(jobs.map((job: any) => ({
                    label: job.name,
                    value: job.name,
                    emoji: emojis[job.name] || null
                })) as any)
        ) as any;

    return await interaction.reply({
        embeds: [embed],
        components: [select],
    });

}