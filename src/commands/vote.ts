import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import getTranslation from "../helpers/i18n";
import User from "../models/User";

export const data = new SlashCommandBuilder()
    .setName('oy')
    .setNameLocalization("en-US", "vote")
    .setDescription('Botu oylayarak bize destek olabilirsiniz')
    .setDescriptionLocalization("en-US", 'You can support us by voting for the bot');

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'account.noAccount', interaction.locale)
                    })
                ]
            });
        }

        const twelveHoursInMilliseconds = 12 * 60 * 60 * 1000;
        const lastVote = new Date(user.votes[user.votes.length - 1] as any ?? (Date.now() - twelveHoursInMilliseconds));

        const timePassed = Date.now() - lastVote.getTime();
        console.log(user.votes,timePassed, lastVote.getTime(), Date.now(), timePassed > twelveHoursInMilliseconds);
        const isTwelveHoursPassed = (Date.now() - lastVote.getTime()) > twelveHoursInMilliseconds;

        if (!isTwelveHoursPassed) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Info({
                        title: getTranslation('commands', 'vote.voted.title', interaction.locale),
                        content: getTranslation('commands', 'vote.voted.description', interaction.locale)
                    }).setFooter({
                        text: getTranslation('commands', 'vote.voteCount', interaction.locale, {
                            count: user.votes.length
                        })
                    })
                ]
            });
        }

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Info({
                    title: getTranslation('commands', 'vote.vote.title', interaction.locale),
                    content: getTranslation('commands', 'vote.vote.description', interaction.locale, {
                        id: interaction.client.user.id
                    })
                }).setFooter({
                    text: getTranslation('commands', 'vote.voteCount', interaction.locale, {
                        count: user.votes.length
                    }),
                    iconURL: interaction.user.displayAvatarURL()
                })
            ]
        });
    } catch (error) {
        console.log(error);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'global.error', interaction.locale)
                })
            ]
        });
    }
}