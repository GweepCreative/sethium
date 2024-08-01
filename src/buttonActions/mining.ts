import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import User from "../models/User";
import Loot from "../models/Loot";
import { createRows, isAdvancingAvailable } from "../helpers/work";
import { PopulatedUser } from "../models/User";
import { Colors } from "../helpers/embed";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";

export default async function Mining(interaction: ButtonInteraction) {
    try {

        let [id, i]: any[] = interaction.customId.split("mining.")?.[1].split(".");

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

        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.items.item')
            .populate('inventory.loots.loot')
            .exec();

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

        if (!user.job || !user.job.name) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.nojob", interaction.locale)
                        })
                    ], ephemeral: true
                });

            return;
        }

        if (user.job.name !== "Madenci") {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.notYourJob", interaction.locale, { job: "Madenci" })
                        })
                    ], ephemeral: true
                });

            return;
        }

        const ores = await Loot.find({ job: user.job.name });
        const ore = ores[Math.floor(Math.random() * ores.length)];

        const buttons = interaction.message.components.map(row => row.components.map(
            (button: any) => new ButtonBuilder()
                .setCustomId(button.customId)
                .setEmoji(button.emoji)
                .setStyle(button.style)
                .setDisabled(true)
        )).flat()

        i = Math.max(0, Math.min(parseInt(i) ?? 0, 9))

        buttons[i] = buttons[i].setStyle(ButtonStyle.Primary).setEmoji(ore.emoji);

        const userLootIndex = (user as unknown as PopulatedUser).inventory.loots.findIndex((l) => l.loot.title === ore.title);

        if (userLootIndex === -1) {
            user.inventory.loots.push({
                loot: ore,
                amount: 1
            });
        } else {
            user.inventory.loots[userLootIndex].amount++;
        }

        user.markModified(`inventory.loots.${(
            userLootIndex === -1
                ? user.inventory.loots.length - 1
                : userLootIndex
        )}`);

        await increaseActionCount(interaction.client, user as any, "work");

        user.workExperience = Math.max(user.workExperience || 0, 0) + 1;

        await isAdvancingAvailable(user, interaction.client);

        await user.save();

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await interaction.deferUpdate();
            await interaction.message.edit({
                embeds: [
                    {
                        ...interaction.message.embeds[0],
                        description: getTranslation("commands", "mining.youFound", interaction.locale)
                            .replace("$ore", `${ore.emoji} **${ore.title}**`),
                        color: Colors.Success
                    }
                ],
                components: createRows(buttons) as any,
            });
        }
    } catch (error) {
        console.log(`Error executing ${interaction.customId}`, error);
        try {
            await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.error", interaction.locale)
                    })
                ], ephemeral: true
            });
        } catch (e) { }
    }
}