import { ModalSubmitInteraction } from "discord.js";
import isAdmin from "../helpers/isAdmin";
import Job from "../models/Job";
import { EmojiRegex, LatinRegex, SafeContentTitle } from "../helpers/regexes";
import Loot from "../models/Loot";
import lastContentID from "../helpers/general/lastContentID";
import { InferSchemaType } from "mongoose";
import Item from "../models/Item";
import User, { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";

export const name = 'profile';

export async function execute(interaction: ModalSubmitInteraction) {
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

        const user = await User.findOne({ id: interaction.user.id }) as any as PopulatedUser;

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
            updateDescription
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.invalidAction", interaction.locale)
                    })
                ],
                ephemeral: true
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

async function updateDescription(interaction: ModalSubmitInteraction, user: PopulatedUser) {
    try {
        const description = interaction.fields.getTextInputValue('description');

        if (description.length > 32) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "profile.mustBeShort", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (!LatinRegex.test(description)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "profile.mustBeLatin", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if ((description || '').length > 0) {
            user.description = description;
        } else {
            user.description = undefined;
        }
        await user.save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "profile.updated", interaction.locale)
                })
            ],
            ephemeral: true
        });
    } catch (e) {
        console.log(e);
        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.error", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        } catch (e) { }
    }
}
