import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import User from "../models/User";
import { InferSchemaType } from "mongoose";
import { isAdvancingAvailable } from "../helpers/work";
import { animalEmojis, canBeButcherAnimals, getAvailableTransports, getTransportFields, listOfRefrigerator, transports } from "../helpers/economy/butcher";
import Log from "../models/Log";
import { butcher as ButcherEmojis } from "../constants/emojis";
import getTranslation from "../helpers/i18n";

export async function Butcher(interaction: ButtonInteraction) {
    try {
        const [_, subaction, id] = interaction.customId.split('.');

        if (id !== interaction.user.id) {
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

        const actions = {
            order
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidSubcommand", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await request(interaction, user);
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }
}

const availableAnimals = [
    'cow', 'sheep', 'chicken'
]

const lootIDS = {
    "cow": 25,
    "sheep": 26,
    "chicken": 27
}

async function order(
    interaction: ButtonInteraction,
    user: InferSchemaType<typeof User.schema>
) {
    try {

        if (!user.job || !user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noJob", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (user.job.name !== 'Kasap') {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.invalidJob", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const transport = interaction.customId.split('.')[3];

        if (!availableAnimals.includes(transport)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.invalidAnimal", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const renewal = (user.butcher?.transports as any)?.[transport as any]?.renewal;

        if (renewal && new Date(renewal).getTime() > Date.now()) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.youNeedToWait", interaction.locale, {
                            time: Math.floor(renewal.getTime() / 1000)
                        })
                    })
                ],
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        if (!(user as any)?.butcher?.storage?.[transport] && !user?.butcher?.storage) {
            user.butcher.storage = { cow: 0, sheep: 0, chicken: 0 };
        }

        if ((user as any)?.butcher?.storage?.[transport] >= 100) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.refridgeratorAnimalLimit", interaction.locale, {
                            limit: 100
                        })
                    })
                ],
                ephemeral: true
            });
        }

        const trnsprt = transports.find(t => t.name === transport);

        if (!trnsprt) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.error", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (user.wallet.seth < trnsprt.price) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.notEnoughMoney", interaction.locale, {
                            price: trnsprt.price
                        })
                    })
                ],
                ephemeral: true
            });
        }

        user.wallet.seth -= trnsprt.price;

        (user as any).markModified('wallet');

        (user as any).butcher.storage[transport] = Math.min((user.butcher.storage as any)[transport] + 5, 100);

        (user.butcher.transports as any)[transport].renewal = new Date(Date.now() + trnsprt.cooldown);

        (user as any).markModified('butcher.transports');
        (user as any).markModified('butcher.storage');

        user.workExperience = Math.max(user.workExperience || 0, 0) + 1;

        await isAdvancingAvailable(user, interaction.client);
        await (user as any).save();

        await (new Log({
            type: 'butcher',
            from: user.id,
            to: "0".repeat(17),
            amount: trnsprt.price,
        })).save();


        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {

            const availableTransports = getAvailableTransports(user);

            const buttons = new ActionRowBuilder()
                .addComponents(
                    availableTransports.map(transport => new ButtonBuilder()
                        .setCustomId(`butcher.order.${interaction.user.id}.${transport.name}`)
                        .setEmoji(transport.emoji)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(transport.disabled)
                    )
                );

            const butcherAnimals = canBeButcherAnimals(user);

            const butcher = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`butcher.select.${interaction.user.id}`)
                        .setPlaceholder(getTranslation("commands", "butcher.butcherAnimal", interaction.locale))
                        .setMinValues(1)
                        .setMaxValues(1)
                        .setOptions(butcherAnimals.on.map(animal => ({
                            value: String(animal),
                            label: getTranslation("general", animal, interaction.locale),
                            emoji: animalEmojis[animal],
                            description: `${getTranslation("commands", "butcher.availableAnimals", interaction.locale)}: ${(user.butcher?.storage as any)?.[animal] || 0}`
                        })))
                )

            const refrigerators = listOfRefrigerator(user);

            const refrigerator = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`butcher.refrigerator.${interaction.user.id}`)
                        .setPlaceholder(getTranslation("global", "refrigerators", interaction.locale))
                        .setMinValues(1)
                        .setMaxValues(1)
                        .setOptions(refrigerators.map(refrigerator => ({
                            value: refrigerator.value,
                            label: refrigerator.name,
                            emoji: ButcherEmojis.refrigerator,
                            // description: refrigerator.description
                        })))
                )

            await msg.edit({
                embeds: [
                    EmbedBuilder.from(msg.embeds[0])
                        .setFields(
                            getTransportFields(user, interaction.locale === 'tr' ? 'tr' : 'en-US')
                        )

                ],
                components: [
                    buttons as any,
                    ...(butcherAnimals.on.length ? [butcher] : []),
                    ...(refrigerators.length ? [refrigerator] : []),
                ]
            });

        }
    } catch (e) {
        console.log(e);
        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.error", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        } catch (e) { }
    }
}
