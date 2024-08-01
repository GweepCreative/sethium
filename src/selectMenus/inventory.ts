import { ActionRowBuilder, Locale, StringSelectMenuInteraction } from "discord.js";
import renderInventoryEmbed, { categories, generateInventoryCategories } from "../helpers/economy/inventory";
import getTranslation from "../helpers/i18n";

export const name = 'inventory';

export async function execute(interaction: StringSelectMenuInteraction) {
    try {
        const ownerID = interaction.customId.split('.')[2];

        if (interaction.user.id !== ownerID) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'account.notYourAccount', interaction.locale as Locale),
                    })
                ],
                ephemeral: true
            });
        }

        const value = interaction.values[0] as keyof typeof categories;

        const page = (categories?.[value] ? value : 'main') || 'main';

        const embed = await renderInventoryEmbed(interaction.client,{
            id: interaction.user.id,
            username: interaction.user.username,
            avatar: interaction.user.avatarURL() || interaction.user.defaultAvatarURL
        }, page, {
            language: (['en-US', 'en-GB', 'tr'].find(l => l === interaction.locale) ?? 'tr') as Locale
        });

        await interaction.deferUpdate();

        const msg = await interaction.message.fetch();

        if (msg && msg.editable)
            await msg.edit({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(
                        generateInventoryCategories(interaction.locale as Locale, interaction.user.id, page as any)
                    ) as any
                ]
            });

    } catch (error) {
        console.log(error);
    }
}