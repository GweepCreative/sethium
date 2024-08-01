import { StringSelectMenuInteraction } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import Item, { PopulatedItem } from "../models/Item";
import { isAdvancingAvailable } from "../helpers/work";
import rand from "../helpers/math/rand";
import createChefEmbed, { isAnyTableAvailable } from "../helpers/economy/chef";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";

export const name = 'chef';

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
            .populate('inventory.items.item')
            .populate('inventory.loots.loot').exec() as any as PopulatedUser;

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
            order
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

export async function order(interaction: StringSelectMenuInteraction, user: PopulatedUser) {
    try {
        const value = parseInt(interaction.values[0]);

        if (isNaN(value) || value < 0 || value > 7) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "chef.invalidOrder", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const order = user.chef.orders[value];

        if (!order) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "chef.invalidOrder", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const item = await Item.findOne({ id: order.order })
            .populate('recipe.items.item')
            .populate('recipe.loots.loot').exec() as any as PopulatedItem;

        if (!item) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "chef.invalidOrder", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const availableTable = isAnyTableAvailable(user);

        if (availableTable === null) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "global.error", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        let price = [] as [[number, number], number][]

        let variants = [] as [string, number][]

        for (const { variant, quantity } of item.recipe.variants) {
            const localVariants = user.inventory.loots.filter(({ loot }) => loot.variant === variant);

            const min: number[] = [];
            const max: number[] = [];

            let remaining = quantity;

            for (let localVariant of (localVariants || [])) {
                if (localVariant.amount >= remaining) {
                    min.concat(Array.from({ length: remaining }, () => localVariant.loot.minimumPrice));
                    max.concat(Array.from({ length: remaining }, () => localVariant.loot.maximumPrice));

                    remaining = 0;

                    break;
                }

                min.concat(Array.from({ length: localVariant.amount }, () => localVariant.loot.minimumPrice));
                max.concat(Array.from({ length: localVariant.amount }, () => localVariant.loot.maximumPrice));

                remaining -= localVariant.amount;
            }

            if (!localVariants.length || remaining > 0) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                                missingIngredients: `${remaining} ${variant}`
                            })
                        })
                    ],
                    ephemeral: true
                });
            } else {
                variants.push([variant, quantity]);
                const length = Math.min(min.length, quantity);

                const minPrice = min.reduce((a, b) => a + b / length, 0);
                const maxPrice = max.reduce((a, b) => a + b / length, 0);

                price.push([[minPrice, maxPrice], quantity]);
            }
        }

        let items = [] as [number, number][]

        for (const { item: recipeItem, quantity } of item.recipe.items) {
            const localItem = user.inventory.items.find(local => local.item?.id === recipeItem.id);

            if (!localItem || localItem.amount < quantity) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                                missingIngredients: `${quantity - (localItem?.amount || 0)} ${recipeItem.title}`
                            })
                        })
                    ],
                    ephemeral: true
                });
            } else {
                items.push([recipeItem.id, quantity]);
                price.push([[recipeItem.minimumPrice, recipeItem.maximumPrice], quantity]);
            }
        }

        let loots = [] as [number, number][]

        for (const { loot, quantity } of item.recipe.loots) {
            const localLoot = user.inventory.loots.find(local => local.loot?.id === loot.id);

            if (!localLoot || localLoot.amount < quantity) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "produce.missingIngredients", interaction.locale, {
                                missingIngredients: `${quantity - (localLoot?.amount || 0)} ${loot.title}`
                            })
                        })
                    ],
                    ephemeral: true
                });
            } else {
                loots.push([loot.id, quantity]);
                price.push([[loot.minimumPrice, loot.maximumPrice], quantity]);
            }
        }

        for (let [variant, amount] of variants) {
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
        }

        for (let [id, amount] of items) {
            while (amount > 0) {
                const item = user.inventory.items.find(item => item?.item?.id === id && item.amount > 0);

                if (!item) {
                    break;
                }

                if (item.amount > amount) {
                    item.amount -= amount;
                    amount = 0;
                } else {
                    amount -= item.amount;
                    item.amount = 0;
                }
            }
        }

        for (let [id, amount] of loots) {
            while (amount > 0) {
                const loot = user.inventory.loots.find(loot => loot?.loot?.id === id && loot.amount > 0);

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
        }

        user.inventory.loots = user.inventory.loots.filter(loot => loot.amount > 0);
        user.inventory.items = user.inventory.items.filter(item => item.amount > 0);

        user.workExperience = Math.max(user.workExperience || 0, 0) + 1;

        let sold = 0;

        for (let [[min, max], amount] of price) {
            sold += Math.abs(rand(min, max) * amount) * rand(1, 1.1);
        }

        user.wallet.seth = Math.max(user.wallet.seth || 0, 0) + sold;

        user.chef.orders[value].delivered = true;
        user.chef.orders[value].renewal = new Date(Date.now() + 1000 * 60 * 15);

        for (let table of user.chef.tables) {
            if (table.table > 0 && (table.firstChair > 0 || table.secondChair > 0)) {
                table.table = Math.max(table.table - 1, 0);
                if (table.firstChair > 0) {
                    table.firstChair = Math.max(table.firstChair - 1, 0);
                } else {
                    table.secondChair = Math.max(table.secondChair - 1, 0);
                }
                user.markModified('chef.tables');

                break;
            }
        }

        await increaseActionCount(interaction.client, user, "work");

        user.markModified('inventory.loots');
        user.markModified('inventory.items');
        user.markModified('chef.orders');
        user.markModified('wallet.seth');

        await isAdvancingAvailable(user as any, interaction.client);

        await user.save();

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await msg.edit(await createChefEmbed(interaction.client, user, interaction.locale));
        }

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "chef.sold", interaction.locale, {
                        price: sold.toFixed(2)
                    }),
                })
            ]
        });
    } catch (error) {
        console.log(error);

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }
}