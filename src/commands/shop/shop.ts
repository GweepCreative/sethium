import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import { JobEmojis, seth } from "../../constants/emojis";
import { IItem, PARTNERSHIP_ROSE, SHOP_ITEMS } from "../../constants/shop";
import Log from "../../models/Log";
import rand from "../../helpers/math/rand";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setNameLocalization('tr', 'market')
    .setDescriptionLocalization('tr', 'Bot içi marketi açar')
    .setDescription('Open the in-bot market')
    .addSubcommand(
        subcommand => subcommand
            .setName('list')
            .setNameLocalization('tr', 'liste')
            .setDescription('List all items in the shop')
            .setDescriptionLocalization('tr', 'Marketteki tüm eşyaları listeler')
    )
    .addSubcommand(
        subcommand => subcommand
            .setName('buy')
            .setNameLocalization('tr', 'satın-al')
            .setDescription('Buy an item from the shop')
            .setDescriptionLocalization('tr', 'Marketten bir eşya satın alır')
            .addStringOption(option => option
                .setName('item')
                .setNameLocalization('tr', 'esya')
                .setDescription('The name of the item you want to buy')
                .setDescriptionLocalization('tr', 'Satın almak istediğiniz eşyanın ID\'si')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addNumberOption(option => option
                .setName('amount')
                .setNameLocalization('tr', 'miktar')
                .setDescription('The amount of the item you want to buy')
                .setDescriptionLocalization('tr', ' Satın almak istediğiniz eşyanın miktarı')
                .setMinValue(1)
                .setRequired(false)
            )
    )

export const shouldRegister = true;


export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item').exec() as any as PopulatedUser;

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ]
            });
        }

        if (!user.job || !user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noJob", interaction.locale)
                    })
                ]
            });
        }

        const subcommand = interaction.options.getSubcommand();

        const subcommands = {
            list: {
                execute: list,
                names: ['list', 'liste']
            },
            buy: {
                execute: buy,
                names: ['buy', 'satin-al']
            }
        } as {
            [key: string]: {
                execute: (interaction: ChatInputCommandInteraction, user: PopulatedUser) => Promise<any>;
                names: string[];
            };
        };

        const request = Object.values(subcommands).find(
            request => request.names.includes(subcommand)
        );

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidSubcommand", interaction.locale)
                    })
                ]
            });
        }

        return await request.execute(interaction, user);
    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (!['buy', 'satin-al', 'use', 'kullan'].includes(subcommand)) {
        return await interaction.respond([]);
    }

    const value = interaction.options.getString('item') ?? interaction.options.getString('esya') ?? '';

    const items = [];

    if (PARTNERSHIP_ROSE.name[interaction.locale].startsWith(value) && ['use', 'kullan'].includes(subcommand)) {
        items.push({
            name: PARTNERSHIP_ROSE.name[interaction.locale === "tr" ? "tr" : "en-US"],
            value: String(PARTNERSHIP_ROSE.id),
        });
    }

    for (const item of SHOP_ITEMS) {
        if (items.length > 25) {
            break;
        }

        if (item.name[interaction.locale].startsWith(value)) {
            items.push({
                name: item.name[interaction.locale === "tr" ? "tr" : "en-US"],
                value: String(item.id)
            });
        }
    }

    return await interaction.respond(items);
}

export async function list(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const fields = [];
    const localNumber = new Intl.NumberFormat(interaction.locale);

    for (const item of SHOP_ITEMS.slice(0, 25)) {
        fields.push({
            name: `${item.emojis.constant} ${item.name[interaction.locale]}`,
            value: `**${getTranslation("global", "price", interaction.locale)}:** ${seth} ${localNumber.format(item.price)}`,
            inline: true
        })
    }


    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation("commands", "shop.shop", interaction.locale),
                fields
            })
        ]
    });
}

async function buy(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    try {
        const itemID = parseInt(interaction.options.getString('item') ?? interaction.options.getString('esya') ?? '0');

        if (!itemID || itemID < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidItem", interaction.locale)
                    })
                ]
            });
        }

        const item = SHOP_ITEMS.find(i => i.id === itemID) as IItem<'tool'>;

        if (!item) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidItem", interaction.locale)
                    })
                ]
            });
        }
        
        // TODO: Check if the user has already bought the item

        //console.log(item.type);
        if (item.type === 'tool') {

            //console.log(user.job?.name, item.job);
            if (!user.job || item?.job !== user.job?.name) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "shop.invalidJob", interaction.locale, {
                                job: item.job
                            }).replace('$emoji', JobEmojis[item.job] ?? '')
                        })
                    ]
                });
            }

            const totalAmount = user.inventory.shopItems.find(i => i.id === item.id && i.amount > 0)?.amount ?? 0;
            
            //console.log(totalAmount);
            if (totalAmount > 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "shop.alreadyBought", interaction.locale)
                        })
                    ]
                });
            }
        }

        const amount = parseInt((interaction.options.getNumber('amount') ?? interaction.options.getNumber('miktar') ?? 1) as any);

        if (isNaN(amount) || amount < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                    })
                ]
            });
        }

        const price = item.price * amount;

        const NumberFormat = new Intl.NumberFormat(interaction.locale);

        if (user.wallet.seth < price) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.notEnoughMoney", interaction.locale, {
                            price: NumberFormat.format(price)
                        })
                    })
                ]
            });
        }

        user.wallet.seth -= price;

        const shopItem = user.inventory.shopItems.find(i => i.id === item.id && (
            item.type === "tool" ? i.durability === item.durability : true
        ));

        if (shopItem) {
            shopItem.amount += amount;
        } else {
            user.inventory.shopItems.push({
                id: item.id,
                amount: amount,
                ...(
                    item.type === "tool" ? { durability: item.durability } : {}
                )
            });
        }

        user.markModified('inventory');

        await user.save();

        await (new Log({
            from: interaction.user.id,
            to: "00000000000000000",
            type: "buy",
            amount: price,
        })).save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "shop.success", interaction.locale, {
                        'amount': NumberFormat.format(amount),
                        'item': item.name[interaction.locale],
                        'price': NumberFormat.format(price)
                    }).replace('$emoji', item.emojis.constant)
                })
            ]
        });
    } catch (e) {
        console.error(e);

        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "shop.error", interaction.locale)
                    })
                ]
            });
        } catch (e) {
            console.error(e);
        }
    }
}
