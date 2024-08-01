import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import { renderListings } from "../helpers/economy/market";
import Listing, { PopulatedListing } from "../models/Listing";
import Log from "../models/Log";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";
import { seth } from "../constants/emojis";

export async function Market(interaction: ButtonInteraction) {
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
            .populate('inventory.items.item').exec() as any as PopulatedUser;

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
            next,
            previous,
            buy
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({ content: getTranslation("errors", "general.invalidAction", interaction.locale), ephemeral: true });
        }

        await request(interaction, user);
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({ content: getTranslation("errors", "general.error", interaction.locale), ephemeral: true });
    }
}



async function next(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const [itemID, page] = interaction.customId.split('.').slice(3).map(x => parseInt(x));

        if (page < 1 || isNaN(page) || isNaN(itemID) || itemID < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidPage", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        const { embed, buttons } = await renderListings(interaction.client, user, { itemID, sold: false }, interaction.locale, page + 1, itemID.toString());

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await msg.edit({
                embeds: [embed],
                ...(buttons ? { components: [buttons as any] } : {})
            });
        }
    } catch (error) {
        console.log(error);

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

async function previous(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const [itemID, page] = interaction.customId.split('.').slice(3).map(x => parseInt(x));

        if (page < 2 || isNaN(page) || isNaN(itemID) || itemID < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidPage", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        const { embed, buttons } = await renderListings(interaction.client, user, { itemID, sold: false }, interaction.locale, page - 1, itemID.toString());

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await msg.edit({
                embeds: [embed],
                ...(buttons ? { components: [buttons as any] } : {})
            });
        }
    } catch (error) {
        console.log(error);

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

async function buy(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const intl = new Intl.NumberFormat(interaction.locale).format;

        const itemID = parseInt(interaction.customId.split('.')[3]);

        const listing = await Listing.findOne({ id: itemID, sold: false })
            .populate('item').populate('loot').populate('user').exec() as any as PopulatedListing;

        if (!listing) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.invalidListing", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (listing.user.id === user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.cannotBuyYourself", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const amount = parseInt(interaction.customId.split('.')[4]);

        if (isNaN(amount) || amount < 1 || amount > listing.amount) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.invalidAmount", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (user.wallet.seth < listing.price * amount) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.notEnoughMoney", interaction.locale, {
                            price: intl(listing.price * amount)
                        })
                    })
                ],
                ephemeral: true
            });
        }

        const seller = await User.findOne({ id: listing.user.id }) as PopulatedUser;

        listing.buyer = [...listing.buyer, ...new Array(amount).fill(user)];
        listing.markModified('buyer');

        if (listing.single) {
            if (listing.buyer.length >= listing.amount) {
                listing.sold = true;
                await increaseActionCount(interaction.client, seller as any, "sales");
                await seller.save();
            }
        } else {
            listing.sold = true;
            await increaseActionCount(interaction.client, seller as any, "sales");
            await seller.save();
        }

        await listing.save();

        user.wallet.seth -= listing.price * amount;

        if (!!listing.item) {
            const item = user.inventory.items.find(x => x.item.id === listing.item.id);

            if (item) {
                item.amount += amount;
            } else {
                user.inventory.items.push({
                    item: listing.item,
                    amount
                });
            }
        } else {
            const loot = user.inventory.loots.find(x => x.loot.id === listing.loot.id);

            if (loot) {
                loot.amount += amount;
            } else {
                user.inventory.loots.push({
                    loot: listing.loot,
                    amount
                });
            }
        }

        seller.wallet.seth += listing.price * amount;

        if (user.tutorial === 7) {
            user.tutorial = 8;

            try {
                await interaction.user.send({
                    embeds: [
                        interaction.client.embedManager.Info({
                            title: getTranslation("commands", "tutorial.title", interaction.locale),
                            content: getTranslation("commands", "tutorial.completed", interaction.locale)
                        })
                    ]
                })
            } catch (error) {
                console.log(error);
            }
        }

        await user.save();
        await seller.save();

        await (new Log({
            from: user.id,
            to: listing.user.id,
            type: 'buy',
            amount: listing.price * amount
        })).save();

        const msg = await interaction.message.fetch();

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "market.bought", interaction.locale)
                })
            ],
            ephemeral: true
        });

        const button = ButtonBuilder.from(interaction.component)
            .setDisabled(true)
            .setLabel(getTranslation("commands", "market.soldButton", interaction.locale))
            .setStyle(ButtonStyle.Danger);

        if (msg && msg.editable) {
            await msg.edit({
                components: [new ActionRowBuilder().addComponents(button) as any]
            });
        }

        const sellerDM = await interaction.client.users.fetch(listing.user.id);


        if (!sellerDM) return;

        const sellerIntl = new Intl.NumberFormat(seller.language).format;

        if (listing.sold)
            await sellerDM.send({
                embeds: [
                    interaction.client.embedManager.Success({
                        title: getTranslation("commands", "market.sold.title", seller.language),
                        content: getTranslation("commands", "market.sold.description", seller.language),
                    }).setFields([
                        {
                            name: getTranslation("global", "item", seller.language),
                            value: listing.item ? listing.item?.title! : listing.loot?.title!,
                            inline: true
                        },
                        {
                            name: getTranslation("global", "price", seller.language),
                            value: `${seth} ${sellerIntl(listing.price * amount)}`,
                            inline: true
                        },
                        {
                            name: getTranslation("global", "buyer", seller.language),
                            value: interaction.user.tag,
                            inline: true
                        }
                    ])
                ]
            });
        else
            await sellerDM.send({
                embeds: [
                    interaction.client.embedManager.Success({
                        title: getTranslation("commands", "market.sold.title", seller.language),
                        content: getTranslation("commands", "market.sold.part", seller.language),
                    }).setFields([
                        {
                            name: getTranslation("global", "item", seller.language),
                            value: listing.item ? listing.item?.title! : listing.loot?.title!,
                            inline: true
                        },
                        {
                            name: getTranslation("global", "price", seller.language),
                            value: `${seth} ${new Intl.NumberFormat(seller.language).format(listing.price * amount)}`,
                            inline: true
                        },
                        {
                            name: getTranslation("global", "amount", seller.language),
                            value: `${sellerIntl(listing.amount - listing.buyer.length - amount)}/${sellerIntl(listing.amount - listing.buyer.length)}`,
                            inline: true
                        },
                        {
                            name: getTranslation("global", "buyer", seller.language),
                            value: interaction.user.tag,
                            inline: true
                        }
                    ])
                ]
            });


    } catch (error) {
        console.log(error);

        await interaction.reply({ content: getTranslation("errors", "general.error", interaction.locale), ephemeral: true });
    }
}