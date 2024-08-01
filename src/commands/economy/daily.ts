import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import rand from "../../helpers/math/rand";

import getTranslation from "../../helpers/i18n";
import { increaseActionCount } from "../../helpers/user/achievements";

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setNameLocalization('tr', 'günlük')
    .setDescriptionLocalization('tr', 'Kullanıcıların günlük ödül almalarını sağlar.')
    .setDescription('Allows users to claim a daily reward.');

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id })
        .populate('partner.partner') as unknown as PopulatedUser;

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'account.noAccount', interaction.locale)
                })
            ]
        });
    }

    const lastDaily = new Date(user.lastDaily || Date.now()).getTime();

    const nextDaily = lastDaily + 24 * 60 * 60 * 1000;

    if (user.premium.status) {
        const classic = user.inventory.shopItems.find(i => i.id === 1);

        if (!classic) {
            user.inventory.shopItems.push({
                id: 1,
                amount: 1
            });
        } else {
            classic.amount++;
        }
        user.markModified('inventory.shopItems');
    }

    if (user.lastDaily && (Date.now() < nextDaily)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'daily.alreadyClaimed', interaction.locale, {
                        time: Math.floor(new Date(nextDaily).getTime() / 1000)
                    })
                })
            ],
            ephemeral: true
        });
    }

    let reward = rand(10000, 50000);

    if (user.partner.partner && user.partner.partner?.level >= 1) {
        reward *= rand(1.1, 1.5);
    }

    reward = Math.floor(reward);

    await increaseActionCount(interaction.client, user as any, "daily");

    user.lastDaily = new Date();
    user.wallet.seth += reward;

    await user.save();

    const intlFormat = new Intl.NumberFormat(interaction.locale).format;

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Success({
                content: getTranslation('commands', user.premium.status ? 'daily.claimedPremium' : 'daily.claimed', interaction.locale, {
                    reward: intlFormat(reward)
                })
            })
        ]
    });
}