import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import isAdmin from "../../helpers/isAdmin";
import { totalmem, cpus } from "os";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('statistics')
    .setNameLocalization('tr', 'istatistik')
    .setDescriptionLocalization('tr', 'Botun barındırıldığı sunucu hakkında istatistikleri gösterir.')
    .setDescription(' Displays statistics about the bot\'s hosting server.');

export const shouldRegister = true;

const websocketStates = {
    1: "Connecting",
    5: "Disconnected",
    7: "Identifying",
    3: "Idle",
    4: "Nearly",
    0: "Ready",
    2: "Reconnecting",
    8: "Resuming",
    6: "WaitingForGuilds"
};

const byteToMB = (bytes: number, allowGB: boolean = true) => {
    const mb = bytes / 1024 / 1024;

    if (!allowGB || mb < 1024) {
        return `${mb.toFixed(2)}MB`;
    }

    return `${(mb / 1024).toFixed(2)}GB`;
};

export async function execute(interaction: ChatInputCommandInteraction) {
    const is_admin = await isAdmin(interaction);

    if (!is_admin) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.notAdmin", interaction.locale)
                })
            ]
        });
    }

    const intlNumber = new Intl.NumberFormat(interaction.locale, {
        maximumFractionDigits: 2
    }).format;

    const memoryUsage = process.memoryUsage.rss();
    const totalMemory = totalmem();
    const memoryRate = (memoryUsage / totalMemory * 100).toFixed(2);


    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation("commands", "analysis.analysis", interaction.locale),
                fields: [
                    {
                        name: getTranslation("commands", "analysis.nodeUptime", interaction.locale),
                        value: `${intlNumber(process.uptime())}s`,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.clientUptime", interaction.locale),
                        value: `${intlNumber(interaction.client.uptime / 1000)}s`,
                        inline: true
                    },
                    {
                        name: `${getTranslation("commands", "analysis.websocket", interaction.locale)} (${websocketStates[interaction.client.ws.status]})`,
                        value: `${interaction.client.ws.ping}ms (avg)`,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.shard", interaction.locale),
                        value: `${interaction.client.shard?.count || "0"}`,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.ram", interaction.locale),
                        value: `${byteToMB(memoryUsage)}/${byteToMB(totalMemory)} (${memoryRate}%)`,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.platform", interaction.locale),
                        value: process.platform,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.cores", interaction.locale),
                        value: `${cpus().length}`,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.nodeVersion", interaction.locale),
                        value: process.version,
                        inline: true
                    },
                    {
                        name: getTranslation("commands", "analysis.discordJSVersion", interaction.locale),
                        value: `v${require("discord.js").version}`,
                        inline: true
                    }
                ],
            })
        ]
    });
}