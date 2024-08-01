import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import User from "../models/User";
import Log from "../models/Log";
import { guess, seth } from "../constants/emojis";
import { Colors } from "../helpers/embed";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";
import { checkLevelUp } from "../helpers/level";

export default async function Guess(interaction: ButtonInteraction) {
    try {
        let [id, selection, amount]: any[] = interaction.customId.split("guess.select.")?.[1].split(".");

        if (id !== interaction.user.id) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        selection = parseInt(selection);
        amount = parseInt(amount);

        if (isNaN(selection) || selection < 1 || selection > 2) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidSelection", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "account.noAccount", interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        if (amount < 1 || isNaN(amount)) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]

                });

            return;
        }

        if (amount > user.wallet.seth) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.insufficientBalance", interaction.locale)
                        })
                    ]

                });

            return;
        }

        const isWon = Math.random() > 0.5;
        const reward = isWon ? amount : -amount;

        if (isWon) {
            await increaseActionCount(interaction.client, user as any, "guess");
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

        const description = getTranslation("commands", isWon ? "guess.win" : "guess.lose", interaction.locale, {
            amount,
            reward: Math.abs(reward),
        })
            .replace("$selection",
                selection === 1
                    ? guess["1"]
                    : guess["2"]
            )

        let buttons = [
            new ButtonBuilder()
                .setEmoji(guess["1"])
                .setCustomId(`guess.select.${interaction.user.id}.1.${amount}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setEmoji(guess["2"])
                .setCustomId(`guess.select.${interaction.user.id}.2.${amount}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        ]

        buttons[selection - 1] = buttons[selection - 1].setStyle(
            isWon
                ? ButtonStyle.Success
                : ButtonStyle.Danger
        );

        const msg = await interaction.message.fetch(true);

        if (msg && msg.editable)
            await msg.edit({
                embeds: [
                    interaction.client.embedManager.Info({
                        title: getTranslation("commands", "guess.title", interaction.locale),
                        content: description
                    }).setColor(isWon ? Colors.Success : Colors.Error)
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        ...buttons
                    ) as any
                ]
            });

        if (!interaction.replied)
            await interaction.deferUpdate();
    } catch (e) {
        console.log(e);
    }
}