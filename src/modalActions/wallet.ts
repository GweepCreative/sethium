import { ModalSubmitInteraction } from "discord.js";
import User from "../models/User";
import { WalletAdressRegex } from "../helpers/regexes";
import Log from "../models/Log";
import { seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";
import { XPToLevel } from "../helpers/level";

export const name = 'wallet';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    try {

        const [_, subaction, ...data] = interaction.customId.split('.');

        if (
            !['deposit', 'withdraw', 'transfer'].includes(subaction)
        ) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAction", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const user = await User.findOne({ id: interaction.user.id });

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

        if (user.lastBankAction && (Date.now() - new Date(user.lastBankAction).getTime()) < 30000) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.tooFast", interaction.locale, {
                            time: Math.floor(new Date(user.lastBankAction).getTime() / 1000) + 30
                        })
                    })
                ],
                ephemeral: true
            });
        }

        if (subaction === 'deposit') {
            const amount = Number(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]
                });
            }

            if (user.wallet.seth < amount) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.infussicientBalance", interaction.locale)
                        })
                    ]
                });
            }

            const limit = (user.premium.status ? 2 : 1) * 50000 * Math.floor(XPToLevel(user.xp)) + 100000

            if ((user.bank.seth + amount) > limit) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.insufficientLimit", interaction.locale)
                        })
                    ]
                });
            }

            user.wallet.seth -= amount;
            user.bank.seth += amount;
            user.lastBankAction = new Date();

            await user.save();

            await (new Log({
                amount,
                type: 'deposit',
                from: user.id,
                to: '00000000000000000',
            })).save();

            const intlFormat = new Intl.NumberFormat(interaction.locale).format;

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: getTranslation("commands", "wallet.actions.deposited", interaction.locale, {
                            amount: intlFormat(amount)
                        })
                    })
                ]
            });
        }

        if (subaction === 'withdraw') {
            const amount = Number(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]
                });
            }

            if (user.bank.seth < amount) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.infussicientBalance", interaction.locale)
                        })
                    ]
                });
            }

            user.bank.seth -= amount;
            user.wallet.seth += amount;
            user.lastBankAction = new Date();

            await user.save();

            await (new Log({
                amount,
                type: 'withdraw',
                from: '00000000000000000',
                to: user.id,
            })).save();

            const intlFormat = new Intl.NumberFormat(interaction.locale).format;

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: getTranslation("commands", "wallet.actions.withdrew", interaction.locale, {
                            amount: intlFormat(amount)
                        })
                    })
                ]
            });

        }

        if (subaction === 'transfer') {
            const address = interaction.fields.getTextInputValue('address');
            const amount = Number(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]
                });
            }

            if (!WalletAdressRegex.test(address)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAddress", interaction.locale)
                        })
                    ]
                });
            }

            const walletID = address.split('ID')?.[1];

            if (walletID == interaction.user.id) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.cannotSendToYourself", interaction.locale)
                        })
                    ]
                });
            }

            if (user.bank.seth < amount) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.notEnoughMoneyOnBank", interaction.locale)
                        })
                    ]
                });
            }

            const targetUser = await User.findOne({ id: walletID });

            if (!targetUser) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.cannotFoundTarget", interaction.locale)
                        })
                    ]
                });
            }
            const limit = Math.floor(
                (targetUser.premium.status ? 2 : 1) * 50000 * XPToLevel(targetUser.xp) + 100000
            );

            if ((targetUser.bank.seth + amount) > limit) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.insufficientTargetLimit", interaction.locale)
                        })
                    ]
                });
            }

            user.bank.seth -= amount;
            user.lastBankAction = new Date();
            targetUser.bank.seth += amount;
            //targetUser.limit.used += amount;

            await user.save();
            await targetUser.save();

            await (new Log({
                amount,
                type: 'transfer',
                from: user.id,
                to: targetUser.id,
            })).save();

            const intlFormat = new Intl.NumberFormat(interaction.locale).format;

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: getTranslation("commands", "wallet.actions.sent", interaction.locale, {
                            amount: intlFormat(amount),
                            address
                        })
                    })
                ]
            });
        }

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ],
            ephemeral: true
        });

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