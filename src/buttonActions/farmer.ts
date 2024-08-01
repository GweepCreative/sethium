import { ActionRowBuilder, ButtonInteraction, Embed, EmbedBuilder } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import { createPlantingSelectMenu, listOfGrowedVegetables, primaryActionButtons, renderZones } from "../helpers/economy/farmer";
import { availableVegetables, vegetableNames } from "../constants/farmer";
import Loot from "../models/Loot";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";

export async function Farmer(interaction: ButtonInteraction) {
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
            .populate("inventory.loots.loot")
            .populate("farmer.zones.seed") as any as PopulatedUser;

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
            plow,
            water,
            plant,
            select,
            harvest
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



async function plow(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        await interaction.deferUpdate();

        let isEdited = false;

        user.farmer.zones = user.farmer.zones.map((zone) => {
            if (zone.status === "dried") {
                zone.status = "plowed";
                zone.lastAction = new Date();
                isEdited = true;
            }

            return zone;
        });

        if (isEdited) {
            user.markModified("farmer.zones");
            await user.save();
        }

        const primaryAction = primaryActionButtons(user, interaction.locale);

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await interaction.message.edit({
                embeds: [
                    EmbedBuilder.from(interaction.message.embeds[0] as Embed)
                        .setDescription(renderZones(user, interaction.locale))
                ],
                components: [
                    ...primaryAction.map(button => button.button).map(button => new ActionRowBuilder().addComponents(button) as any)
                ]
            });
        }
    } catch (error) {
        console.log(error);

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

async function water(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {

        await interaction.deferUpdate();

        let isEdited = false;

        user.farmer.zones = user.farmer.zones.map((zone) => {
            if (zone.status === "plowed") {
                zone.status = "watered";
                zone.lastAction = new Date();
                isEdited = true;
            }

            return zone;
        });

        if (isEdited) {
            user.markModified("farmer.zones");
            await user.save();
        }

        const primaryAction = primaryActionButtons(user, interaction.locale);

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            await interaction.message.edit({
                embeds: [
                    EmbedBuilder.from(interaction.message.embeds[0] as Embed)
                        .setDescription(renderZones(user, interaction.locale))
                ],
                components: [
                    ...primaryAction.map(button => button.button).map(button => new ActionRowBuilder().addComponents(button) as any)
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

async function plant(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    const selectMenu = await createPlantingSelectMenu(user, interaction.locale);

    await interaction.reply({
        components: [
            new ActionRowBuilder().addComponents(selectMenu.selectMenu) as any
        ]
    });
}

async function select(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {
        const parsed = interaction.customId.split('.').slice(3);
        const zoneIndex = parseInt(parsed[0]);
        const seed = parsed[1];

        if (!availableVegetables.includes(seed as any)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.cannotFindThisVegetable", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (isNaN(zoneIndex) || zoneIndex < 0 || zoneIndex >= 9) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.invalidZoneIndex", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const zone = user.farmer.zones[zoneIndex];

        if (!zone) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.invalidZoneIndex", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (zone.seed || zone.status === "planted") {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.alreadyPlanted", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        if (zone.status !== "watered") {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.zoneNotReady", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const name = vegetableNames[seed];

        if (!name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.cannotFindThisVegetable", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        const vegetable = await Loot.findOne({
            title: name,
            job: "Çiftçi"
        });

        if (!vegetable) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.cannotFindThisVegetable", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        user.farmer.zones[zoneIndex] = {
            seed: vegetable,
            status: "planted",
            lastAction: new Date()
        };

        user.markModified("farmer.zones");
        await user.save();

        const fetched = await interaction.message.fetch();

        const referance = fetched.reference?.messageId ? fetched.reference.messageId : fetched.id;

        const msg = await interaction.channel?.messages.fetch(referance);

        if (msg && msg.editable) {
            const primaryAction = primaryActionButtons(user, interaction.locale);

            await msg.edit({
                embeds: [
                    EmbedBuilder.from(msg.embeds[0] as Embed)
                        .setDescription(renderZones(user, interaction.locale))
                ],
                components: [
                    ...primaryAction.map(button => button.button).map(button => new ActionRowBuilder().addComponents(button) as any)
                ]
            });

            await fetched.delete();
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


async function harvest(
    interaction: ButtonInteraction,
    user: PopulatedUser
) {
    try {


        const growedVegetables = listOfGrowedVegetables(user);

        if (!growedVegetables.length) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "farmer.nothingToHarvest", interaction.locale)
                    })
                ],
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        for (const index of growedVegetables) {
            const zone = user.farmer.zones[index];

            if (!zone || !zone?.seed) continue;

            const isExistsOnInventory = user.inventory.loots.findIndex(loot => loot.loot.title === zone.seed?.title);

            if (isExistsOnInventory === -1) {
                user.inventory.loots.push({
                    loot: zone.seed,
                    amount: 1
                });
            } else {
                user.inventory.loots[isExistsOnInventory].amount += 1;
            }

            user.farmer.zones[index] = {
                status: "dried",
                lastAction: new Date()
            };
        }

        await increaseActionCount(interaction.client, user, "work");

        user.markModified("inventory.loots");
        user.markModified("farmer.zones");
        await user.save();

        const msg = await interaction.message.fetch();

        if (msg && msg.editable) {
            const primaryAction = primaryActionButtons(user, interaction.locale);

            await msg.edit({
                embeds: [
                    EmbedBuilder.from(msg.embeds[0] as Embed)
                        .setDescription(renderZones(user, interaction.locale))
                ],
                components: [
                    ...primaryAction.map(button => button.button).map(button => new ActionRowBuilder().addComponents(button) as any)
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