import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuInteraction } from "discord.js";
import User from "../models/User";
import Job from "../models/Job";
import { InferSchemaType } from "mongoose";
import getTranslation from "../helpers/i18n";
import { JobEmojis } from "../constants/emojis";

export const name = 'jobs';

export async function execute(interaction: StringSelectMenuInteraction) {
    try {
        const ownerID = interaction.customId.split('.')[2];

        if (interaction.user.id !== ownerID) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (user.job && user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "job.alreadyHasJob", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const jobName = interaction.values[0];

        const job = await Job.findOne({
            name: jobName
        });

        if (!job) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidJob", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const yes = new ButtonBuilder()
            .setCustomId(`jobs.confirm.${interaction.user.id}.${jobName}`)
            .setLabel(getTranslation("global", "yes", interaction.locale))
            .setStyle(ButtonStyle.Danger);

        const msg = await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("commands", "job.ask", interaction.locale, {
                        job: job.name
                    }).replace('$job', JobEmojis[job.name] || job.name)
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(yes) as any
            ],
            ephemeral: true
        });

        const collector = msg.createMessageComponentCollector({
            time: 1000 * 15,
            filter: i => i.customId === `jobs.confirm.${interaction.user.id}.${jobName}` && i.user.id === interaction.user.id
        });

        async function chooseJob(user: InferSchemaType<typeof User.schema>, job: InferSchemaType<typeof Job.schema>) {
            try {
                user.job = job;
                await (user as any).save();
            } catch (error) {
                console.log(error);
            }
        }


        collector.on('collect', async i => {
            try {
                await i.deferUpdate();

                await chooseJob(user, job);

                await i.followUp({
                    content: `You are now a ${job.name}`
                });
            } catch (error) {
                console.log(error);
            }
        });

        collector.on('end', async () => {
            try {

                const msg = await interaction.fetchReply();

                if (msg && msg.editable) {
                    await msg.edit({
                        components: [
                            new ActionRowBuilder().addComponents(yes.setDisabled(true)) as any
                        ]
                    });
                }

            } catch (error) {
                console.log(error);
            }

        });

    } catch (error) {
        console.log(error);
    }
}