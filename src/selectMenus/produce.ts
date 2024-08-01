import { StringSelectMenuInteraction } from "discord.js";
import User from "../models/User";
import Loot from "../models/Loot";
import { InferSchemaType } from "mongoose";
import Item from "../models/Item";
import { isAdvancingAvailable } from "../helpers/work";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";
import { VariantEmojis } from "../constants/emojis";

export const name = 'produce';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: StringSelectMenuInteraction) {
    try {

        const [_, subaction, id] = interaction.customId.split('.');

        if (id !== interaction.user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item');

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const actions = {
            produce
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.invalidAction", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await request(interaction, user);
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }
}

type PopulatedUser = Omit<InferSchemaType<typeof User.schema>, 'inventory'> & {
    inventory: {
        loots: {
            loot: InferSchemaType<typeof Loot.schema>;
            amount: number;
        }[];
        items: {
            item: InferSchemaType<typeof Item.schema>;
            amount: number;
        }[];
    }
}

async function produce(
    interaction: StringSelectMenuInteraction,
    user: PopulatedUser
) {
    try {

        if (!user.job || !user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noJob", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const itemID = parseInt(interaction.values[0]);

        if (isNaN(itemID)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidID", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const item = await Item.findOne({
            id: itemID
        })
            .populate('recipe.items.item')
            .populate('recipe.loots.loot')
            .exec();

        if (!item) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "produce.cannotFindItem", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (item.job !== user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "produce.cantProduce", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const variants = item.recipe.variants.reduce((acc, variant) => {
            acc[variant.variant] = (acc?.[variant.variant] || 0) + variant.quantity;
            return acc;
        }, {} as any) as {
            [key: string]: number
        };

        const userVariants = user.inventory.loots.reduce((acc, item) => {
            if (item?.loot?.variant) {
                acc[item?.loot?.variant] = (acc?.[item?.loot?.variant] || 0) + item.amount;
            }
            return acc;
        }, {} as any) as {
            [key: string]: number
        };

        let canProduce = Object.keys(variants).every(variant => {
            return userVariants?.[variant] >= variants?.[variant];
        });

        if (!canProduce) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                            missingIngredients: `\`${Object.entries(variants).map(
                                ([variant, quantity]) => `${VariantEmojis?.[variant]} ${variant}: ${quantity}`
                            ).join(', ')}\``
                        }),
                    })
                ],
                ephemeral: true
            });
        }

        const loots = item.recipe.loots.reduce((acc, recipeLoot) => {
            acc.push({
                title: (recipeLoot.loot as any).title,
                id: (recipeLoot.loot as any).id,
                amount: recipeLoot.quantity
            });
            return acc;
        }, [] as any) as {
            title: string;
            id: number;
            amount: number;
        }[];

        const userLoots = user.inventory.loots.reduce((acc, loot) => {
            acc[loot.loot.id] = (acc?.[loot.loot.id] || 0) + loot.amount;
            return acc;
        }, {} as any) as {
            [key: number]: number
        };

        canProduce = loots.every(loot => userLoots?.[loot.id] >= loot.amount);

        if (!canProduce) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                            missingIngredients: `\`${loots.map(
                                loot => `${
                                    user.inventory.loots.find(userLoot => userLoot.loot.id === loot.id)?.loot?.emoji || ''
                                } ${loot.id}: ${loot.amount}`
                            ).join(', ')}\``
                        }),
                    })
                ],
                ephemeral: true
            });
        }

        const items = item.recipe.items.reduce((acc, recipeItem) => {
            acc.push({
                id: recipeItem.id,
                amount: recipeItem.quantity
            });
            return acc;
        }, [] as any) as {
            id: number;
            amount: number;
        }[];

        const userItems = user.inventory.items.reduce((acc, item) => {
            acc[item.item.id] = (acc?.[item.item.id] || 0) + item.amount;
            return acc;
        }, {} as any) as {
            [key: number]: number
        };

        canProduce = items.every(item => userItems?.[item.id] >= item.amount);

        if (!canProduce) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                            missingIngredients: `\`${items.map(
                                item => `${
                                    user.inventory.items.find(userItem => userItem.item.id === item.id)?.item?.emoji || ''
                                } ${item.id}: ${item.amount}`
                            ).join(', ')}\``
                        }),
                    })
                ],
                ephemeral: true
            });
        }

        items.forEach(item => {
            const userItem = user.inventory.items.find(userItem => userItem.item.id === item.id);

            if (userItem) {
                userItem.amount -= item.amount;
            }
        });

        user.inventory.items = user.inventory.items.filter(userItem => userItem.amount > 0);

        // Reduce variants from user's inventory
        Object.entries(variants).forEach(([variant, amount]) => {
            while (amount > 0) {
                const loot = user.inventory.loots.find(loot => loot?.loot?.variant === variant && loot.amount > 0);

                if (!loot) {
                    break;
                }

                if (loot.amount > amount) {
                    loot.amount -= amount;
                    amount = 0;
                } else {
                    amount -= loot.amount;
                    loot.amount = 0;
                }
            }
        });

        user.inventory.loots = user.inventory.loots.filter(loot => loot.amount > 0);

        const producedItem = user.inventory.items.find(userItem => userItem.item.id === item.id);
        let amount = 1;
        if (producedItem) {
            producedItem.amount++;
            amount = producedItem.amount;
        } else {
            user.inventory.items.push({
                item: item,
                amount: 1
            });
            amount = 1;
        }

        await increaseActionCount(interaction.client, user as any, "work");

        user.workExperience = Math.max(user.workExperience || 0, 0) + 1;

        await isAdvancingAvailable(user as any, interaction.client);

        await (user as any).save();


        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "produce.produced", interaction.locale, {
                        amount,
                        itemTitle: item.title
                    }).replace('$itemEmoji', item.emoji || ''),
                })
            ],
            ephemeral: true
        });

    } catch (e) {
        console.log(e);
        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.error", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        } catch (e) { }
    }
}
