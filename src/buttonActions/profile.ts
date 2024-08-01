import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import getTranslation from "../helpers/i18n";

export async function Profile(interaction: ButtonInteraction) {
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

        const user = await User.findOne({ id: interaction.user.id }) as PopulatedUser;

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
            updateDescription
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



async function updateDescription(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const description = new TextInputBuilder()
            .setPlaceholder(getTranslation("commands", "profile.updateDescription", interaction.locale))
            .setMaxLength(32)
            .setLabel(getTranslation("global", "description", interaction.locale))
            .setCustomId('description')
            .setRequired(false)
            .setStyle(TextInputStyle.Short);

        if (user.description) {
            description.setValue(user.description.slice(0, 32));
        }

        const modal = new ModalBuilder()
            .setTitle(getTranslation("commands", "profile.updateDescription", interaction.locale))
            .setCustomId(`profile.updateDescription.${interaction.user.id}`)
            .setComponents(
                new ActionRowBuilder().addComponents(description) as any
            );

        return await interaction.showModal(modal);

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