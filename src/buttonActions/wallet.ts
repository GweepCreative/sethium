import { ActionRowBuilder, ButtonInteraction, Locale, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User from "../models/User";
import { InferSchemaType } from "mongoose";
import Log from "../models/Log";
import { seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";

async function deposit(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {

    const modal = new ModalBuilder();
    modal.setTitle(getTranslation("global", "deposit", interaction.locale));
    modal.setCustomId('wallet.deposit.submit');

    const amountInput = new TextInputBuilder()
        .setLabel(getTranslation("global", "amount", interaction.locale))
        .setPlaceholder(String(user.wallet.seth))
        .setCustomId('amount')
        .setRequired(true)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)

    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput) as any
    )

    await interaction.showModal(modal);
}

async function withdraw(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {
    const modal = new ModalBuilder();
    modal.setTitle(getTranslation("global", "withdraw", interaction.locale));
    modal.setCustomId('wallet.withdraw.submit');

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

async function transfer(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {
    const modal = new ModalBuilder();
    modal.setTitle(getTranslation("global", "transfer", interaction.locale));
    modal.setCustomId('wallet.transfer.submit');

    const addressInput = new TextInputBuilder()
        .setLabel(getTranslation("global", "address", interaction.locale))
        .setPlaceholder('ID12345678901234567(...)')
        .setCustomId('address')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(22)
        .setStyle(TextInputStyle.Short)

    const amountInput = new TextInputBuilder()
        .setLabel(getTranslation("global", "amount", interaction.locale))
        .setPlaceholder(String(user.bank.seth))
        .setCustomId('amount')
        .setRequired(true)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)

    modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput) as any,
        new ActionRowBuilder().addComponents(addressInput) as any
    )

    await interaction.showModal(modal);
}

async function history(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {
    const transactions = await Log.find({
        $or: [
            { from: user.id },
            { to: user.id }
        ]
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
                        const isDeposit = transaction.type === 'deposit';
                        const isWithdraw = transaction.type === 'withdraw';

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

                        if (transaction.from === user.id) {
                            return getTranslation("commands", "wallet.sent", interaction.locale, {
                                amount,
                                address: `ID${transaction.to}`
                            })
                                .replace('$time', `<t:${Math.floor(new Date(transaction.createdAt).getTime() / 1000)}:R>`)
                        } else {
                            return getTranslation("commands", "wallet.received", interaction.locale, {
                                amount,
                                address: `ID${transaction.from}`
                            })
                                .replace('$time', `<t:${Math.floor(new Date(transaction.createdAt).getTime() / 1000)}:R>`)
                        }
                    }).map((action, index) => `${index + 1}. ${action}`).join('\n').split('ID00000000000000000').join(
                        interaction.locale === Locale.Turkish ? 'Sistem' : 'System'
                    )
                    }`
            })
        ], ephemeral: true
    });
}

export default async function Wallet(interaction: ButtonInteraction) {
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
        !['deposit', 'withdraw', 'transfer', 'history'].includes(action)
    ) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.invalidAction", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    const user = await User.findOne({ id: interaction.user.id });

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
        deposit, withdraw, transfer, history
    } as any;

    try {
        await handlers?.[action]?.(interaction, user);
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