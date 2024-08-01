import { ModalSubmitInteraction } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import Listing, { PopulatedListing } from "../models/Listing";
import getTranslation from "../helpers/i18n";

export const name = 'market';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    try {

        const [_, subaction, id] = interaction.customId.split('.');

        if (id !== interaction.user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                    })
                ], ephemeral: true
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
                ], ephemeral: true
            });
        }

        const actions = {
            update
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.invalidAction", interaction.locale)
                    })
                ], ephemeral: true
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

async function update(interaction: ModalSubmitInteraction, user: PopulatedUser) {
    try {
        const id = parseInt(interaction.customId.split('.')[3]);

        if (isNaN(id) || id < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidID", interaction.locale)
                    })
                ]
            });
        }

        const listing = await Listing.findOne({ id, sold: false })
            .populate('item').populate('loot').populate('user').exec() as any as PopulatedListing;

        if (!listing) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.cannotFindListing", interaction.locale)
                    })
                ]
            });
        }

        if (listing.user.id !== user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.isNotYours", interaction.locale)
                    })
                ]
            });
        }

        const price = parseInt(interaction.fields.getTextInputValue('price'));

        if (isNaN(price) || price < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.invalidPrice", interaction.locale)
                    })
                ]
            });
        }

        if (listing.price !== price) {
            listing.price = price;
        }

        const remaining = listing.sold
            ? 0
            : (
                listing.single
                    ? (listing.amount - listing.buyer.length)
                    : listing.amount
            );

        const amount = parseInt(interaction.fields.getTextInputValue('amount'));

        if (isNaN(amount) || amount < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                    })
                ]
            });
        }

        if (amount > remaining) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.cannotBiggerThanAmount", interaction.locale, {
                            remaining
                        })
                    })
                ]
            });
        }

        const newAmount = listing.buyer.length + amount;

        if (listing.amount !== newAmount) {
            const diff = listing.amount - newAmount;

            listing.amount = newAmount;

            if (diff) {
                const inv = user.inventory.items.find(({ item }) => item.id === listing.itemID) || user.inventory.loots.find(({ loot }) => loot.id === listing.itemID);

                if (inv) {
                    inv.amount += diff;
                } else {
                    if (listing.item) {
                        user.inventory.items.push({
                            item: listing.item,
                            amount: diff
                        });
                    } else {
                        user.inventory.loots.push({
                            loot: listing.loot,
                            amount: diff
                        });
                    }
                }

                user.inventory.items = user.inventory.items.filter(({ amount }) => amount > 0);

                user.markModified('inventory');

                await user.save();
            }
        }

        await listing.save();

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "market.updated", interaction.locale)
                })
            ]
        });
    } catch (e) {
        console.log(e);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ]
        });
    }
}
