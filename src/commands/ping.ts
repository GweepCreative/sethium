import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import getTranslation from "../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botun gecikmesini ölçer');

export async function execute(interaction: ChatInputCommandInteraction) {
    // Capture the timestamp before the interaction reply
    const sentTimestamp = Date.now();

    // Reply to the command; this message will be edited to show the ping later
    await interaction.reply({ content: '0ms', fetchReply: true });

    // Calculate the round-trip latency by subtracting the original timestamp from the current timestamp
    const roundTripLatency = Date.now() - sentTimestamp;

    // Calculate the bot's API latency
    const apiLatency = interaction.client.ws.ping ? Math.round(interaction.client.ws.ping) : 'N/A';

    // Edit the reply with the latency information
    await interaction.editReply({
        content: null,
        embeds: [
            interaction.client.embedManager.Info({
                content: getTranslation("commands", "ping.result", interaction.locale, {
                    round: roundTripLatency.toString(),
                    api: apiLatency.toString()
                })
            })
        ]
    });
}