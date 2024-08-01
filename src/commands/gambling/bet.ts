import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import Log from "../../models/Log";
import { seth } from "../../constants/emojis";
import { Colors } from "../../helpers/embed";
import getTranslation from "../../helpers/i18n";
import { increaseActionCount } from "../../helpers/user/achievements";
import { checkLevelUp } from "../../helpers/level";

export const data = new SlashCommandBuilder()
    .setName('bet')
    .setNameLocalization('tr', 'bahis')
    .setDescriptionLocalization('tr', 'Bahis yapar')
    .setDescription('Make a bet')
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
            }
            );
        }

        const limit = user.premium.status ? 50000 : 25000;

        const intl = new Intl.NumberFormat(interaction.locale).format;

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

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: getTranslation("commands", "bet.title", interaction.locale),
                    content: getTranslation("commands", "bet.description", interaction.locale, {
                        amount: `**${intl(amount)}**`
                    }).replaceAll("$seth", seth)
                })
            ], fetchReply: true
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const isWon = Math.random() > 0.5;
        const reward = isWon ? amount : -amount;

        if (isWon) {
            await increaseActionCount(interaction.client, user as any, "bet");
        }

        user.wallet.seth += reward;
        checkLevelUp(interaction.client, user as any, (isWon ? 3 : 1));
        await user.save();

        await (new Log({
            from: isWon ? "00000000000000000" : user.id,
            to: isWon ? user.id : "00000000000000000",
            type: "guess",
            amount: Math.abs(reward)
        }).save());

        try {
            const msg = await interaction.fetchReply();
            if (msg && msg.editable) {
                await msg.edit({
                    embeds: [
                        interaction.client.embedManager.Info({
                            title: getTranslation("commands", "bet.title", interaction.locale),
                            content: getTranslation("commands", isWon ? "bet.win" : "bet.lose", interaction.locale, {
                                amount: `**${intl(amount)}**`,
                                reward: `**${intl(reward * 2)}**`
                            }).replaceAll("$seth", seth)
                        }).setColor(isWon ? Colors.Green : Colors.Red)
                    ]
                });
            }
        } catch (error) {
            // console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
}