import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import User from "../models/User";
import { PopulatedUser } from "../models/User";
import { animalEmojis, animalLootIDS, canBeButcherAnimals, getAvailableTransports, getTransportFields, listOfRefrigerator, transports } from "../helpers/economy/butcher";
import Loot from "../models/Loot";
import { butcher as ButcherEmojis } from "../constants/emojis";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";

export const name = 'butcher';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: StringSelectMenuInteraction) {
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

        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item');

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
            select,
            refrigerator
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidAction", interaction.locale)
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

export async function refrigerator(interaction: StringSelectMenuInteraction, user: PopulatedUser) {
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

    const selectedRefrigeratorID = parseInt(interaction.values[0]);

    if (isNaN(selectedRefrigeratorID) || selectedRefrigeratorID < 0 || selectedRefrigeratorID > 2) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "butcher.invalidID", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }

    const selectedRefrigerator = user.butcher?.refrigerator?.[selectedRefrigeratorID];

    if (!selectedRefrigerator) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "butcher.invalidID", interaction.locale)
                })
            ],
            ephemeral: true
        });
    }

    const fields = [];

    for (const transport of transports) {
        fields.push({
            name: (ButcherEmojis as any)[transport.name].meat,
            value: `${(selectedRefrigerator as any)[transport.name] || 0}`,
            inline: true
        });
    }

    const embed = interaction.client.embedManager.Info({
        title: `${getTranslation("global", "refrigerator", interaction.locale)} #${selectedRefrigeratorID + 1}`,
        content: getTranslation("commands", "butcher.spaceLeft", interaction.locale, {
            total: selectedRefrigerator.total,
            capacity: selectedRefrigerator.capacity
        }),
        fields
    })

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function select(interaction: StringSelectMenuInteraction, user: PopulatedUser) {
    try {
        const animal = interaction.values[0] as keyof typeof user.butcher.storage;

        if (!transports.find(t => t.name === animal)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.invalidAnimal", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const onStorage = user.butcher?.storage?.[animal] || 0;

        if (onStorage < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.notEnough", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const availableSpaceOnRefrigerators = user.butcher?.refrigerator?.map(r => r.capacity - r.total) || [];

        const totalAvailableSpace = availableSpaceOnRefrigerators.reduce((acc, curr) => acc + curr, 0);

        if (totalAvailableSpace < 1) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.notEnoughSpace", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        /* const hasCleaver = user.inventory.tools.find(i => i.tool.title === 'Satır');
        
        if (!hasCleaver) {
            return await interaction.reply({ 
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.dontHaveCleaver
                    })
                ], 
                ephemeral: true
            });
        }
    
        hasCleaver.durability -= 1;
    
        if (hasCleaver.durability < 1) {
            user.inventory.tools = user.inventory.tools.filter(i => i.durability > 0);
        } */

        let toBePlaced = Math.min(Math.min(totalAvailableSpace, onStorage), 5);
        (user as any).butcher.storage[animal] -= toBePlaced;

        (user as any).markModified('butcher.storage');

        let i = 0;

        while (toBePlaced > 0 && i < user.butcher?.refrigerator?.length) {
            const refrigerator = user.butcher?.refrigerator?.[i++];

            if (!refrigerator) {
                break;
            }

            const space = refrigerator.capacity - refrigerator.total;

            if (space < 1) {
                continue;
            }

            const amount = Math.min(space, toBePlaced);

            toBePlaced -= amount;

            refrigerator.total += amount;
            (refrigerator as any)[animal] = (refrigerator[animal] || 0) + amount;
        }

        const item = await Loot.findOne({ id: animalLootIDS[animal] });

        if (!item) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "butcher.cannotFoundItem", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const loot = user.inventory.loots.find(l => l.loot.id === item.id);

        if (loot) {
            loot.amount += toBePlaced;
        } else {
            user.inventory.loots.push({ loot: item, amount: toBePlaced });
        }

        await increaseActionCount(interaction.client, user, "work");

        user.workExperience = (user.workExperience || 0) + 1;

        (user as any).markModified('inventory.loots');

        interaction.deferUpdate();

        await (user as any).save();

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            const embed = EmbedBuilder.from(msg.embeds[0])
                .setFields(getTransportFields(user as any, interaction.locale === 'tr' ? 'tr' : 'en-US'));

            const availableTransports = getAvailableTransports(user as any);

            const buttons = new ActionRowBuilder()
                .addComponents(
                    availableTransports.map(transport => new ButtonBuilder()
                        .setCustomId(`butcher.order.${interaction.user.id}.${transport.name}`)
                        .setEmoji(transport.emoji)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(transport.disabled)
                    )
                );

            const butcherAnimals = canBeButcherAnimals(user as any);

            const butcher = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`butcher.select.${interaction.user.id}`)
                        .setPlaceholder(getTranslation("commands", "butcher.butcherAnimal", interaction.locale))
                        .setMinValues(1)
                        .setMaxValues(1)
                        .setOptions(
                            ...butcherAnimals.on.map(animal => ({
                                value: String(animal),
                                label: getTranslation("global", animal, interaction.locale),
                                emoji: animalEmojis[animal],
                                description: `${getTranslation("commands", "butcher.availableAnimals", interaction.locale)}: ${(user.butcher?.storage as any)?.[animal] || 0}`
                            }))
                        )
                )

            const refrigerators = listOfRefrigerator(user as any);

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
                            //description: refrigerator.description
                        })))
                )

            await msg.edit({
                embeds: [embed],
                components: [
                    buttons as any,
                    ...(butcherAnimals.on.length ? [butcher] : []),
                    ...(refrigerators.length ? [refrigerator] : []),
                ]
            });
        }


    } catch (e) {
        console.log(e);

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