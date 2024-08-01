import { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, Locale } from "discord.js";
import User from "../../models/User";
import Loot from "../../models/Loot";
import Item from "../../models/Item";
import { PopulatedUser } from "../../models/User";
import { IItem, IShopItem, SHOP_ITEMS, TOOL_IDS } from "../../constants/shop";
import { Client } from "discord.js";
import getTranslation from "../i18n";
import { InventoryCategories, JobEquipments } from "../../constants/inventory";

type LocaledString = {
    [key: string]: string;
}

interface Category {
    label: LocaledString,
    value: string,
    description: LocaledString,
    emoji: string
    disabled?: true
}

export const categories = {
    'loot': {
        label: {
            "en-US": getTranslation('commands', 'inventory.loots', "en"),
            "en-GB": getTranslation('commands', 'inventory.loots', "en"),
            "tr": getTranslation('commands', 'inventory.loots', "tr")
        },
        value: "loot",
        description: {
            "en-US": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "loot"
            }),
            "en-GB": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "loot"
            }),
            "tr": getTranslation('commands', 'inventory.viewYour', "tr", {
                category: "Ganimet"
            })
        },
        emoji: '1211712672194629692'
    },
    'item': {
        label: {
            "en-US": getTranslation('commands', 'inventory.items', "en"),
            "en-GB": getTranslation('commands', 'inventory.items', "en"),
            "tr": getTranslation('commands', 'inventory.items', "tr")
        },
        value: "item",
        description: {
            "en-US": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "items"
            }),
            "en-GB": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "items"
            }),
            "tr": getTranslation('commands', 'inventory.viewYour', "tr", {
                category: "Eşyalar"
            })
        },
        emoji: '1197197780809158806'
    },
    /* 'tool': {
        label: {
            "en-US": getTranslation('commands', 'inventory.tools', "en"),
            "en-GB": getTranslation('commands', 'inventory.tools', "en"),
            "tr": getTranslation('commands', 'inventory.tools', "tr")
        },
        value: "tool",
        description: {
            "en-US": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "tools"
            }),
            "en-GB": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "tools"
            }),
            "tr": getTranslation('commands', 'inventory.viewYour', "tr", {
                category: "Araçlar"
            })
        },
        emoji: '1141368704152633397'
    }, */
    'shopItems': {
        label: {
            "en-US": getTranslation('commands', 'inventory.shopItems', "en"),
            "en-GB": getTranslation('commands', 'inventory.shopItems', "en"),
            "tr": getTranslation('commands', 'inventory.shopItems', "tr")
        },
        value: "shopItems",
        description: {
            "en-US": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "shop items"
            }),
            "en-GB": getTranslation('commands', 'inventory.viewYour', "en", {
                category: "shop items"
            }),
            "tr": getTranslation('commands', 'inventory.viewYour', "tr", {
                category: "Market eşyaları"
            })
        },
        emoji: '1141368704152633397'
    }
} as {
    [key: string]: Category
}

type Pages = 'main' | keyof typeof categories;


interface Options {
    language: Locale;
}

interface UserData {
    id: string;
    username: string;
    avatar: string;
}

export default async function renderInventoryEmbed(client: Client, userData: UserData, page: Pages = 'main', options?: Partial<Options>) {

    const user = await User.findOne({ id: userData.id })
        .populate('inventory.items.item')
        .populate('inventory.loots.loot')
        .exec() as unknown as PopulatedUser;

    const embed = client.embedManager.Info({
        title: getTranslation('commands', 'inventory.title', options?.language || 'tr'),
        content: ''
    }).setFooter({
        text: userData.username,
        iconURL: userData.avatar
    })
    if (!user) {
        return embed.setDescription(
            getTranslation('errors', 'account.noAccount', options?.language || 'tr')
        );
    }

    if (user.tutorial === 3) {
        user.tutorial = 4;
        await user.save();
    }

    const lang = options?.language === 'tr' ? 'tr' : 'en';
    let description = '';

    for (let Category of InventoryCategories) {
        if (Category?.job && user.job?.name !== Category?.job) continue;


        if (Category.type === 'equipment' && user.job) {
            if (user.job.name !== 'Demirci') {

                const equipments = user.inventory.shopItems.map((item: any) => {
                    item.item = SHOP_ITEMS.find(i => i.id === item.id);
                    return item as {
                        item: IItem<'tool'>;
                        amount: number;
                        id: number;
                        durability?: number;
                    };
                });

                const equipmentID = TOOL_IDS?.[(
                    JobEquipments?.[user.job?.name as string || '']
                ) as any];

                const equipmentIdx = equipments.findIndex((item) => item?.id === equipmentID);
                const equipment = equipments[equipmentIdx]

                if (equipment) {
                    description += `**${Category.name[lang]}**\n`;
                    description += `${equipment.item.emojis.constant} **${equipment.item.name[lang === 'tr' ? 'tr' : 'en-US']}** [${equipment.durability
                        }/${equipment.item.durability
                        }]\n`;
                }
            } else {
                const anvil = user.inventory.items.find(item => item.item.id == 24);

                if (anvil) {
                    description += `**${Category.name[lang]}**\n`;
                    description += `${anvil.item.emoji} **${anvil.item.title}** [${anvil.durability}/${30}]\n`;
                }
            }
        } else {
            description += `**${Category.name[lang]}**\n`;
        }


        const searchSpace = (
            Category.type === 'loot'
                ? user.inventory.loots
                : Category.type === 'item'
                    ? user.inventory.items
                    : Category.type === 'shopItems'
                        ? user.inventory.shopItems.map((item: any) => ({
                            item: SHOP_ITEMS.find(i => i.id === item.id),
                            amount: item.amount
                        }))
                        : []
        )

        if (Category?.variant) {
            const filtered = searchSpace.filter((item: any) => item?.[
                Category.type === 'loot' ? 'loot' : 'item'
            ]?.variant === Category.variant);
            if (filtered.length) {
                const items = filtered.map((item: any) => `${item?.[
                    Category.type === 'loot' ? 'loot' : 'item'
                ]?.emoji} \`${item.amount}\``).join(' ');
                description += items
            }
        }

        if (Category?.items) {
            const filtered = searchSpace.filter((item: any) => Category.items?.includes(item?.[
                Category.type === 'loot' ? 'loot' : 'item'
            ]?.id));
            if (filtered.length) {
                const items = filtered.map((item: any) => `${(
                    item?.[
                        Category.type === 'loot' ? 'loot' : 'item'
                    ]?.emoji || item?.item?.emojis?.constant
                )} \`${item.amount}\``).join(' ');
                description += items
            }
        }

        description += '\n';
    }

    /*  if (page === 'main') {
         return embed.setDescription(getTranslation('commands', 'inventory.selectToView', options?.language || 'tr'));
     }
 
     if (page === 'loot') {
         if (!user.job) {
             return embed.setDescription(getTranslation('account', 'account.noJob', options?.language || 'tr'));
         }
 
     const loots = user.inventory.loots.filter((loot: any) => loot.amount > 0/*  && loot.loot.job === user.job?.name *\/);
 
         const fetchList = loots?.map((l: any) => l.loot._id);
 
         const lootsData = await Loot.find({ _id: { $in: fetchList } });
 
         loots.forEach((loot: any, index) => {
             const l = lootsData.find((l: any) => l._id.toString() === loot.loot._id.toString());
             if (l) {
                 loots[index].loot = l;
             }
         });
 
         if (!loots.length) {
             return embed.setDescription(getTranslation('account', 'account.noLoot', options?.language || 'tr'));
         }
 
         const lootItems = loots.map(loot => `${loot.loot.emoji} \`${loot.amount}\``).join(' ');
 
         return embed.setDescription(lootItems);
     }
 
     if (page === 'item') {
         if (!user.job) {
             return embed.setDescription(getTranslation('account', 'account.noJob', options?.language || 'tr')); 
         }
 
         const items = (user as unknown as PopulatedUser).inventory.items.filter(item => item.amount > 0/*  && loot.loot.job === user.job?.name *\/);
 
         const fetchList = items?.map((item: any) => item.item._id);
 
         const itemsData = await Item.find({ _id: { $in: fetchList } });
 
         items.forEach((item: any, index) => {
             const i = itemsData.find((i: any) => i._id.toString() === item.item._id.toString());
             if (i) {
                 items[index].item = i;
             }
         });
 
         if (!items.length) {
             return embed.setDescription(getTranslation('account', 'account.noLoot', options?.language || 'tr'));
         }
 
         const itemItems = items.map(item => `${item.item.emoji} \`${item.amount}\``).join(' ');
 
         return embed.setDescription(itemItems);
     }
 
     if (page === 'shopItems') {
         if (!user.job) {
             return embed.setDescription(getTranslation('account', 'account.noJob', options?.language || 'tr'));
         }
 
         const items: {
             item: IShopItem,
             amount: number
         }[] = [];
 
         for (const item of user.inventory.shopItems) {
             if (item.amount <= 0) continue;
 
             const result = SHOP_ITEMS.find(i => i.id === item.id);
 
             if (result) {
                 items.push({
                     item: result,
                     amount: item.amount
                 });
             }
         }
 
         if (!items.length) {
             return embed.setDescription(getTranslation('account', 'account.noLoot', options?.language || 'tr'));
         }
 
         const itemItems = items.map(({ item, amount }) => ` ${item.emojis.constant} \`${amount}\``).join(' ');
 
         return embed.setDescription(itemItems);
     } */

    return embed.setDescription(String(description));
}

export function generateInventoryCategories(language: Locale = Locale.Turkish, id: string, selected?: string) {
    return new StringSelectMenuBuilder()
        .setCustomId(`inventory.category.${id}`)
        .setPlaceholder(
            getTranslation('commands', 'inventory.select', language)
        )
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(
            Object.values(categories).map((category: any) => new StringSelectMenuOptionBuilder({
                label: category?.[language] || category.label.tr,
                value: category.value,
                description: category?.[language] || category.description.tr,
                emoji: category.emoji,
                default: category.value === selected,
            }))
        )
}