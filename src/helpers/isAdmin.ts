import { Interaction } from "discord.js";

export default async function isAdmin(interaction: Interaction) {
    const userID = interaction.user.id;

    if (process.env.ADMIN_IDS?.split(',').includes(userID)) return true;

    const member = await interaction.guild?.members.fetch(userID);
    const roles = member?.roles.cache.map(role => role.id);

    if (process.env.ADMIN_ROLES?.split(',').find(role => roles?.includes(role))) return true;

    return false;
}