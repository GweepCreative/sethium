import { ModalSubmitInteraction } from "discord.js";
import isAdmin from "../helpers/isAdmin";
import Job from "../models/Job";
import { EmojiRegex, SafeContentTitle } from "../helpers/regexes";
import Loot from "../models/Loot";
import lastContentID from "../helpers/general/lastContentID";
import { InferSchemaType } from "mongoose";
import Item from "../models/Item";

export const name = 'item';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    try {
        // Check if the user is an administrator by comparing their ID to a list of administrator IDs stored in environment variables.
        const is_admin = await isAdmin(interaction);

        // If the user is not an administrator, reply with a permission error message and stop further execution.
        if (!is_admin) {
            return await interaction.reply({ content: 'Bu komutu kullanma izniniz yok.', ephemeral: true });
        }

        const [_, subaction, ...data] = interaction.customId.split('.');

        let d: any;

        if (subaction === 'create') {
            const job = await Job.findOne({ name: data?.[0] });

            if (!job) {
                return await interaction.reply({ content: 'Böyle bir iş yok.', ephemeral: true });
            }

            d = job;
        } else {
            const item = await Item.findOne({ title: data?.[0] });

            if (!item) {
                return await interaction.reply({ content: 'Böyle bir eşya yok.', ephemeral: true });
            }

            d = item;
        }

        const actions = {
            create,
            edit
        } as any;

        const request = actions?.[subaction];

        if (!request) {
            return await interaction.reply({ content: 'Bu komutun bir işlevi yok.', ephemeral: true });
        }

        await request(interaction, d);
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({ content: 'Bir hata oluştu', ephemeral: true });
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
            alreadyExists: 'Bu isimde bir eşya zaten var.',
            invalidName: 'Geçerli bir eşya adı girmelisiniz.',
            invalidEmoji: 'Geçersiz emoji, lütfen `<:emoji_ismi:ID>` formatını kullanın.',
            invalidRecipe: 'Geçersiz tarif, lütfen `ID1*miktar+ID2*miktar...` formatını kullanın',
            theFollowingIDsAreNotFound: 'Aşağıdaki IDler bulunamadı: $ids',
            theFollowingVariantsAreNotFound: 'Aşağıdaki varyantlar bulunamadı: $variants',
            minimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
            maximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
            success: 'Eşya başarıyla oluşturuldu, ID: $id.',
            error: 'Eşya oluşturulurken bir hata oluştu.'
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

        const loots = [], items = [], variants: [string, number][] = [];

        const sections = recipe.split('+');

        let list = [];

        for (const section of sections) {
            const [identifier, rawQuantity] = section.split('*');
            const quantity = parseInt(rawQuantity);

            if (isNaN(quantity)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidRecipe
                        })
                    ],
                    ephemeral: true
                });
            }

            if (isNaN(parseInt(identifier))) {
                variants.push([identifier, quantity]);
            } else {
                list.push([parseInt(identifier), quantity]);
            }
        }

        const lootsOnRecipe = await Loot.find({ id: { $in: list.map(x => x[0]) } });

        for (const loot of lootsOnRecipe) {
            const quantity = list.find(x => x[0] === loot.id)?.[1];

            if (!quantity) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidRecipe
                        })
                    ],
                    ephemeral: true
                });
            }

            loots.push({
                loot,
                quantity
            });

            list = list.filter(x => x[0] !== loot.id);
        }

        const itemsOnRecipe = await Item.find({ id: { $in: list.map(x => x[0]) } });

        for (const item of itemsOnRecipe) {
            const quantity = list.find(x => x[0] === item.id)?.[1];

            if (!quantity) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidRecipe
                        })
                    ],
                    ephemeral: true
                });
            }

            items.push({
                item,
                quantity
            });

            list = list.filter(x => x[0] !== item.id);
        }

        if (list.length) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingIDsAreNotFound.replace('$ids', `\`${list.map(x => x[0]).join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const fetchedVariants = (await Loot.find({
            variant: {
                $in: variants.map(x => x[0])
            }
        })).map(x => x.variant);

        const leftoverVariants = variants.filter(([variant]) => !fetchedVariants.includes(variant));

        if (leftoverVariants.length) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.theFollowingVariantsAreNotFound.replace('$variants', `\`${leftoverVariants.map(x => x[0]).join(', ')}\``),
                    })
                ],
                ephemeral: true
            });
        }

        const minimumPrice = parseInt(interaction.fields.getTextInputValue('minimumPrice'));
        const maximumPrice = parseInt(interaction.fields.getTextInputValue('maximumPrice'));

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

        const item = new Item({
            id: (await lastContentID()) + 1,
            title: name,
            emoji,
            minimumPrice,
            maximumPrice,
            job: job.name,
            recipe: {
                loots: loots,
                items: items,
                variants: variants.map(x => ({ variant: x[0], quantity: x[1] }))
            }
        });

        await item.save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: selectedLocale.success.replace('$id', item.id.toString())
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

async function edit(interaction: ModalSubmitInteraction, item: InferSchemaType<typeof Item.schema>) {

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
            invalidName: 'Geçerli bir eşya adı girmelisiniz.',
            alreadyExists: 'Bu isimde bir eşya zaten var.',
            invalidEmoji: 'Geçersiz emoji, lütfen `<:emoji_ismi:ID>` formatını kullanın.',
            invalidRecipe: 'Geçersiz tarif, lütfen `ID1*miktar+ID2*miktar...` formatını kullanın',
            theFollowingVariantsAreNotFound: 'Aşağıdaki varyantlar bulunamadı: $variants',
            theFollowingIDsAreNotFound: 'Aşağıdaki IDler bulunamadı: $ids',
            minimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
            maximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
            minimumPriceGreaterThanMaximumPrice: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
            success: 'Eşya başarıyla güncellendi.',
            error: 'Eşya güncellenirken bir hata oluştu.'
        }
    } as const;

    const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];

    try {
        const name = interaction.fields.getTextInputValue('name');

        if (item.title !== name) {
            if (!SafeContentTitle.test(name)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidName
                        })
                    ], ephemeral: true
                });
            }

            const isExists = await Item.findOne({ title: name });

            if (isExists) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.alreadyExists
                        })
                    ], ephemeral: true
                });
            }

            item.title = name;
        }

        const emoji = interaction.fields.getTextInputValue('emoji');

        if (item.emoji !== emoji) {
            /* if (!EmojiRegex.test(emoji)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidEmoji
                        })
                    ], ephemeral: true
                });
            } */

            item.emoji = emoji;
        }


        const recipe = interaction.fields.getTextInputValue('recipe');

        if (!/^(([0-9]*|[a-z0-9]*)\*\d*\+)*([0-9]*|[a-z0-9]*)\*\d*$/.test(recipe)) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: selectedLocale.invalidRecipe
                    })
                ], ephemeral: true
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
                        content: selectedLocale.theFollowingIDsAreNotFound.replace('$ids', `\`${leftovers.join(', ')}\``)
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
                        content: selectedLocale.theFollowingVariantsAreNotFound.replace('$variants', `\`${variants.map(x => x[0]).join(', ')}\``)
                    })
                ],
                ephemeral: true
            });
        }

        const minimumPrice = parseInt(interaction.fields.getTextInputValue('minimumPrice'));
        const maximumPrice = parseInt(interaction.fields.getTextInputValue('maximumPrice'));

        if (item.minimumPrice !== minimumPrice) {
            if (!minimumPrice || isNaN(minimumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPrice
                        })
                    ], ephemeral: true
                });
            }

            item.minimumPrice = minimumPrice;
        }

        if (item.maximumPrice !== maximumPrice) {
            if (!maximumPrice || isNaN(maximumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.maximumPrice
                        })
                    ], ephemeral: true
                });
            }

            if (minimumPrice > maximumPrice) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPriceGreaterThanMaximumPrice
                        })
                    ], ephemeral: true
                });
            }

            item.maximumPrice = maximumPrice;
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

        (item as any).recipe = {
            loots: lootsOnRecipe,
            items: itemsOnRecipe,
            variants: variantsOnRecipe
        };

        (item as any).markModified('recipe');

        await (item as any).save();

        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
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
                ], ephemeral: true
            });
        } catch (e) { }
    }
}