import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { InferSchemaType } from "mongoose";
import User, { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";
import PartnershipLog from "../models/PartnershipLog";
import Partnership, { PopulatedPartnership } from "../models/Partnership";

async function deposit(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {

    const modal = new ModalBuilder();
    modal.setTitle(getTranslation("global", "deposit", interaction.locale));
    modal.setCustomId('partner.deposit.submit');

    const amountInput = new TextInputBuilder()
        .setLabel(getTranslation("global", "amount", interaction.locale))
        .setPlaceholder(String(user.bank.seth))
        .setCustomId('amount')
        .setRequired(true)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)

    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput) as any
    )

    await interaction.showModal(modal);
}

async function withdraw(interaction: ButtonInteraction, user: PopulatedUser, partner: PopulatedPartnership) {
    const modal = new ModalBuilder();
    modal.setTitle(getTranslation("global", "withdraw", interaction.locale));
    modal.setCustomId('partner.withdraw.submit');

    const amountInput = new TextInputBuilder()
        .setLabel(getTranslation("global", "amount", interaction.locale))
        .setPlaceholder(String(partner.storage))
        .setCustomId('amount')
        .setRequired(true)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)

    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput) as any
    )

    await interaction.showModal(modal);
}

async function history(interaction: ButtonInteraction, user: PopulatedUser) {
    const transactions = await PartnershipLog.find({
        partnership: user.partner?.partner?._id
    }).limit(10).sort({
        createdAt: -1
    });

    const intlFormat = new Intl.NumberFormat(interaction.locale).format;

    await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation("global", "transactionHistory", interaction.locale),
                content: `${transactions.length < 1 
                    ? getTranslation("commands", "wallet.empty", interaction.locale)
                    : transactions.map(transaction => {
                        const isDeposit = transaction.action === 'deposit';
                        const isWithdraw = transaction.action === 'withdraw';

                        const amount = intlFormat(transaction.amount);

                        if (isDeposit) {
                            return getTranslation("commands", "wallet.deposited", interaction.locale, {
                                amount
                            })
                                .replace('$time', `<t:${Math.floor(new Date(transaction.createdAt).getTime() / 1000)}:R>`)
                        }

                        if (isWithdraw) {
                            return getTranslation("commands", "wallet.withdrew", interaction.locale, {
                                amount
                            })
                                .replace('$time', `<t:${Math.floor(new Date(transaction.createdAt).getTime() / 1000)}:R>`)
                        }
                    }).map((action, index) => `${index + 1}. ${action}`).join('\n').split('ID00000000000000000').join('Bank')
                    }`
            })
        ], ephemeral: true
    });
}

export async function leave(interaction: ButtonInteraction, user: PopulatedUser, partner: PopulatedPartnership) {
    try {
        partner.active = false;
        await partner.save();

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "partner.left", interaction.locale, {
                        user: partner.from.id === user.id ? partner.to.id : partner.from.id
                    })
                })
            ], ephemeral: true
        });
    } catch (error) {
        console.log(error);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ], ephemeral: true
        });   
    }
}

export default async function PartnershipStorage(interaction: ButtonInteraction) {
    const [_, action, userID] = interaction.customId.split(".");

    if (userID !== interaction.user.id) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    if (
        !['deposit', 'withdraw', 'history', 'leave'].includes(action)
    ) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.invalidAction", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    const user = await User.findOne({ id: interaction.user.id })

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.noAccount", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    const handlers = {
        deposit, withdraw, history, leave
    } as any;

    let p = await Partnership.findOne({
        $or: [
            { from: user, active: true },
            { to: user, active: true },
        ]
    })
        .populate('from')
        .populate('to');

    try {
        await handlers?.[action]?.(interaction, user, p);
    } catch (error) {
        console.log(`Error executing ${interaction.customId}`);
        console.log(error);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ], ephemeral: true
        });
    }
}