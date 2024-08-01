import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User from "../models/User";
import { InferSchemaType } from "mongoose";
import Log from "../models/Log";
import { ChefEmojis, seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";
import Item, { PopulatedItem } from "../models/Item";
import { recipeToHumanReadable } from "../helpers/general/recipe";

export default async function Recipes(interaction: ButtonInteraction) {
    try {
        const [_, userID] = interaction.customId.split(".");

        if (userID !== interaction.user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                    })
                ], ephemeral: true
            });
        }

        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ], ephemeral: true
            });
        }

        if (!user.job || !user.job.parent) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "job.noJob", interaction.locale)
                    })
                ], ephemeral: true
            });
        }

        const items = await Item.find({ "job": user.job.name })
            .populate("recipe.loots.loot")
            .populate("recipe.items.item").exec() as any as PopulatedItem[];

        let description = '';

        if (items.length === 0) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "recipes.noRecipes", interaction.locale)
                    })
                ], ephemeral: true
            });
        }

        for (const item of items) {
            description += `${item.emoji} **${item.title}**\n`;
            description += `${recipeToHumanReadable(item.recipe, interaction.locale)}\n\n`;
        }

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: getTranslation("commands", "recipes.title", interaction.locale),
                    content: description
                })
            ]
        });
    } catch (error) {
        console.error(error);
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "global.error", interaction.locale)
                })
            ], ephemeral: true
        });
    }
}