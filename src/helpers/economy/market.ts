import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } from "discord.js";
import Listing, { PopulatedListing } from "../../models/Listing";
import { PopulatedUser } from "../../models/User";
import getTranslation from "../i18n";

export async function renderListings(client: Client, user: PopulatedUser, query: any, locale: string, page: number = 1, itemID: string) {
    const listings = (
        await Listing.find(query)
            .sort({ price: 1 })
            .skip((page - 1) * 10)
            .limit(10)
            .populate('loot')
            .populate('item')
            .populate('user').exec()
    ) as any as PopulatedListing[];

    const count = await Listing.countDocuments(query).exec();

    const embed =
        client.embedManager.Info({
            title: getTranslation("commands", "market.title", locale, {
                page,
                total: Math.ceil(count / 10)
            }),
            content: ''
        });

    if (count === 0 || listings.length === 0) {
        embed.setDescription(getTranslation("errors", "market.noListings", locale));
    } else {
        embed.setFields(
            listings.map((listing) => {
                return {
                    name: `#${listing.id} - ${listing.item?.title || listing.loot?.title}`,
                    value: getTranslation("commands", "market.listing", locale, {
                        price: listing.price,
                        amount: listing.amount - listing.buyer.length,
                        seller: listing.user?.id || 'Unknown'
                    }) + ` ${listing.single ? '*' : ''}`
                }
            })
        ).setDescription(null);
    }


    const buttons = [];

    if (page > 1) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`market.previous.${user.id}.${itemID}.${page}`)
                .setLabel(getTranslation("global", "previous", locale))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    if (count > page * 10) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`market.next.${user.id}.${itemID}.${page}`)
                .setLabel(getTranslation("global", "next", locale))
                .setStyle(ButtonStyle.Secondary)
        );
    }

    return { embed, buttons: buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null };
}