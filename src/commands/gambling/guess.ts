import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Component, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import { guess } from "../../constants/emojis";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('guess')
    .setNameLocalization('tr', 'tahmin')
    .setDescriptionLocalization('tr', '1 mi 2 mi?')
    .setDescription('1 or 2?')
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

        let guess1 = new ButtonBuilder()
            .setEmoji(guess["1"])
            .setCustomId(`guess.select.${interaction.user.id}.1.${amount}`)
            .setStyle(ButtonStyle.Secondary);

        let guess2 = new ButtonBuilder()
            .setEmoji(guess["2"])
            .setCustomId(`guess.select.${interaction.user.id}.2.${amount}`)
            .setStyle(ButtonStyle.Secondary);

        const res = await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: `${guess.guess} ${getTranslation("commands", "guess.title", interaction.locale)}`,
                    content: getTranslation("commands", "guess.description", interaction.locale)
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    guess1,
                    guess2
                ) as any
            ]
        });

        // Disable buttons after 30 second idle
        const collector = res.createMessageComponentCollector({ idle: 30000, dispose: true, filter: i => i.user.id === interaction.user.id });

        collector.on('end', async () => {
            try {
                const msg = await interaction.fetchReply();

                if (msg && msg.editable)
                    await msg.edit({
                        components: [
                            new ActionRowBuilder().addComponents(
                                msg.components[0].components.map((c: Component) => {
                                    return {
                                        ...c,
                                        disabled: true
                                    }
                                }) as any
                            ) as any
                        ]
                    });
            } catch (error: any) {
                console.log(error?.code, error?.rawError?.message)
            }

            collector.stop();
        });
    } catch (error) {
        console.error(error);
    }
}