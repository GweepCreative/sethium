import { ModalSubmitInteraction } from "discord.js";
import isAdmin from "../helpers/isAdmin";
import Job from "../models/Job";
import { EmojiRegex, variantRegex } from "../helpers/regexes";
import Loot from "../models/Loot";
import lastContentID from "../helpers/general/lastContentID";

export const name = 'loot';

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

        if (subaction === 'create') {
            const locales = {
                "en-US": {
                    emptyJobName: 'You must enter a job name.',
                    jobNotFound: 'There is no such job.',
                    shouldntHaveParent: 'Jobs with parent should have `item` instead of `loot`.',
                    invalidName: 'You must enter a valid loot name.',
                    alreadyExists: 'There is already a loot with this name.',
                    invalidEmoji: 'You must enter a valid emoji.',
                    invalidMinimumPrice: 'You must enter a valid minimum price.',
                    invalidMaximumPrice: 'You must enter a valid maximum price.',
                    minimumPriceGreaterThanMaximum: 'Minimum price cannot be greater than maximum price.',
                    invalidVariant: 'You must enter a valid variant name.',
                    success: 'Loot has been successfully added.'
                },
                "en-GB": {
                    emptyJobName: 'You must enter a job name.',
                    jobNotFound: 'There is no such job.',
                    shouldntHaveParent: 'Jobs with parent should have `item` instead of `loot`.',
                    invalidName: 'You must enter a valid loot name.',
                    alreadyExists: 'There is already a loot with this name.',
                    invalidEmoji: 'You must enter a valid emoji.',
                    invalidMinimumPrice: 'You must enter a valid minimum price.',
                    invalidMaximumPrice: 'You must enter a valid maximum price.',
                    minimumPriceGreaterThanMaximum: 'Minimum price cannot be greater than maximum price.',
                    invalidVariant: 'You must enter a valid variant name.',
                    success: 'Loot has been successfully added.'
                },
                "tr": {
                    emptyJobName: 'Bir meslek adı girmelisiniz.',
                    jobNotFound: 'Böyle bir meslek yok.',
                    shouldntHaveParent: 'Üst mesleğe sahip meslekler `loot` yerine `item`a sahip olabilir.',
                    invalidName: 'Geçerli bir loot adı girmelisiniz.',
                    alreadyExists: 'Bu isimde bir loot zaten var.',
                    invalidEmoji: 'Geçerli bir emoji girmelisiniz.',
                    invalidMinimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
                    invalidMaximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
                    minimumPriceGreaterThanMaximum: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
                    invalidVariant: 'Geçerli bir varyant adı girmelisiniz.',
                    success: 'Loot başarıyla eklendi.'
                }
            } as const;

            const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];


            const jobName = data?.[0];

            if (!jobName) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.emptyJobName
                        })
                    ],
                    ephemeral: true
                });
            }

            const job = await Job.findOne({ name: jobName });

            if (!job) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.jobNotFound
                        })
                    ],
                    ephemeral: true
                });
            }

            /* if (job.parent) {
                return await interaction.reply({ 
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.shouldntHaveParent
                        })
                    ], 
                    ephemeral: true 
                });
            } */

            const name = interaction.fields.getTextInputValue('name');

            if (!name || name.length < 3) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidName
                        })
                    ],
                    ephemeral: true
                });
            }

            const isExists = await Loot.findOne({
                title: name
            });

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

            const minimumPrice = parseInt(interaction.fields.getTextInputValue('minimumPrice'));
            const maximumPrice = parseInt(interaction.fields.getTextInputValue('maximumPrice'));

            if (!minimumPrice || isNaN(minimumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidMinimumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            if (!maximumPrice || isNaN(maximumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidMaximumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            if (minimumPrice > maximumPrice) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPriceGreaterThanMaximum
                        })
                    ],
                    ephemeral: true
                });
            }

            const variant = interaction.fields.getTextInputValue('variant');

            if (variant && !variantRegex.test(variant)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidVariant
                        })
                    ],
                    ephemeral: true
                });
            }

            const loot = new Loot({
                id: (await lastContentID()) + 1,
                title: name,
                emoji,
                minimumPrice,
                maximumPrice,
                job: jobName
            });

            if (variant) {
                loot.variant = variant;
            }

            await loot.save();

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: selectedLocale.success
                    })
                ],
                ephemeral: true
            });
        }

        if (subaction === 'edit') {
            const locales = {
                "en-US": {
                    invalidNameOnHeader: 'You must enter a valid loot name.',
                    invalidName: 'You must enter a valid loot name.',
                    thereIsNoLoot: 'There is no such loot.',
                    invalidEmoji: 'You must enter a valid emoji.',
                    invalidMinimumPrice: 'You must enter a valid minimum price.',
                    invalidMaximumPrice: 'You must enter a valid maximum price.',
                    minimumPriceGreaterThanMaximum: 'Minimum price cannot be greater than maximum price.',
                    invalidVariant: 'You must enter a valid variant name.',
                    success: 'Loot has been successfully updated.'
                },
                "en-GB": {
                    invalidNameOnHeader: 'You must enter a valid loot name.',
                    invalidName: 'You must enter a valid loot name.',
                    thereIsNoLoot: 'There is no such loot.',
                    invalidEmoji: 'You must enter a valid emoji.',
                    invalidMinimumPrice: 'You must enter a valid minimum price.',
                    invalidMaximumPrice: 'You must enter a valid maximum price.',
                    minimumPriceGreaterThanMaximum: 'Minimum price cannot be greater than maximum price.',
                    invalidVariant: 'You must enter a valid variant name.',
                    success: 'Loot has been successfully updated.'
                },
                "tr": {
                    invalidNameOnHeader: 'Geçerli bir loot adı girmelisiniz.',
                    invalidName: 'Geçerli bir loot adı girmelisiniz.',
                    thereIsNoLoot: 'Böyle bir loot yok.',
                    invalidEmoji: 'Geçerli bir emoji girmelisiniz.',
                    invalidMinimumPrice: 'Geçerli bir minimum fiyat girmelisiniz.',
                    invalidMaximumPrice: 'Geçerli bir maximum fiyat girmelisiniz.',
                    minimumPriceGreaterThanMaximum: 'Minimum fiyat, maksimum fiyattan büyük olamaz.',
                    invalidVariant: 'Geçerli bir varyant adı girmelisiniz.',
                    success: 'Loot başarıyla güncellendi.'
                }
            } as const;

            const selectedLocale = ((locales as any)[interaction.locale] || (locales as any)["tr"]) as typeof locales["tr"];

            const lootName = data?.[0];

            if (!lootName) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidNameOnHeader
                        })
                    ],
                    ephemeral: true
                });
            }

            const loot = await Loot.findOne({ title: lootName });

            if (!loot) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.thereIsNoLoot
                        })
                    ],
                    ephemeral: true
                });
            }

            const name = interaction.fields.getTextInputValue('name');

            if (name && name.length < 3) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidName
                        })
                    ],
                    ephemeral: true
                });
            }

            const emoji = interaction.fields.getTextInputValue('emoji');

            /* if (emoji && !EmojiRegex.test(emoji)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidEmoji
                        })
                    ],
                    ephemeral: true
                });
            } */

            const minimumPrice = parseInt(interaction.fields.getTextInputValue('minimumPrice'));

            if (minimumPrice && isNaN(minimumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidMinimumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            const maximumPrice = parseInt(interaction.fields.getTextInputValue('maximumPrice'));

            if (maximumPrice && isNaN(maximumPrice)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidMaximumPrice
                        })
                    ],
                    ephemeral: true
                });
            }

            if (minimumPrice && maximumPrice && minimumPrice > maximumPrice) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.minimumPriceGreaterThanMaximum
                        })
                    ],
                    ephemeral: true
                });
            }

            const variant = interaction.fields.getTextInputValue('variant');

            if (variant && !variantRegex.test(variant)) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: selectedLocale.invalidVariant
                        })
                    ],
                    ephemeral: true
                });
            }

            if (name !== loot.title) {
                loot.title = name;
            }

            if (emoji !== loot.emoji) {
                loot.emoji = emoji;
            }

            if (minimumPrice !== loot.minimumPrice) {
                loot.minimumPrice = minimumPrice;
            }

            if (maximumPrice !== loot.maximumPrice) {
                loot.maximumPrice = maximumPrice;
            }

            if (variant !== loot.variant) {
                loot.variant = variant ? variant : undefined;
            }

            await loot.save();

            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Success({
                        content: selectedLocale.success
                    })
                ]
            });
        }
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({ content: 'Bir hata oluştu', ephemeral: true });
    }
}