import { ModalSubmitInteraction } from "discord.js";
import isAdmin from "../helpers/isAdmin";
import Job from "../models/Job";
import { EmojiRegex, SafeContentTitle } from "../helpers/regexes";
import Loot from "../models/Loot";
import lastContentID from "../helpers/general/lastContentID";
import { InferSchemaType } from "mongoose";
import Item from "../models/Item";
import Tool, { PopulatedTool } from "../models/Tool";

export const name = 'tool';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    const locales = {
        "en-US": {
            permissionError: 'You do not have permission to use this command.',
            invalidJob: 'There is no such job.',
            invalidTool: 'There is no such tool.',
            invalidAction: 'This command has no function.',
            error: 'An error occurred while executing the command.'
        },
        "en-GB": {
            permissionError: 'You do not have permission to use this command.',
            invalidJob: 'There is no such job.',
            invalidTool: 'There is no such tool.',
            invalidAction: 'This command has no function.',
            error: 'An error occurred while executing the command.'
        },
        "tr": {
            permissionError: 'Bu komutu kullanma izniniz yok.',
            invalidJob: 'Böyle bir iş yok.',
            invalidTool: 'Böyle bir araç yok.',
            invalidAction: 'Bu komutun bir işlevi yok.',
            error: 'Komut yürütülürken bir hata oluştu.'
        }
    }

    const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];

    try {
        // Check if the user is an administrator by comparing their ID to a list of administrator IDs stored in environment variables.
        const is_admin = await isAdmin(interaction);

        // If the user is not an administrator, reply with a permission error message and stop further execution.
        if (!is_admin) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({ content: selectedLocale.permissionError })
                ],
                ephemeral: true
            });
        }

        const [_, subaction, ...data] = interaction.customId.split('.');

        let d: any;

        if (subaction === 'create') {
            const job = await Job.findOne({ name: data?.[0] });

            if (!job) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({ content: selectedLocale.invalidJob })
                    ],
                    ephemeral: true
                });
            }

            d = job;
        } else {
            const tool = await Tool.findOne({ title: data?.[0] });

            if (!tool) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({ content: selectedLocale.invalidTool })
                    ],
                    ephemeral: true
                });
            }

            d = tool;
        }

        const actions = {
            create,
            edit
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({ content: selectedLocale.invalidAction })
                ],
                ephemeral: true
            });
        }

        await request(interaction, d);
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({ content: selectedLocale.error })
            ],
            ephemeral: true
        });
    }
}

async function create(interaction: ModalSubmitInteraction, job: InferSchemaType<typeof Job.schema>) {
    const locales = {
        "en-US": {
            alreadyExists: 'There is already an item with this name.',
            invalidName: 'You must enter a valid item name.',
            invalidEmoji: 'Invalid emoji, please use the format of `<:emoji_name:ID>`',
            invalidRecipe: 'Invalid recipe, please use the format of `ID1*amount+ID2*amount...`',
            theFollowingIDsAreNotFound: 'The following IDs are not found: $ids',
            theFollowingVariantsAreNotFound: 'The following variants are not found: $variants',
            minimumPrice: 'You must enter a valid minimum price.',
            maximumPrice: 'You must enter a valid maximum price.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum price cannot be greater than maximum price.',
            success: 'The item has been successfully created with the ID of $id.',
            error: 'An error occurred while creating the item.'
        },
        "en-GB": {
            alreadyExists: 'There is already an item with this name.',
            invalidName: 'You must enter a valid item name.',
            invalidEmoji: 'Invalid emoji, please use the format of `<:emoji_name:ID>`',
            invalidRecipe: 'Invalid recipe, please use the format of `ID1*amount+ID2*amount...`',
            theFollowingIDsAreNotFound: 'The following IDs are not found: $ids',
            theFollowingVariantsAreNotFound: 'The following variants are not found: $variants',
            minimumPrice: 'You must enter a valid minimum price.',
            maximumPrice: 'You must enter a valid maximum price.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum price cannot be greater than maximum price.',
            success: 'The item has been successfully created with the ID of $id.',
            error: 'An error occurred while creating the item.'
        },
        "tr": {
            alreadyExists: 'Bu isimde bir araç zaten var.',
            invalidName: 'Geçerli bir araç adı girmelisiniz.',
            invalidEmoji: 'Geçersiz emoji, lütfen `<:emoji_ismi:ID>` formatını kullanın.',
            invalidRecipe: 'Geçersiz tarif, lütfen `ID1*miktar+ID2*miktar...` formatını kullanın',
            theFollowingIDsAreNotFound: 'Aşağıdaki IDler bulunamadı: $ids',
            theFollowingVariantsAreNotFound: 'Aşağıdaki varyantlar bulunamadı: $variants',
            minimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
            maximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
            success: 'Araç başarıyla oluşturuldu, ID: $id.',
            error: 'Araç oluşturulurken bir hata oluştu.'
        }
    } as const;

    const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];

    try {
        const name = interaction.fields.getTextInputValue('name');

        if (!SafeContentTitle.test(name)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.invalidName
                    })
                ],
                ephemeral: true
            });
        }

        const isExists = await Item.findOne({ title: name });

        if (isExists) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.alreadyExists
                    })
                ],
                ephemeral: true
            });
        }

        const emoji = interaction.fields.getTextInputValue('emoji');

        /* if (!EmojiRegex.test(emoji)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.invalidEmoji
                    })
                ],
                ephemeral: true
            });
        } */

        const recipe = interaction.fields.getTextInputValue('recipe');
        if (!/^(([0-9]*|[a-z0-9]*)\*\d*\+)*([0-9]*|[a-z0-9]*)\*\d*$/.test(recipe)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.invalidRecipe
                    })
                ],
                ephemeral: true
            });
        }

        const contents = recipe.split('+').map(x => x.split('*')[0]);

        const ids = contents.filter(x => !isNaN(Number(x))).map(Number);
        const variants = contents.map((x, i) => [x, i]).filter(x => isNaN(Number(x[0])));

        const loots = await Loot.find({ id: { $in: ids } });
        const used = loots.map(x => x.id);

        const remaining = ids.filter(x => !used.includes(x));
        const items = await Item.find({ id: { $in: remaining } });
        const usedItems = items.map(x => x.id);

        const leftovers = remaining.filter(x => !usedItems.includes(x));

        if (leftovers.length) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingIDsAreNotFound.replace('$ids', `\`${leftovers.join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const uniqueVariants = Array.from(new Set(variants.map(x => x[0])));

        const fetchedVariants = await Loot.find({
            variant: {
                $in: uniqueVariants
            }
        });

        const leftoverVariants = variants.filter(x => !fetchedVariants.find(y => y.variant === (x[0] as any).toLowerCase()));

        if (!leftoverVariants) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingVariantsAreNotFound.replace('$variants', `\`${variants.map(x => x[0]).join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const [minimumPrice, maximumPrice] = interaction.fields.getTextInputValue('minimumPrice').split(',').map(x => parseInt(x));

        if (!minimumPrice || isNaN(minimumPrice)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.minimumPrice
                    })
                ],
                ephemeral: true
            });
        }

        if (!maximumPrice || isNaN(maximumPrice)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.maximumPrice
                    })
                ],
                ephemeral: true
            });
        }

        if (minimumPrice > maximumPrice) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.minimumPriceGreaterThanMaximumPrice
                    })
                ],
                ephemeral: true
            });
        }

        const splited = recipe.split('+');
        const list = splited.map(x => x.split('*').map(Number));

        const lootsOnRecipe = loots.map((loot, i) => ({
            loot: loot,
            quantity: list.find(x => x[0] === loot.id)?.[1]
        }));

        const itemsOnRecipe = items.map((item, i) => ({
            item: item,
            quantity: list.find(x => x[0] === item.id)?.[1]
        }));

        const variantsOnRecipe = variants.map((variant, i) => ({
            variant: variant[0] as any,
            quantity: variant[1]
        }));

        const tool = new Tool({
            id: (await lastContentID()) + 1,
            title: name,
            emoji,
            minimumPrice,
            maximumPrice,
            job: job.name,
            recipe: {
                loots: lootsOnRecipe,
                items: itemsOnRecipe,
                variants: variantsOnRecipe
            },
            upgrades: []
        });

        await tool.save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: selectedLocale.success.replace('$id', tool.id.toString())
                })
            ]
        });
    } catch (e) {
        console.log(e);
        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.error
                    })
                ],
                ephemeral: true
            });
        } catch (e) { }
    }
}

async function edit(interaction: ModalSubmitInteraction, tool: PopulatedTool) {

    const locales = {
        "en-US": {
            invalidName: 'You must enter a valid item name.',
            alreadyExists: 'There is already an item with this name.',
            invalidEmoji: 'Invalid emoji, please use the format of `<:emoji_name:ID>`',
            invalidRecipe: 'Invalid recipe, please use the format of `ID1*amount+ID2*amount...`',
            theFollowingVariantsAreNotFound: 'The following variants are not found: $variants',
            theFollowingIDsAreNotFound: 'The following IDs are not found: $ids',
            minimumPrice: 'You must enter a valid minimum price.',
            maximumPrice: 'You must enter a valid maximum price.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum price cannot be greater than maximum price.',
            success: 'The item has been successfully updated.',
            error: 'An error occurred while updating the item.'
        },
        "en-GB": {
            invalidName: 'You must enter a valid item name.',
            alreadyExists: 'There is already an item with this name.',
            invalidEmoji: 'Invalid emoji, please use the format of `<:emoji_name:ID>`',
            invalidRecipe: 'Invalid recipe, please use the format of `ID1*amount+ID2*amount...`',
            theFollowingVariantsAreNotFound: 'The following variants are not found: $variants',
            theFollowingIDsAreNotFound: 'The following IDs are not found: $ids',
            minimumPrice: 'You must enter a valid minimum price.',
            maximumPrice: 'You must enter a valid maximum price.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum price cannot be greater than maximum price.',
            success: 'The item has been successfully updated.',
            error: 'An error occurred while updating the item.'
        },
        "tr": {
            invalidName: 'Geçerli bir araç adı girmelisiniz.',
            alreadyExists: 'Bu isimde bir araç zaten var.',
            invalidEmoji: 'Geçersiz emoji, lütfen `<:emoji_ismi:ID>` formatını kullanın.',
            invalidRecipe: 'Geçersiz tarif, lütfen `ID1*miktar+ID2*miktar...` formatını kullanın',
            theFollowingVariantsAreNotFound: 'Aşağıdaki varyantlar bulunamadı: $variants',
            theFollowingIDsAreNotFound: 'Aşağıdaki IDler bulunamadı: $ids',
            minimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
            maximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
            success: 'Araç başarıyla güncellendi.',
            error: 'Araç güncellenirken bir hata oluştu.'
        }
    } as const;

    const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];

    try {
        const name = interaction.fields.getTextInputValue('name');

        if (tool.title !== name) {
            if (!SafeContentTitle.test(name)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidName
                        })
                    ],
                    ephemeral: true
                });
            }

            const isExists = await Item.findOne({ title: name });

            if (isExists) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.alreadyExists
                        })
                    ],
                    ephemeral: true
                });
            }

            tool.title = name;
        }

        const emoji = interaction.fields.getTextInputValue('emoji');

        if (tool.emoji !== emoji) {
            /* if (!EmojiRegex.test(emoji)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidEmoji
                        })
                    ],
                    ephemeral: true
                });
            } */

            tool.emoji = emoji;
        }

        const recipe = interaction.fields.getTextInputValue('recipe');

        if (!/^(([0-9]*|[a-z0-9]*)\*\d*\+)*([0-9]*|[a-z0-9]*)\*\d*$/.test(recipe)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.invalidRecipe
                    })
                ],
                ephemeral: true
            });
        }
        const contents = recipe.split('+').map(x => x.split('*')[0]);

        const ids = contents.filter(x => !isNaN(Number(x))).map(Number);
        const variants = recipe.split('+').map((x) => x.split('*')).filter(x => isNaN(Number(x[0]))).map(x => [x[0], Number(x[1])]);

        const loots = await Loot.find({ id: { $in: ids } });
        const used = loots.map(x => x.id);

        const remaining = ids.filter(x => !used.includes(x));
        const items = await Item.find({ id: { $in: remaining } });
        const usedItems = items.map(x => x.id);

        const leftovers = remaining.filter(x => !usedItems.includes(x));

        if (leftovers.length) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingIDsAreNotFound.replace('$ids', `\`${leftovers.join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const fetchedVariants = await Loot.find({
            variant: {
                $in: variants.map(x => (x[0] as any).toLowerCase())
            }
        });

        const leftoverVariants = variants.filter(x => !fetchedVariants.find(y => y.variant === (x[0] as any).toLowerCase()));

        if (!leftoverVariants) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingVariantsAreNotFound.replace('$variants', `\`${variants.map(x => x[0]).join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const [minimumPrice, maximumPrice] = interaction.fields.getTextInputValue('minimumPrice').split(',').map(x => parseInt(x));

        if (tool.minimumPrice !== minimumPrice) {
            if (!minimumPrice || isNaN(minimumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            tool.minimumPrice = minimumPrice;
        }

        if (tool.maximumPrice !== maximumPrice) {
            if (!maximumPrice || isNaN(maximumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.maximumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            if (minimumPrice > maximumPrice) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPriceGreaterThanMaximumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            tool.maximumPrice = maximumPrice;
        }

        const splited = recipe.split('+');
        const list = splited.map(x => x.split('*').map(Number));

        const lootsOnRecipe = loots.map((loot, i) => ({
            loot: loot,
            quantity: list.find(x => x[0] === loot.id)?.[1]
        }));

        const itemsOnRecipe = items.map((item, i) => ({
            item: item,
            quantity: list.find(x => x[0] === item.id)?.[1]
        }));

        const variantsOnRecipe = variants.map((variant, i) => ({
            variant: variant[0] as any,
            quantity: variant[1]
        }));

        (tool as any).recipe = {
            loots: lootsOnRecipe,
            items: itemsOnRecipe,
            variants: variantsOnRecipe
        };

        (tool as any).markModified('recipe');

        await (tool as any).save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: selectedLocale.success
                })
            ]
        });
    } catch (e) {
        console.log(e);
        try {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.error
                    })
                ],
                ephemeral: true
            });
        } catch (e) { }
    }
}