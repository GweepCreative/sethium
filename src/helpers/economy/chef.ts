import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { PopulatedUser } from "../../models/User";
import { chefShopRequirements, chefShopRequirementsIDs, mealKeys, mealNames, meals } from "../../constants/chef";
import Item from "../../models/Item";
import { ToolsEmojis, chef } from "../../constants/emojis";
import getTranslation from "../i18n";
import { TOOL_IDS } from "../../constants/shop";

export default async function createChefEmbed(client: Client, user: PopulatedUser, locale: string) {
    let availableTable = isAnyTableAvailable(user);

    let isTablesModified = false;

    if (!user.chef.shop) {
        const reqs = Object.entries(chefShopRequirements);

        for (const [id, amount] of reqs) {
            const inventory = user.inventory.items.find(item => item.item.id == Number(id));

            if (!inventory) continue;

            const inventoryAmount = inventory?.amount || 0;

            if (inventoryAmount < amount) {
                const item = await Item.findOne({ id: Number(id) });
                return {
                    content: getTranslation("errors", "chef.missingIngredients", locale, {
                        amount: amount,
                        item: (item?.title || 'N/A')
                    }).replace('$itemEmoji', item?.emoji || '')
                };
            }

            inventory.amount -= amount;
        }

        user.chef.tables = new Array(4).fill({
            table: 10,
            firstChair: 3,
            secondChair: 3
        }) as any;

        user.chef.shop = true;

        user.markModified('inventory.items');
        user.markModified('chef.shop');
        user.markModified('chef.tables');

        await user.save();
    }

    const brokes = brokeCounts(user);

    if (brokes.tables > 0) {
        const tables = user.inventory.items.find(item => item.item.id == chefShopRequirementsIDs.table);

        if (!tables || tables.amount < 1) {
            if (availableTable === null) {
                return {
                    content: getTranslation('errors', 'chef.missingTables', locale, {
                        amount: 1
                    })
                };
            }
        } else {
            let amount = Math.max(brokes.tables, 1);

            tables.amount -= amount;

            for (let table of user.chef.tables) {
                if (amount-- <= 0) break;
                if (table.table <= 0) {
                    table.table = 10;
                    isTablesModified = true;
                }
            }
        }
    }

    availableTable = isAnyTableAvailable(user);

    if (brokes.chairs > 0) {
        const chairs = user.inventory.items.find(item => item.item.id == chefShopRequirementsIDs.chair);

        if (!chairs || chairs.amount < 1) {
            if (availableTable === null) {
                return {
                    content: getTranslation('errors', 'chef.missingChairs', locale, {
                        amount: 1
                    })
                };
            }
        } else {
            let amount = Math.max(brokes.chairs, 1);

            chairs.amount -= amount;

            for (let table of user.chef.tables) {
                if (amount-- <= 0) break;
                if (table.firstChair <= 0) {
                    table.firstChair = 3;
                    isTablesModified = true;
                }
                if (table.secondChair <= 0) {
                    table.secondChair = 3;
                    isTablesModified = true;
                }
            }
        }
    }

    user.inventory.items = user.inventory.items.filter(item => item.amount > 0) as any;

    if (isTablesModified) {
        user.markModified('inventory.items');
        user.markModified('chef.tables');

        await user.save();
    }

    const spoon = user.inventory.shopItems.find(item => item.id === TOOL_IDS.spoon);

    if (!spoon) {
        return {
            embeds: [
                client.embedManager.Error({
                    content: getTranslation('errors', 'job.youNeedToUse', locale, {
                        item: getTranslation('global', 'spoon', locale)
                    }).replace('$itemEmoji', ToolsEmojis.spoon)
                })
            ]
        };
    }

    const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.spoon && item.durability === spoon.durability);

    if (!spoon.durability) {
        user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
    } else {
        spoon.durability -= 1;

        if (spoon.durability <= 0) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        }
    }

    user.markModified('inventory.shopItems');
    await (user as any).save();

    const totalAvailableChairsCount = totalAvailableChairs(user);

    let reservedLength = user.chef.orders.length;

    user.chef.orders = user.chef.orders.filter(order => !(order.delivered && Date.now() > new Date(order.renewal).getTime())).slice(-8) as any || [];
    if (user.chef.orders.length < totalAvailableChairsCount) {
        const currentMeals = new Set(user.chef.orders.map(order => order.order));

        const countOfMissingMeals = totalAvailableChairsCount - user.chef.orders.length;

        for (let i = 0; i < countOfMissingMeals; i++) {
            const missingMeals = meals.filter(meal => !currentMeals.has(meal));

            const order = missingMeals.length > 0
                ? missingMeals[Math.floor(Math.random() * missingMeals.length)]
                : meals[Math.floor(Math.random() * meals.length)];

            user.chef.orders.push({
                order,
                id: ++user.chef.lastOrderID,
                renewal: Date.now()
            });

            currentMeals.add(order);
        }

        user.markModified('chef.orders');

        await user.save();
    } else if (reservedLength !== user.chef.orders.length) {
        user.markModified('chef.orders');

        await user.save();
    }

    const fields = [];
    const selections: [{
        id: number;
        renewal: Date;
        order: number;
        delivered: boolean;
    }, number][] = [];

    let i = 0;
    for (const order of user.chef.orders) {
        const isUsable = isTableUsable(user, i++);

        if (!isUsable) {
            fields.push({
                name: getTranslation("commands", "chef.notUsable", locale),
                value: getTranslation("global", "orderNotAvailable", locale),
                inline: true
            })

            continue;
        }

        if (!order.delivered)
            selections.push([user.chef.orders[i - 1], i - 1])

        fields.push({
            name: (
                order.delivered
                    ? getTranslation("global", "newOrder", locale)
                    : `${getTranslation("global", "order", locale)} #${order.id}`
            ),
            value: (
                order.delivered
                    ? getTranslation("global", "availableAt", locale, {
                        time: Math.floor(new Date(order.renewal).getTime() / 1000)
                    })
                    : `${chef.meals[mealKeys[order.order]]} ${mealNames?.[order.order]?.[locale as any]}`
            ),
            inline: true
        });
    }

    const orderSelection = new StringSelectMenuBuilder()
        .setCustomId(`chef.order.${user.id}`)
        .setPlaceholder(getTranslation("global", "order", locale))
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(selections.map(([order, i]) => ({
            value: String(i),
            label: `${getTranslation("global", "order", locale)} #${order.id} - ${mealNames?.[order.order]?.[locale as any]}`,
            emoji: chef.meals[mealKeys[order.order]]
        })))

    const tablesButton = new ButtonBuilder()
        .setCustomId(`chef.tables.${user.id}`)
        .setLabel(getTranslation("global", "tables", locale))
        .setStyle(ButtonStyle.Primary);


    const recipesButton = new ButtonBuilder()
        .setCustomId(`recipes.${user.id}`)
        .setLabel(getTranslation('global', 'recipes', user.language))
        .setStyle(ButtonStyle.Secondary);


    return {
        embeds: [
            client.embedManager.Info({
                title: getTranslation("commands", "chef.title", locale),
                fields
            })
        ],
        components: [
            ...(
                selections.length > 0
                    ? [new ActionRowBuilder().addComponents(
                        orderSelection
                    ) as any]
                    : []
            ),
            new ActionRowBuilder().addComponents(
                tablesButton, recipesButton
            ) as any

        ]

    };
}

export function isAnyTableAvailable(user: PopulatedUser): null | number {
    let result = null, i = 0;

    for (const table of user.chef.tables) {
        if (table.table > 0 && (table.firstChair > 0 || table.secondChair > 0)) {
            result = i;
            break;
        }
        i++;
    }

    return result;
}

export function totalAvailableChairs(user: PopulatedUser): number {
    let chairs = 0;

    for (const chair of user.chef.tables) {
        if (chair.table <= 0) continue;
        if (chair.firstChair > 0) chairs++;
        if (chair.secondChair > 0) chairs++;
    }

    return chairs;
}

export function brokeCounts(user: PopulatedUser): {
    tables: number;
    chairs: number;
} {
    let broke = {
        tables: 0,
        chairs: 0
    };

    for (const table of user.chef.tables) {
        if (table.table <= 0) broke.tables++;
        if (table.firstChair <= 0) broke.chairs++;
        if (table.secondChair <= 0) broke.chairs++;
    }

    return broke;
}

export function isTableUsable(user: PopulatedUser, seat: number): boolean {
    const table = user.chef.tables[Math.floor(seat / 2)];

    return table && table.table > 0 && (
        [table.firstChair, table.secondChair][seat % 2] > 0
    )
}