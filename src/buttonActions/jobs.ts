import { ButtonInteraction } from "discord.js";
import User from "../models/User";
import Job from "../models/Job";
import getTranslation from "../helpers/i18n";
import { SHOP_TOOLS, TOOL_IDS } from "../constants/shop";
import { JobEmojis } from "../constants/emojis";

export default async function Jobs(interaction: ButtonInteraction) {
    try {
        let [id, jobName]: any[] = interaction.customId.split("jobs.confirm.")?.[1].split(".");

        if (id !== interaction.user.id) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                        })
                    ], ephemeral: true
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
                    ], ephemeral: true
                });

            return;
        }

        if (user.job && user.job.name) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "job.alreadyHasJob", interaction.locale)
                        })
                    ], ephemeral: true
                });

            return;
        }

        const job = await Job.findOne({
            name: jobName
        });

        if (!job) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "job.jobNotFound", interaction.locale)
                        })
                    ], ephemeral: true
                });

            return;
        }

        user.job = job;

        const item = ({
            "Balıkçı": TOOL_IDS.fishingRod,
            "Madenci": TOOL_IDS.pickaxe,
            "Oduncu": TOOL_IDS.axe
        })?.[job.name as string];

        const inventoryItem = user.inventory.shopItems.find(i => i.id === item);

        if (!inventoryItem) {
            user.inventory.shopItems.push({
                id: item,
                durability: SHOP_TOOLS.find(t => t.id === item)?.durability || 100,
                amount: 1
            });
            user.markModified('inventory.shopItems');
        }

        if (user.tutorial === 1) {
            user.tutorial = 2;
        }

        await user.save();

        const tool = SHOP_TOOLS.find(t => t.id === item);

        const jobEmoji = JobEmojis[job.name as string];

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "job.selected", interaction.locale, {
                        job: job.name || 'N/A',
                        toolName: tool?.name?.[interaction.locale === 'tr' ? 'tr' : 'en-US'] || 'N/A'
                    }).replace('$tool', tool?.emojis.constant).replace('$job', jobEmoji)
                })
            ],
            ephemeral: true
        });

    } catch (e) {
        console.log(e);
    }
}