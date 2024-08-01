import { ModalSubmitInteraction } from "discord.js";
import User from "../models/User";
import { WalletAdressRegex } from "../helpers/regexes";
import Log from "../models/Log";
import { seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";
import { XPToLevel } from "../helpers/level";
import Partnership from "../models/Partnership";
import PartnershipLog from "../models/PartnershipLog";

export const name = 'partner';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    try {

        const [_, subaction, ...data] = interaction.customId.split('.');

        if (
            !['deposit', 'withdraw'].includes(subaction)
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

        const partnership = await Partnership.findOne({
            $or: [
                { from: user, active: true },
                { to: user, active: true }
            ]
        });

        if (!partnership) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.notFound", interaction.locale)
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

            if (user.bank.seth < amount) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.infussicientBalance", interaction.locale)
                        })
                    ]
                });
            }

            //TODO: Check if the user has reached the limit
            /* if ((user.bank.seth + amount) > limit) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "wallet.insufficientLimit", interaction.locale)
                        })
                    ]
                });
            } */

            user.bank.seth -= amount;
            partnership.storage += amount;

            await user.save();
            await partnership.save();

            await (new PartnershipLog({
                action: 'deposit',
                partnership: partnership._id,
                user: user.id,
                amount,
            })).save();

            const intlFormat = new Intl.NumberFormat(interaction.locale).format;

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: getTranslation("commands", "partner.actions.deposited", interaction.locale, {
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

            if (partnership.storage < amount) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "partner.infussicientBalance", interaction.locale)
                        })
                    ]
                });
            }

            user.bank.seth += amount;
            partnership.storage -= amount;

            await user.save();
            await partnership.save();

            await (new PartnershipLog({
                action: 'withdraw',
                partnership: partnership._id,
                user: user.id,
                amount,
            })).save();

            const intlFormat = new Intl.NumberFormat(interaction.locale).format;

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: getTranslation("commands", "partner.actions.withdrew", interaction.locale, {
                            amount: intlFormat(amount)
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