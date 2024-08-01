import { ActionRowBuilder, ChatInputCommandInteraction, Locale, SlashCommandBuilder } from "discord.js";
import renderInventoryEmbed, {generateInventoryCategories } from "../../helpers/economy/inventory";

export const data = new SlashCommandBuilder()
    .setName('inventory')
    .setNameLocalization('tr', 'envanter')
    .setDescriptionLocalization('tr', 'Sahip olduğun tüm eşyaları gösterir.')
    .setDescription('Shows you all the items you currently have.');

export async function execute(interaction: ChatInputCommandInteraction) {

    const embed = await renderInventoryEmbed(interaction.client, {
        id: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.avatarURL() || interaction.user.defaultAvatarURL
    }, 'main', {
        language: (['en-US', 'en-GB', 'tr'].find(l => l === interaction.locale) ?? 'tr') as Locale
    });

    await interaction.reply({
        embeds: [embed],
        /* components: [
            new ActionRowBuilder().addComponents(
                generateInventoryCategories(interaction.locale as Locale, interaction.user.id, 'main')
            ) as any
        ] */
    });
}