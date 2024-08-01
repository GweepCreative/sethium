import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";
import Partnership from "../models/Partnership";

export async function Partner(interaction: ButtonInteraction) {
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
            .populate('partner.requests.user')
            .populate('partner.partner').exec() as any as PopulatedUser;

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
            accept,
            decline
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
                    content: getTranslation("errors", "account.error", interaction.locale)
                })
            ], ephemeral: true
        });
    }
}



async function accept(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const partnerID = interaction.customId.split('.')[3];

        if (partnerID === user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.cannotSendToSelf", interaction.locale)
                    })
                ]
            });
        }

        if (user.partner?.partner) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.alreadyPartnered", interaction.locale)
                    })
                ]
            });
        }

        const partner = await User.findOne({ id: partnerID })
            .populate('partner.requests.user')
            .populate('partner.partner').exec() as any as PopulatedUser;

        if (!partner) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.userNoWallet", interaction.locale)
                    })
                ]
            });
        }

        if (!user.partner?.requests.some(request => request.user.id === partner.id)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.noRequest", interaction.locale)
                    })
                ]
            });
        }

        user.partner.requests = user.partner.requests.filter(request => request.user.id !== partner.id);

        const partnership = new Partnership({
            active: true,
            from: partner?._id,
            to: user?._id,
            level: 1
        }) as any;

        partner.partner.partner = partnership;
        user.partner.partner = partnership;

        await partnership.save();

        partner.markModified('partner.partner');
        partner.markModified('partner.requests');
        await partner.save();

        user.markModified('partner.partner');
        user.markModified('partner.requests');
        await user.save();

        const partnerAccount = await interaction.client.users.fetch(partner.id);

        if (partnerAccount) {
            await partnerAccount.send({
                embeds: [
                    interaction.client.embedManager.Info({
                        content: getTranslation("commands", "partner.accepted", partner.language, {
                            tag: interaction.user?.tag ?? 'N/A',
                            user: interaction.user?.id ?? 'N/A'
                        })
                    })
                ]
            });
        }

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "partner.success", interaction.locale, {
                        tag: partnerAccount?.tag ?? 'N/A',
                        user: partnerAccount?.id ?? 'N/A'
                    })
                })
            ]
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

async function decline(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const partnerID = interaction.customId.split('.')[3];

        if (partnerID === user.id) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.cannotSendToSelf", interaction.locale)
                    })
                ]
            });
        }

        if (!user.partner?.requests.some(request => request.user.id === user.id)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "partner.noRequest", interaction.locale)
                    })
                ]
            });
        }

        user.partner.requests = user.partner.requests.filter(request => request.user.id !== user.id);

        user.markModified('partner');
        await user.save();

        const partnerAccount = await interaction.client.users.fetch(partnerID);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "partner.declined", interaction.locale, {
                        tag: partnerAccount?.tag ?? 'N/A',
                        user: partnerAccount?.id ?? 'N/A'
                    })
                })
            ]
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