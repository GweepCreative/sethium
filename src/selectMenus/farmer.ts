import { ActionRowBuilder, StringSelectMenuInteraction } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import { availableVegetables } from "../constants/farmer";
import { zoneSelectionButtons } from "../helpers/economy/farmer";
import getTranslation from "../helpers/i18n";

export const name = 'farmer';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: StringSelectMenuInteraction) {
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

        const user = await User.findOne({ id: interaction.user.id })
            .populate('farmer.zones.seed') as any as PopulatedUser;

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
            plant
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAction", interaction.locale)
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

export async function plant(interaction: StringSelectMenuInteraction, user: PopulatedUser) {
    const value = interaction.values[0];

    await interaction.deferUpdate();

    if (!availableVegetables.includes(value as any)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "farmer.cannotFindThisVegetable", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }

    const buttons = zoneSelectionButtons(user, true, "planted", value as any);

    const msg = await interaction.message.fetch();

    if (msg && msg.editable) {
        await msg.edit({
            components: [
                ...buttons.map(buttonRow => new ActionRowBuilder().addComponents(buttonRow)) as any
            ]
        });
    }


}