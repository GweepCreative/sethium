import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import { dices, seth } from "../../constants/emojis";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('dice')
    .setNameLocalization('tr', 'zar')
    .setDescriptionLocalization('tr', 'Zar atar')
    .setDescription('Rolls a dice')
    .addNumberOption(option =>
        option.setName('amount')
            .setDescription('The amount you want to bet')
            .setDescriptionLocalization('tr', 'Bahis miktarı')
            .setRequired(true)
    );

export const timeout = 15000;

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const intl = new Intl.NumberFormat(interaction.locale, {
            notation: "compact"
        }).format;
   
        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ]
            });
        }

        const amount = interaction.options.getNumber('amount', true);

        if (amount < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                    })
                ]
            });
        }

        if (amount > user.wallet.seth) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.infussicientBalance", interaction.locale)
                    })
                ]
            });
        }

        const limit = user.premium.status ? 50000 : 25000;

        if (amount> limit) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.excessedLimit", interaction.locale, {
                            limit: `**${intl(limit)}**`
                        })
                    })
                ]
            });
        }

        let dicelist = Array.from({ length: 6 }, (_, i) => i + 1).map(
            i => new ButtonBuilder()
                .setCustomId(`dice.select.${interaction.user.id}.${i}.${amount}`)
                .setEmoji(dices[String(i)])
                .setStyle(ButtonStyle.Secondary)
        );

        const res = await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: `${dices.normal} ${getTranslation("commands", "dice.title", interaction.locale)}`,
                    content: getTranslation("commands", "dice.description", interaction.locale, {
                        amount: `**${intl(amount)}**`
                    }).replaceAll("$seth", seth)
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(dicelist.slice(0, 3)) as any,
                new ActionRowBuilder().addComponents(dicelist.slice(3, 6)) as any
            ]
        });

        // Disable buttons after 30 second idle
        const collector = res.createMessageComponentCollector({ idle: 30000, dispose: true, filter: i => i.user.id === interaction.user.id });

        collector.on('end', async () => {
            try {
                const msg = await interaction.fetchReply();

                if (msg && msg.editable) {

                    // Recrate buttons from the message and keep style same
                    const components = msg.components.map(row => row.components.map(
                        (button: any) => new ButtonBuilder()
                            .setCustomId(button.customId)
                            .setEmoji(button.emoji)
                            .setStyle(button.style)
                            .setDisabled(true)
                    ));

                    await msg.edit({ components: [
                        new ActionRowBuilder().addComponents(components[0]) as any,
                        new ActionRowBuilder().addComponents(components[1]) as any
                    ] });
                }
            } catch (error: any) {
                console.log(error?.code, error?.rawError?.message)
            }

            collector.stop();
        });
    } catch (error) {
        console.error(error);
    }
}