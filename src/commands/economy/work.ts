import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Message, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import { InferSchemaType } from "mongoose";
import Loot from "../../models/Loot";
import Job from "../../models/Job";
import Item from "../../models/Item";
import { animalEmojis, canBeButcherAnimals, getAvailableTransports, getTransportFields, listOfRefrigerator } from "../../helpers/economy/butcher";
import { butcher as ButcherEmojis, ToolsEmojis, chef } from "../../constants/emojis";
import { getNearestVegetableGrow, primaryActionButtons, renderZones } from "../../helpers/economy/farmer";
import createChefEmbed from "../../helpers/economy/chef";
import { Colors } from "../../helpers/embed";
import getTranslation from "../../helpers/i18n";
import { TOOL_IDS } from "../../constants/shop";

export const data = new SlashCommandBuilder()
    .setName('work')
    .setNameLocalization('tr', 'çalış')
    .setDescription('Work to earn money')
    .setDescriptionLocalization('tr', 'Para kazanmak için çalışın')

export const timeout = 1000 * 30;

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {

    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('farmer.zones.seed')
            .populate('inventory.loots.loot')
            .populate('inventory.items.item')
            .exec() as any as PopulatedUser;

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'account.noAccount', interaction.locale)
                    })
                ]
            });
        }

        if (!user.job || !user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'account.noJob', interaction.locale)
                    })
                ]
            });
        }

        if (user.tutorial === 2) {
            user.tutorial = 3;
            await user.save();
        }

        const subcommands = {
            "Madenci": {
                execute: mining
            },
            "Demirci": {
                execute: produce
            },
            "Balıkçı": {
                execute: fishing
            },
            "Kasap": {
                execute: produce
            },
            "Şef": {
                execute: produce
            },
            "Oduncu": {
                execute: lumberjacking
            },
            "Marangoz": {
                execute: produce
            },
            "Çiftçi": {
                execute: produce
            }
        } as {
            [key: string]: {
                identifier?: string;
                execute: (interaction: ChatInputCommandInteraction, user: InferSchemaType<typeof User.schema> | PopulatedUser) => Promise<any>;
            }
        };

        if (!(user.job && String(user.job?.name) in subcommands)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'general.invalidJob', interaction.locale)
                    })
                ]
            });
        }


        const request = subcommands?.[String(user.job?.name) as any];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'general.invalidSubcommand', interaction.locale)
                    })
                ]
            });
        }

        return await request.execute(interaction, user);
    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}

async function fishing(interaction: ChatInputCommandInteraction, user: InferSchemaType<typeof User.schema>) {
    try {
        const embed =
            interaction.client.embedManager.Info({
                title: getTranslation('commands', 'fishing.fishing', interaction.locale),
                content: getTranslation('commands', 'fishing.waiting', interaction.locale)
            });

        const fishing_rod = user.inventory.shopItems.find(item => item.id === TOOL_IDS.fishingRod);

        if (!fishing_rod) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                            item: getTranslation('global', 'fishingRod', interaction.locale)
                        }).replace('$itemEmoji', ToolsEmojis.fishingRod)
                    })
                ]
            });
        }

        const buttons = Array.from({ length: 9 }, (_, i) => (
            new ButtonBuilder()
                .setCustomId(`fishing.${interaction.user.id}.${i}`)
                .setEmoji('735753896026308669')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
        ));

        const createRows = (buttons: ButtonBuilder[]) => Array.from({ length: 3 }, (_, i) => (
            new ActionRowBuilder()
                .addComponents(buttons.slice(i * 3, (i + 1) * 3))
        ));

        const reply = await interaction.reply({
            embeds: [embed],
            components: createRows(buttons) as any,
        });

        const fishPlaceToAppear = Math.floor(Math.random() * 9);

        const fishToAppear = (await Loot.aggregate([
            { $match: { job: 'Balıkçı' } },
            { $sample: { size: 1 } }
        ]) as any)?.[0];

        const timeToWait = Math.floor(Math.random() * 7000) + 3000;

        await new Promise(resolve => setTimeout(resolve, timeToWait));

        buttons.forEach(button => button.setDisabled(false));
        

        buttons[fishPlaceToAppear] = buttons[fishPlaceToAppear].setEmoji(fishToAppear.emoji)
            .setCustomId(`fishing.${interaction.user.id}.${fishToAppear?.title}.${Date.now() + 3000}`);

        embed.setDescription(getTranslation('commands', 'fishing.appeared', interaction.locale));

        const messageToEdit = await interaction.fetchReply();

        if (!messageToEdit.editable) return;

        await messageToEdit.edit({
            embeds: [embed],
            components: createRows(buttons) as any,
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const msg = await interaction.fetchReply();

        const isButtonsHasStyle = (message: Message, style: ButtonStyle) => message.components.some(
            row => row.components.some((button: any) => button.style === style)
        );

        if (
            !isButtonsHasStyle(msg, ButtonStyle.Danger) &&
            !isButtonsHasStyle(msg, ButtonStyle.Success)
        ) {
            buttons[fishPlaceToAppear] = buttons[fishPlaceToAppear].setEmoji('❌')
                .setCustomId(`fishing.${interaction.user.id}.${fishPlaceToAppear}`)

            buttons.forEach(button => button.setDisabled(true));

            embed.setDescription(getTranslation('commands', 'fishing.disappeared', interaction.locale));

            await reply.edit({
                embeds: [embed],
                components: createRows(buttons) as any,
            });
        }

        const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.fishingRod && item.durability === fishing_rod.durability);

        if (!fishing_rod.durability) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        } else {
            fishing_rod.durability -= 1;

            if (fishing_rod.durability <= 0) {
                user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
            }
        }

        (user as any).markModified('inventory.shopItems');
        await (user as any).save();
    } catch (error) {
        console.error('Error while fishing:', error);
    }
}


async function mining(interaction: ChatInputCommandInteraction, user: InferSchemaType<typeof User.schema>) {
    try {
        const embed = interaction.client.embedManager.Info({
            title: getTranslation('commands', 'mining.mining', interaction.locale),
            content: getTranslation('commands', 'mining.selectARock', interaction.locale)
        }).setColor(Colors.Grey);

        const pickaxe = user.inventory.shopItems.find(item => item.id === TOOL_IDS.pickaxe);

        if (!pickaxe) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                            item: getTranslation('global', 'pickaxe', interaction.locale)
                        }).replace('$itemEmoji', ToolsEmojis.pickaxe)
                    })
                ]
            });
        }

        const buttons = Array.from({ length: 9 }, (_, i) => (
            new ButtonBuilder()
                .setCustomId(`mining.${interaction.user.id}.${i}`)
                .setEmoji('1213876398180274229')
                .setStyle(ButtonStyle.Secondary)
        ));

        const createRows = (buttons: ButtonBuilder[]) => Array.from({ length: 3 }, (_, i) => (
            new ActionRowBuilder()
                .addComponents(buttons.slice(i * 3, (i + 1) * 3))
        ));

        await interaction.reply({
            embeds: [embed],
            components: createRows(buttons) as any,
        });

        const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.pickaxe && item.durability === pickaxe.durability);

        if (!pickaxe.durability) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        } else {
            pickaxe.durability -= 1;

            if (pickaxe.durability <= 0) {
                user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
            }
        }

        (user as any).markModified('inventory.shopItems');
        await (user as any).save();

    } catch (error) {
        console.error('Error while fishing:', error);
    }
}


async function lumberjacking(interaction: ChatInputCommandInteraction, user: InferSchemaType<typeof User.schema>) {
    try {
        const embed = interaction.client.embedManager.Info({
            title: getTranslation('commands', 'lumberjacking.lumberjacking', interaction.locale),
            content: getTranslation('commands', 'lumberjacking.selectATree', interaction.locale)
        }).setColor(Colors.Green);


        const axe = user.inventory.shopItems.find(item => item.id === TOOL_IDS.axe);

        if (!axe) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                            item: getTranslation('global', 'axe', interaction.locale)
                        }).replace('$itemEmoji', ToolsEmojis.axe)
                    })
                ]
            });
        }

        const trees = await Loot.find({ job: 'Oduncu' });

        const buttons = Array.from({ length: 9 }, (_, i) => {
            const tree = trees[Math.floor(Math.random() * trees.length)];

            return (
                new ButtonBuilder()
                    .setCustomId(`lumberjacking.${interaction.user.id}.${i}.${tree.title}`)
                    .setEmoji(({
                        "Akasya": "<:akasya:1211718022222581861>",
                        "Meşe": "<:mese:1211718007026356285>",
                        "Çam": "<:cam:1211718037791571999>",
                        "Ladin": "<:ladin:1211717991851622450>"
                    } as any)?.[tree.title] || '🌲')
                    .setStyle(ButtonStyle.Success)
            )
        });

        const createRows = (buttons: ButtonBuilder[]) => Array.from({ length: 3 }, (_, i) => (
            new ActionRowBuilder()
                .addComponents(buttons.slice(i * 3, (i + 1) * 3))
        ));

        await interaction.reply({
            embeds: [embed],
            components: createRows(buttons) as any,
        });

        const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.axe && item.durability === axe.durability);

        if (!axe.durability) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        } else {
            axe.durability -= 1;

            if (axe.durability <= 0) {
                user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
            }
        }

        (user as any).markModified('inventory.shopItems');
        await (user as any).save();


    } catch (error) {
        console.error('Error while fishing:', error);
    }
}

const customProduction = {
    "Kasap": Butcher,
    "Çiftçi": Farmer,
    "Şef": Chef
} as {
    [key: string]: (interaction: ChatInputCommandInteraction, user: PopulatedUser) => Promise<any>;
};

async function produce(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    try {
        const embed = interaction.client.embedManager.Info({
            title: getTranslation('commands', 'produce.produce', interaction.locale),
            content: ''
        });
   

        const usersJob = await Job.findOne({ _id: (user.job as any)._id });

        if (!usersJob?.parent) {
            return await interaction.reply({
                embeds: [
                    embed.setDescription(
                        getTranslation('errors', 'produce.notTopTier', interaction.locale, {
                            job: (
                                {
                                    Balıkçı: 'fishing',
                                    Madenci: 'mining',
                                    Oduncu: 'lumberjacking'
                                } as any
                            )[
                                (user.job as any).name
                            ] || 'N/A'
                        })
                    )
                ]
            });
        }

        const customProductionFunction = customProduction?.[usersJob.name as any];

        if (customProductionFunction) {
            return await customProductionFunction(interaction, user as any);
        }

        if (usersJob.name === 'Marangoz') {
            const saw = user.inventory.shopItems.find(item => item.id === TOOL_IDS.saw);

            if (!saw) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                                item: getTranslation('global', 'saw', interaction.locale)
                            }).replace('$itemEmoji', ToolsEmojis.saw)
                        })
                    ]
                });
            }

            const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.saw && item.durability === saw.durability);

            if (!saw.durability) {
                user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
            } else {
                saw.durability -= 1;

                if (saw.durability <= 0) {
                    user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
                }
            }
        }

        let onlyAnvil = false;

        if (usersJob.name === 'Demirci') {
            const anvil = user.inventory.items.find(item => item.item.id === 24);

            if (!anvil) {
                onlyAnvil = true;
            } else {
                const index = user.inventory.items.findIndex(item => item.item.id === 24 && (item.durability ? item.durability === anvil?.durability : true));

                if (!anvil.durability) {
                    user.inventory.items = user.inventory.items.filter((_, i) => i !== index) as any;
                } else {
                    anvil.durability -= 1;

                    if (anvil.durability <= 0) {
                        user.inventory.items = user.inventory.items.filter((_, i) => i !== index) as any;
                    }
                }
            }

        }

        (user as any).markModified('inventory.items');
        await (user as any).save();

        const items = await Item.find({ job: usersJob.name });

        if (!items.length) {
            return await interaction.reply({
                embeds: [embed.setDescription(getTranslation('errors', 'produce.noItemsToProduce', interaction.locale))]
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`produce.produce.${interaction.user.id}`)
            .setPlaceholder(getTranslation('commands', 'produce.selectTheItem', interaction.locale))
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                (usersJob.name === 'Demirci' && onlyAnvil ? [
                    items.find(item => item.id === 24) as any
                ] : items).map(item => ({
                    label: item.title,
                    value: String(item.id),
                    emoji: item.emoji
                }))
            );

        const recipesButton = new ButtonBuilder()
            .setCustomId(`recipes.${interaction.user.id}`)
            .setLabel(getTranslation('global', 'recipes', interaction.locale))
            .setStyle(ButtonStyle.Secondary);

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(selectMenu) as any,
                new ActionRowBuilder().addComponents(recipesButton) as any
            ]
        });
    } catch (error) {
        console.error('Error while producing:', error);
    }
}

async function Butcher(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    if (!user.butcher) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'general.commandExecution', interaction.locale)
                })
            ],
            ephemeral: true
        });
    }

    const fields = getTransportFields(user, interaction.locale === "tr" ? "tr" : "en-US");

    const embed = interaction.client.embedManager.Info({
        title: getTranslation("global", "butcher", interaction.locale),
        fields
    }).setColor(Colors.Red);

    const cleaver = user.inventory.shopItems.find(item => item.id === TOOL_IDS.cleaver);

    if (!cleaver) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                        item: getTranslation('global', 'cleaver', interaction.locale)
                    }).replace('$itemEmoji', ToolsEmojis.cleaver)
                })
            ]
        });
    }

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
                .setPlaceholder(getTranslation('commands', 'butcher.butcherAnimal', interaction.locale))
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(butcherAnimals.on.map(animal => ({
                    value: String(animal),
                    label: getTranslation('global', animal, interaction.locale),
                    emoji: animalEmojis[animal],
                    description: `${getTranslation('commands', 'butcher.availableAnimals', interaction.locale)}: ${(user.butcher?.storage as any)?.[animal] || 0}`

                })))
        )

    const refrigerators = listOfRefrigerator(user);

    const refrigerator = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`butcher.refrigerator.${interaction.user.id}`)
                .setPlaceholder(getTranslation('global', 'refrigerators', interaction.locale))
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(refrigerators.map(refrigerator => ({
                    value: refrigerator.value,
                    label: refrigerator.name,
                    emoji: ButcherEmojis.refrigerator,
                    //description: refrigerator.description
                })))
        )

    const recipesButton = new ButtonBuilder()
        .setCustomId(`recipes.${interaction.user.id}`)
        .setLabel(getTranslation('global', 'recipes', interaction.locale))
        .setStyle(ButtonStyle.Secondary);


    await interaction.reply({
        embeds: [embed],
        components: [
            buttons as any,
            ...(butcherAnimals.on.length ? [butcher] : []),
            ...(refrigerators.length ? [refrigerator] : []),
            new ActionRowBuilder().addComponents(recipesButton) as any
        ]
    });

    const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.fishingRod && item.durability === cleaver.durability);

    if (!cleaver.durability) {
        user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
    } else {
        cleaver.durability -= 1;

        if (cleaver.durability <= 0) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        }
    }

    user.markModified('inventory.shopItems');
    await (user as any).save();
};

async function Farmer(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    if ((user.farmer?.zones?.length || 0) !== 9) {
        user.farmer.zones = Array.from({ length: 9 }, () => ({
            status: 'dried',
            seed: undefined,
            lastAction: new Date(0)
        }));

        user.markModified('farmer.zones');
        await user.save();

    }

    const rendered = renderZones(user, interaction.locale);

    const embed = interaction.client.embedManager.Info({
        title: getTranslation('commands', 'farmer.farmer', interaction.locale),
        content: rendered
    }).setColor(Colors.Green);

    const hoe = user.inventory.shopItems.find(item => item.id === TOOL_IDS.hoe);

    if (!hoe) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'job.youNeedToUse', interaction.locale, {
                        item: getTranslation('global', 'hoe', interaction.locale)
                    }).replace('$itemEmoji', ToolsEmojis.hoe)
                })
            ]
        });
    }

    const primaryAction = primaryActionButtons(user, interaction.locale);

    await interaction.reply({
        embeds: [embed],
        components: [
            ...primaryAction.map(button => button.button).map(button => new ActionRowBuilder().addComponents(button) as any)
        ]
    });

    const index = user.inventory.shopItems.findIndex(item => item.id === TOOL_IDS.hoe && item.durability === hoe.durability);

    if (!hoe.durability) {
        user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
    } else {
        hoe.durability -= 1;

        if (hoe.durability <= 0) {
            user.inventory.shopItems = user.inventory.shopItems.filter((_, i) => i !== index) as any;
        }
    }

    user.markModified('inventory.shopItems');
    await (user as any).save();
}

async function Chef(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    try {
        const reply = await createChefEmbed(interaction.client, user, interaction.locale);

        return await interaction.reply(reply);
    } catch (error) {
        console.error('Error while executing chef command:', error);
    }
}
