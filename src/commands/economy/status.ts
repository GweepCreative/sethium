import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import { calculateCurrentJobDuration, calculateCurrentJobPath } from "../../helpers/job";
import Job from "../../models/Job";
import getTranslation from "../../helpers/i18n";
import { JobEmojis } from "../../constants/emojis";

export const data = new SlashCommandBuilder()
    .setName('status')
    .setNameLocalization('tr', 'durum')
    .setDescriptionLocalization('tr', 'Mesleğinizin durumunu gösterir')
    .setDescription('Shows your job status');

export const timeout = 15000;

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

    const embed = interaction.client.embedManager.Info({
        title: getTranslation('commands', 'status.title', interaction.locale),
        content: ''
    });

    if (!user.job || !user.job.name) {
        return await interaction.reply({
            embeds: [embed.setDescription(getTranslation('errors', 'account.noJob', interaction.locale))]
        });
    }

    const duration = await calculateCurrentJobDuration(user.job);

    let canAdvance = false;

    if (user.canAdvance) {
        const nextJob = await Job.findOne({ parent: user.job.name });

        if (nextJob) {
            canAdvance = true;
        }
    }

    const upgrade = new ButtonBuilder()
        .setCustomId(`job.upgrade.${interaction.user.id}`)
        .setLabel(getTranslation('global', 'upgrade', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAdvance);

    const path = await calculateCurrentJobPath(user.job);

    return await interaction.reply({
        embeds: [
            embed
                .setDescription(null)
                .setFields([
                    {
                        name: getTranslation('global', 'job', interaction.locale),
                        value: `${JobEmojis[user.job.name as keyof typeof JobEmojis] || "👷"
                            } ${String(user.job?.name || "N/A")}`
                    },
                    {
                        name: getTranslation('global', 'wxp', interaction.locale),
                        value: `**${user.workExperience.toString()}**/${duration || "N/A"}`
                    },
                    {
                        name: getTranslation('global', 'achivements', interaction.locale),
                        value: path.join('/'),
                    }
                ])
        ],
        components: [
            new ActionRowBuilder().addComponents(upgrade) as any
        ]
    })
}