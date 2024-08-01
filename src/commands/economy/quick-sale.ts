import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import rand from "../../helpers/math/rand";

import getTranslation from "../../helpers/i18n";
import { increaseActionCount } from "../../helpers/user/achievements";
import Log from "../../models/Log";

export const data = new SlashCommandBuilder()
    .setName('quick-sale')
    .setNameLocalization('tr', 'hızlı-satış')
    .setDescriptionLocalization('tr', 'Birden fazla eşyayı hızlıca bota satmanızı sağlar.')
    .setDescription('Allows you to quickly sell multiple items to the bot.')
    .addStringOption(option =>
        option
            .setName('item')
            .setNameLocalization('tr', 'esya')
            .setDescription('The item you want to add to the market')
            .setDescriptionLocalization('tr', 'Pazara eklemek istediğiniz eşya')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addNumberOption(option =>
        option
            .setName('amount')
            .setNameLocalization('tr', 'miktar')
            .setDescription('The amount of the item')
            .setDescriptionLocalization('tr', 'Eşyanın miktarı')
            .setMinValue(1)
            .setRequired(true)
    )

export const shouldRegister = true;

export async function autocomplete(interaction: AutocompleteInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item').exec() as any as PopulatedUser;


        const value = (interaction.options.getString('item') || interaction.options.getString('esya'))?.toLowerCase() || '';

        if (!user) {
            return await interaction.respond([]);
        }

        return await interaction.respond(
            user.inventory.items.filter(({ item }) => item.title.toLowerCase().includes(value))
                .map(({ item }) => ({
                    name: item.title,
                    value: `item.${item.id}` 
                }))
                .concat(user.inventory.loots.filter(({ loot }) => loot.title.toLowerCase().includes(value))
                    .map(({ loot }) => ({
                        name: loot.title,
                        value: `loot.${loot.id}`
                    })))
        );
    } catch (error) {
        console.error('Error while autocompleting market command:', error);
    }
}
export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item').exec() as any as PopulatedUser;

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'account.noAccount', interaction.locale)
                    })
                ]
            });
        }
        const value = (interaction.options.getString('item') || interaction.options.getString('esya') || '').split('.');

        if (value.length !== 2) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'general.error', interaction.locale)
                    })
                ]
            });
        }

        const item = value[0] === 'item' ? user.inventory.items.find(({ item }) => String(item.id) == value[1]) : null;
        const loot = !item ? user.inventory.loots.find(({ loot }) => String(loot.id) == value[1]) : null;

        if (!item && !loot) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.invalidItem", interaction.locale)
                    })
                ]
            });
        }

        const thing = item ? {
            item: item.item,
            amount: item.amount,
        } : {
            item: loot!.loot,
            amount: loot!.amount,
        };

        if (!thing.item.tradeable) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.thisItemIsNotSellable", interaction.locale)
                    })
                ]
            });
        }

        const amount = interaction.options.getNumber('amount') || interaction.options.getNumber('miktar') || 1;

        if (amount < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.invalidAmount", interaction.locale)
                    })
                ]
            });
        }

        if (amount > thing.amount) {
            return await interaction.reply({
                embeds: [ 
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "market.youDontHaveEnough", interaction.locale, {
                            item: thing.item.title,
                            amount: thing.amount
                        }).replace('$itemEmoji', thing.item.emoji || '')
                    })
                ]
            });
        }

        const price = Math.floor(rand(thing.item.minimumPrice, thing.item.maximumPrice) * amount);

        user.wallet.seth += price;

        if (item) {
            item.amount -= amount;
        } else {
            loot!.amount -= amount;
        }
        user.markModified('inventory');

        await increaseActionCount(interaction.client, user as any, "sales");

        if (user.tutorial === 5) {
            user.tutorial = 6;
        }

        await user.save();

        const intl = new Intl.NumberFormat(interaction.locale).format;

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "quickSale.selled", interaction.locale, {
                        price: intl(price),
                        amount: amount.toString(),
                        item: thing.item.title
                    }).replace('$emoji', thing.item.emoji)
                })
            ]
        });

        await (new Log({
            from: "00000000000000000",
            to: interaction.user.id,
            type: "transfer",
            amount: price,
            data: {
                amount,
                item: thing.item.title
            }
        })).save();
    } catch (error) {
        console.error('Error while executing market command:', error);

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ]
        });
    }
}