import { ButtonInteraction, EmbedBuilder } from "discord.js";
import User from "../models/User";
import Log from "../models/Log";
import BlackjackModel from "../models/Blackjack";
import { deckValue, renderEmbed } from "../helpers/gamble/blackjack";
import { Colors } from "../helpers/embed";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";
import { checkLevelUp } from "../helpers/level";

export default async function Blackjack(interaction: ButtonInteraction) {
    try {
        let [action, id]: any[] = interaction.customId.split("blackjack.")?.[1].split(".");

        if (id !== interaction.user.id) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation('errors', 'account.notYourAccount', interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        const user = await User.findOne({ id });

        if (!user) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation('errors', 'account.noAccount', interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        const game = await BlackjackModel.findOne({ userId: id, active: true });

        if (!game) {
            if (!interaction.replied)
                await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation('errors', 'blackjack.noAvailableGame', interaction.locale)
                        })
                    ],
                    ephemeral: true
                });

            return;
        }

        if (action === 'stop') {
            game.active = false;

            let dealerValue = deckValue(game.dealerCards);
            const userValue = deckValue(game.userCards);

            if (dealerValue < 17) {
                const fullDeck = Array.from({ length: 13 }, (_, i) => i + 1);

                while (dealerValue < 17) {
                    const newCardOfDealer = fullDeck.filter(c => !game.dealerCards.includes(c))[
                        Math.floor(Math.random() * (13 - game.dealerCards.length))
                    ];

                    game.dealerCards.push(newCardOfDealer);

                    dealerValue = deckValue(game.dealerCards);
                }
            }

            const isDealerBusted = dealerValue > 21;
            const isUserBusted = userValue > 21;

            game.active = false;
            await BlackjackModel.updateOne({ userId: id, active: true }, { active: false });

            let status = '🎲 ~ Something is wrong'
            let isWon = false;

            if (isDealerBusted && isUserBusted) {
                status = getTranslation('commands', 'blackjack.gameBust', interaction.locale)
                user.wallet.seth += game.bet;
            } else if (dealerValue === userValue) {
                status = getTranslation('commands', 'blackjack.gameTie', interaction.locale)
                user.wallet.seth += game.bet;
            } else if (isUserBusted) {
                status = getTranslation('commands', 'blackjack.gameLost', interaction.locale, {
                    amount: game.bet
                })
            } else if (isDealerBusted) {
                status = getTranslation('commands', 'blackjack.gameWon', interaction.locale, {
                    amount: game.bet
                })
                isWon = true;
            } else if (dealerValue > userValue) {
                status = getTranslation('commands', 'blackjack.gameLost', interaction.locale, {
                    amount: game.bet
                })
            } else {
                status = getTranslation('commands', 'blackjack.gameWon', interaction.locale, {
                    amount: game.bet
                })
                isWon = true;
            }

            if (isWon) {
                await increaseActionCount(interaction.client, user as any, "blackjack");
                user.wallet.seth += game.bet * 2;
                await (new Log({
                    from: "00000000000000000",
                    to: user.id,
                    type: "blackjack",
                    amount: game.bet * 2
                }).save());
            }
            checkLevelUp(interaction.client, user as any, (isWon ? 3 : 1));
            await user.save();
            await game.save();

            if (!interaction.replied)
                await interaction.message.edit({
                    embeds: [
                        EmbedBuilder.from(interaction.message.embeds[0])
                            .setColor(isWon ? Colors.Green : (
                                isUserBusted && isDealerBusted ? Colors.Grey
                                : dealerValue === userValue ? Colors.Grey
                                : Colors.Red
                            ))
                            .setFields(
                                renderEmbed(interaction, game).fields
                            )
                            .setFooter({
                                text: status
                            })
                    ], components: []
                });

            return await interaction.deferUpdate();
        }

        game.round++;

        const fullDeck = Array.from({ length: 13 }, (_, i) => i + 1);

        const newCardOfUser = fullDeck.filter(c => !game.userCards.includes(c))[
            Math.floor(Math.random() * (13 - game.userCards.length))
        ];

        const newCardOfDealer = fullDeck.filter(c => !game.dealerCards.includes(c))[
            Math.floor(Math.random() * (13 - game.dealerCards.length))
        ];

        game.userCards.push(newCardOfUser);
        game.dealerCards.push(newCardOfDealer);

        const dealerValue = deckValue(game.dealerCards);
        const userValue = deckValue(game.userCards);

        const isDealerBusted = dealerValue > 21;
        const isUserBusted = userValue > 21;

        if (isUserBusted || (isDealerBusted && game.round > 0)) {
            game.active = false;
            await BlackjackModel.updateOne({ userId: id, active: true }, { active: false });

            let status = getTranslation('errors', 'blackjack.somethingIsWrong', interaction.locale)
            let isWon = false;

            if (isDealerBusted && isUserBusted) {
                status = getTranslation('commands', 'blackjack.gameBust', interaction.locale)
                user.wallet.seth += game.bet;
            } else if (isDealerBusted) {
                status = getTranslation('commands', 'blackjack.gameWon', interaction.locale, {
                    amount: game.bet
                })
                isWon = true;
            } else if (dealerValue === 21) {
                status = getTranslation('commands', 'blackjack.gameLost', interaction.locale, {
                    amount: game.bet
                })
            } else {
                status = getTranslation('commands', 'blackjack.gameLost', interaction.locale, {
                    amount: game.bet
                })
            }

            if (isWon) {
                await increaseActionCount(interaction.client, user as any, "blackjack");
                user.wallet.seth += game.bet * 2;
                await (new Log({
                    from: "00000000000000000",
                    to: user.id,
                    type: "blackjack",
                    amount: game.bet * 2
                }).save());
            }
            checkLevelUp(interaction.client, user as any, (isWon ? 3 : 1));
            await user.save();

            if (!interaction.replied)
                await interaction.message.edit({
                    embeds: [
                        EmbedBuilder.from(interaction.message.embeds[0])
                            .setColor(isWon ? Colors.Green : 
                                isUserBusted && isDealerBusted ? Colors.Grey
                                : dealerValue === userValue ? Colors.Grey
                                : Colors.Red)
                            .setFields(
                                renderEmbed(interaction, game).fields
                            )
                            .setFooter({
                                text: status
                            })
                    ], components: []
                });

            return await interaction.deferUpdate();
        }

        if (dealerValue === 21 || userValue === 21) {
            game.active = false;
            await BlackjackModel.updateOne({ userId: id, active: true }, { active: false });

            let status = '🎲 ~ Something is wrong'
            let isWon = false;

            if (userValue === 21) {
                status = getTranslation('commands', 'blackjack.gameWon', interaction.locale, {
                    amount: game.bet
                })
                isWon = true;
            } else {
                status = getTranslation('commands', 'blackjack.gameLost', interaction.locale, {
                    amount: game.bet
                })
            }

            if (isWon) {
                await increaseActionCount(interaction.client, user as any, "blackjack");
                user.wallet.seth += game.bet * 2;
                await (new Log({
                    from: "00000000000000000",
                    to: user.id,
                    type: "blackjack",
                    amount: game.bet * 2
                }).save());
            }
            checkLevelUp(interaction.client, user as any, (isWon ? 3 : 1));
            await user.save();

            if (!interaction.replied)
                await interaction.message.edit({
                    embeds: [
                        EmbedBuilder.from(interaction.message.embeds[0])
                            .setColor(isWon ? Colors.Green : 
                                isUserBusted && isDealerBusted ? Colors.Grey
                                : dealerValue === userValue ? Colors.Grey
                                : Colors.Red)
                            .setFields(
                                renderEmbed(interaction, game).fields
                            )
                            .setFooter({
                                text: status
                            })
                    ], components: []
                });

            return await interaction.deferUpdate();
        }

        await game.save();

        if (!interaction.replied)
            await interaction.message.edit({
                embeds: [
                    EmbedBuilder.from(interaction.message.embeds[0])
                        .setFields(
                            renderEmbed(interaction, game).fields
                        )
                ]
            });

        return await interaction.deferUpdate();

    } catch (e) {
        console.log(e);
    }
}