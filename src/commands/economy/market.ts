import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import { seth } from "../../constants/emojis";
import Listing, { PopulatedListing } from "../../models/Listing";
import Item from "../../models/Item";
import Loot from "../../models/Loot";
import { renderListings } from "../../helpers/economy/market";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('market')
    .setNameLocalization('tr', 'pazar')
    .setDescriptionLocalization('tr', 'Pazardan eşya alır veya satar')
    .setDescription('Buy or sell items from the market')
    .addSubcommand(subcommand =>
        subcommand
            .setName('listings')
            .setNameLocalization('tr', 'ilanlar')
            .setDescription('Shows your listings on the market')
            .setDescriptionLocalization('tr', 'Pazardaki ilanlarınızı gösterir')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('search')
            .setNameLocalization('tr', 'ara')
            .setDescription('Search for items on the market')
            .setDescriptionLocalization('tr', 'Pazarda eşya arar')
            .addStringOption(option =>
                option
                    .setName('item')
                    .setNameLocalization('tr', 'esya')
                    .setDescription('The item you want to search for')
                    .setDescriptionLocalization('tr', 'Aramak istediğiniz eşya')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('buy')
            .setNameLocalization('tr', 'satın-al')
            .setDescription('Buy an item from the market')
            .setDescriptionLocalization('tr', 'Pazardan bir eşya alır')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('The ID of the listing you want to buy')
                    .setDescriptionLocalization('tr', 'Satın almak istediğiniz ilanın ID\'si')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option
                    .setName('amount')
                    .setDescription('The amount of the item you want to buy')
                    .setDescriptionLocalization('tr', 'Satın almak istediğiniz eşyanın miktarı')
                    .setRequired(false)
            )
    );

export const timeout = 1000 * 15;

export const shouldRegister = true;

export async function autocomplete(interaction: AutocompleteInteraction) {

    try {
        const subcommands = {
            search: {
                execute: async (interaction: AutocompleteInteraction) => {
                    if (!interaction.options.getString('item') && !interaction.options.getString('esya')) {
                        return await interaction.respond([]);
                    }

                    const [items, loots] = await Promise.all([
                        Item.find({
                            title: {
                                $regex: String(interaction.options.getString('item') ||
                                    interaction.options.getString('esya')),
                                $options: 'i'
                            }
                        }),
                        Loot.find({
                            title: {
                                $regex: String(interaction.options.getString('item') ||
                                    interaction.options.getString('esya')),
                                $options: 'i'
                            }
                        })
                    ]);

                    return await interaction.respond(
                        items.map(
                            item => ({
                                name: item.title,
                                value: String(item.id)
                            })
                        ).concat(
                            loots.map(loot => ({
                                name: loot.title,
                                value: String(loot.id)
                            }))
                        ).slice(0, 25)
                    );
                },
                names: ['search', 'ara']
            }
        } as {
            [key: string]: {
                execute: (interaction: AutocompleteInteraction) => Promise<any>;
                names: string[];
            };
        };

        const subcommand = interaction.options.getSubcommand();

        const request = Object.values(subcommands).find(
            request => request.names.includes(subcommand)
        );

        if (!request) {
            return;
        }

        return await request.execute(interaction);
    } catch (error) {
        console.error('Error while autocompleting market command:', error);
    }
}

export async function execute(interaction: ChatInputCommandInteraction) {

    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item')
            .populate('partner.partner')
            .exec() as any as PopulatedUser;

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
                        content: getTranslation("errors", "jobs.noJob", interaction.locale)
                    })
                ]
            });
        }

        const subcommand = interaction.options.getSubcommand();

        const subcommands = {
            listings: {
                execute: listings,
                names: ['listings', 'ilanlar']
            },
            search: {
                execute: search,
                names: ['search', 'ara']
            },
            buy: {
                execute: buy,
                names: ['buy', 'satın-al']
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
                        content: getTranslation("errors", "account.notYourJob", interaction.locale, {
                            job: user.job?.name
                        })
                    })
                ]
            });
        }

        return await request.execute(interaction, user);
    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}

async function listings(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const lists = (await Listing.find({ user: user._id, sold: false })
        .populate('item')
        .populate('loot')
        .exec()) as any as PopulatedListing[];

    if (!lists.length) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.noActiveListings", interaction.locale)
                })
            ]
        })
    }

    let description = '';

    for (const list of lists) {
        const item = list.item || list.loot;

        description += `\`${" ".repeat(Math.max(3 - list.id.toString().length, 0))}${list.id}\` `;
        description += `${item.emoji} ${list.amount} **${item.title}** (${seth} ${list.price})\n\n`;
    }

    await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation("commands", "market.yourListings", interaction.locale),
                content: description
            })
        ]
    });
}

async function buy(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const id = parseInt(interaction.options.getString('id', true) || '');

    if (isNaN(id) || id < 1) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.invalidID", interaction.locale)
                })
            ]
        });
    }

    const amount = parseInt(interaction.options.getNumber('amount', true) as any || '');

    const listing = await Listing.findOne({ id, sold: false })
        .populate('item').populate('loot').populate('user').exec() as any as PopulatedListing;

    if ((!listing.single && amount) || (isNaN(amount) || amount < 1)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.invalidAmount", interaction.locale)
                })
            ]
        });
    }

    if (!listing) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.cannotFindListing", interaction.locale)
                })
            ]
        });
    }

    if (listing.user.id === interaction.user.id) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.cannotBuyYourself", interaction.locale)
                })
            ]
        });
    }

    if (listing.single && amount > listing.amount) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.invalidAmount", interaction.locale)
                })
            ]
        });
    }

    const item = listing.item || listing.loot;

    if (item.job && user.job && item.job === 'Demirci' && item.job === user.job.name) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.anotherBlacksmithsTool", interaction.locale)
                })
            ]
        });
    }

    const embed =
        interaction.client.embedManager.Info({
            title: getTranslation("commands", "market.listingBuy", interaction.locale),
            content: `${item.emoji} ${listing.single ? 1 : listing.amount}x ${item.title} (${getTranslation("global", "seller", interaction.locale)
                }: <@${listing.user.id}>)`
        }).setFields({
            name: getTranslation("global", "item", interaction.locale),
            value: `${item?.emoji} ${item?.title}`
        },
            {
                name: getTranslation("global", "amount", interaction.locale),
                value: String(listing.single ? (amount || 1) : listing.amount)
            },
            {
                name: getTranslation("global", "price", interaction.locale),
                value: `${listing.price} ${seth}`
            },
            {
                name: getTranslation("commands", "market.totalToPay", interaction.locale),
                value: `${listing.price * (listing.single ? (amount || 1) : listing.amount)} ${seth}`
            })

    const button = new ButtonBuilder()
        .setCustomId(`market.buy.${interaction.user.id}.${id}.${listing.single ? (amount || 1) : listing.amount}`)
        .setLabel(
            getTranslation("commands", "market.buy", interaction.locale, {
                price: listing.price * (listing.single ? (amount || 1) : listing.amount)
            })
        )
        //.setEmoji(seth)
        .setStyle(ButtonStyle.Success);

    await interaction.reply({
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(button) as any
        ]
    });
}


async function search(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const value = parseInt(interaction.options.getString('item') || interaction.options.getString('esya') || '');

    if (!value || isNaN(value)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.cannotFindItem", interaction.locale)
                })
            ]
        });
    }

    const item = await Item.findOne({ id: value });
    const loot = item ?? await Loot.findOne({ id: value });

    if (!item && !loot) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "market.cannotFindItem", interaction.locale)
                })
            ]
        });
    }

    const { embed, buttons } = await renderListings(interaction.client, user, {
        ...(
            item ? { item: item._id } : { loot: loot!._id }
        ), sold: false
    }, interaction.locale, 1, item ? item.id : loot!.id);

    await interaction.reply({
        embeds: [embed],
        ...(buttons ? { components: [buttons as any] } : {})
    });
}