import { ButtonInteraction } from "discord.js";
import User from "../models/User";
import Job from "../models/Job";
import { calculateCurrentJobDuration } from "../helpers/job";
import getTranslation from "../helpers/i18n";
import { JobEmojis } from "../constants/emojis";
import { SHOP_TOOLS, TOOL_IDS } from "../constants/shop";

export default async function JobUpgrade(interaction: ButtonInteraction) {
    try {
        let [id]: any[] = interaction.customId.split("job.upgrade.")?.[1].split(".");

        if (id !== interaction.user.id) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.noAccount", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        if (!user.job || !user.job.name) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.noJob", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        const nextJob = await Job.findOne({
            parent: user.job.name
        });

        if (!nextJob) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.noNextJob", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        if (!user.canAdvance) {
            const duration = await calculateCurrentJobDuration(user.job);

            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "job.innuficientWorkExperience", interaction.locale, {
                                work: duration
                            })
                        })
                    ],
                    ephemeral: true
                });

            return;
        };

        const item = ({
            "Balıkçı": TOOL_IDS.fishingRod,
            "Madenci": TOOL_IDS.pickaxe,
            "Oduncu": TOOL_IDS.axe
        })?.[nextJob.name as string];

        const inventoryItem = user.inventory.shopItems.find(i => i.id === item);

        if (!inventoryItem) {
            user.inventory.shopItems.push({
                id: item,
                durability: SHOP_TOOLS.find(t => t.id === item)?.durability || 100,
                amount: 1
            });
            user.markModified('inventory.shopItems');
        }

        const tool = SHOP_TOOLS.find(t => t.id === item);

        const jobEmoji = JobEmojis[nextJob.name as string];

        user.job = nextJob;
        user.canAdvance = false;
        user.workExperience = 0;
        user.actionCounts.work = 0;
        user.markModified('job');
        user.markModified('actionCounts');

        await user.save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "job.selected", interaction.locale, {
                        job: nextJob.name || 'N/A',
                        toolName: tool?.name?.[interaction.locale === 'tr' ? 'tr' : 'en-US'] || 'N/A'
                    }).replace('$job', jobEmoji).replace('$tool', tool?.emojis?.constant || '🛠️')
                })
            ],
            ephemeral: true
        });

    } catch (e) {
        console.log(e);
    }
}