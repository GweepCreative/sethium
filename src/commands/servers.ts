import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import getTranslation from "../helpers/i18n";

export const data = new SlashCommandBuilder()
  .setName("servers")
  .setDescription("servers");

export async function execute(interaction: ChatInputCommandInteraction) {
   
  const allServers = interaction.client.guilds.cache.map((guild) => {
    return {
      name: `${guild.name}`,
      value: `${guild.name} (${guild.id})`,
      inline: true,
    };
  });

  interaction.reply({
    embeds: [new EmbedBuilder().setTitle("Servers").setFields(allServers)],
  });
}
