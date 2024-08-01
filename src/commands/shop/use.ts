import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import { Luck, Partnership, seth } from "../../constants/emojis";
import { PARTNERSHIP_ROSE, REWARD_KEYS, SHOP_ITEMS } from "../../constants/shop";
import Log from "../../models/Log";
import rand from "../../helpers/math/rand";
import { getAvailableRewards, getRandomReward } from "../../helpers/economy/shop";
import { upgradeRequirements } from "../../constants/partner";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('use')
    .setNameLocalization('tr', 'kullan')
    .setDescription('Use an item from your inventory')
    .setDescriptionLocalization('tr', 'Envanterinizden bir eşya kullanır')
    .addStringOption(option => option
        .setName('item')
        .setNameLocalization('tr', 'esya')
        .setDescription('The name of the item you want to buy')
        .setDescriptionLocalization('tr', 'Satın almak istediğiniz eşyanın ID\'si')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option => option
        .setName('amount')
        .setNameLocalization('tr', 'miktar')
        .setDescription('The amount of the item you want to buy')
        .setDescriptionLocalization('tr', ' Satın almak istediğiniz eşyanın miktarı')
        .setRequired(false)
    )
export const shouldRegister = true;


export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('inventory.loots.loot')
            .populate('inventory.items.item').exec() as any as PopulatedUser;

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ]
            });
        }

        if (!user.job || !user.job.name) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noJob", interaction.locale)
                    })
                ]
            });
        }

        try {
            const itemID = parseInt(interaction.options.getString('item') ?? interaction.options.getString('esya') ?? '0');

            if (!itemID || itemID < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidItem", interaction.locale)
                        })
                    ]
                });
            }

            const rawAmount = interaction.options.getString('amount') ?? interaction.options.getString('miktar') ?? '1';

            let amount = ['all', 'max', '*', 'hepsi'].includes(rawAmount) ? Infinity : parseInt(rawAmount);

            if (isNaN(amount) || amount < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]
                });
            }

            if (itemID === PARTNERSHIP_ROSE.id) {
                const partnership = user.partner?.partner;

                if (!partnership) {
                    return await interaction.reply({
                        embeds: [
                            interaction.client.embedManager.Error({
                                content: getTranslation("errors", "partner.notPartnered", interaction.locale)
                            })
                        ]
                    });
                }

                if (partnership.level > upgradeRequirements.length - 1) {
                    return await interaction.reply({
                        embeds: [
                            interaction.client.embedManager.Error({
                                content: getTranslation("errors", "partner.maxLevel", interaction.locale)
                            })
                        ]
                    });
                }

                if (user.rose < amount) {
                    return await interaction.reply({
                        embeds: [
                            interaction.client.embedManager.Error({
                                content: getTranslation("errors", "partner.notEnoughRoses", interaction.locale)
                            })
                        ]
                    });
                }

                const flooredLevel = Math.floor(partnership.level);
                const currentLevelProgress = partnership.level - flooredLevel;
                const next = upgradeRequirements[flooredLevel + 1];

                const remaining = next * (1 - currentLevelProgress);

                if (amount > remaining) {
                    amount = remaining;
                }

                partnership.level += amount / (upgradeRequirements[flooredLevel + 1]);
                user.rose -= amount;

                partnership.markModified('level');
                user.markModified('rose');

                await partnership.save();
                await user.save();

                if (amount === remaining) {
                    return await interaction.reply({
                        embeds: [
                            interaction.client.embedManager.Success({
                                content: getTranslation("errors", "partner.upgraded", interaction.locale, {
                                    level: Math.floor(partnership.level)
                                })
                            })
                        ]
                    });
                } else {
                    return await interaction.reply({
                        embeds: [
                            interaction.client.embedManager.Success({
                                content: getTranslation("errors", "partner.upgradedBy", interaction.locale, {
                                    amount
                                })
                            })
                        ]
                    });
                }
            }

            const item = SHOP_ITEMS.find(i => i.id === itemID);

            if (!item) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidItem", interaction.locale)
                        })
                    ]
                });
            }

            if (item.type == 'tool') {
                return;
            }

            const shopItem = user.inventory.shopItems.find(i => i.id === item.id);

            if (!shopItem) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "shop.notEnoughAmount", interaction.locale, {
                                item: item.name[interaction.locale],
                                amount: String(amount)
                            }).replace('$itemEmoji', item.emojis?.constant ?? '📦')
                        })
                    ]
                });
            }

            const amountToUse = amount === Infinity ? shopItem.amount : Math.min(amount, shopItem.amount);

            if (amountToUse < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "shop.notEnoughAmount", interaction.locale, {
                                item: item.name[interaction.locale],
                                amount: String(amount)
                            }).replace('$itemEmoji', item.emojis?.constant ?? '📦')
                        })
                    ]
                });
            }

            if (amountToUse === shopItem.amount) {
                user.inventory.shopItems = user.inventory.shopItems.filter(i => i.id !== item.id);
            } else {
                shopItem.amount -= amountToUse;
                if (shopItem.amount < 1) {
                    user.inventory.shopItems = user.inventory.shopItems.filter(i => i.amount > 0);
                }
            }

            let message = `${item.emojis?.animated! ?? item.emojis.constant} ${getTranslation("commands", "shop.opening", interaction.locale, {
                item: item.name[interaction.locale],
                amount: String(amountToUse)
            })}`;

            const msg = await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Info({
                        content: message
                    })
                ]
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const availableRewards = getAvailableRewards(item);
            const rewards: {
                [key in REWARD_KEYS]: number;
            } = {
                seth: 0,
                luck: 0,
                rose: 0
            };

            for (let i = 0; i < amountToUse; i++) {
                const reward = getRandomReward(item, availableRewards as REWARD_KEYS[]);

                if (!reward.amount) {
                    reward.reward = 'seth';
                    reward.amount = rand(item.rewards.seth[0], item.rewards.seth[1]);
                }
                rewards[reward.reward] += reward.amount;

                if (reward.reward === 'seth') {
                    user.wallet.seth += reward.amount;
                } else if (reward.reward === 'luck') {
                    user.luck += reward.amount;
                } else if (reward.reward === 'rose') {
                    user.rose += reward.amount;
                }
            }

            user.markModified('inventory');

            await user.save();

            let rewardsString = '';

            const intl = new Intl.NumberFormat(interaction.locale).format;

            for (const [reward, amount] of Object.entries(rewards) as [REWARD_KEYS, number][]) {
                if (amount < 1) {
                    continue;
                }

                rewardsString += `${(({
                    seth: '$seth',
                    luck: Luck.luck,
                    rose: '$rose'
                } as any)?.[reward] ?? getTranslation("global", reward, interaction.locale))} ${intl(Math.floor(amount))} `;
            }

            rewardsString = rewardsString.slice(0, -1);

            message = `${item.emojis.open ?? item.emojis.constant} ${getTranslation("commands", "shop.opened", interaction.locale, {
                item: item.name[interaction.locale],
                amount: String(amountToUse),
                rewards: rewardsString
            })}`;

            const current = await msg.fetch();

            if (current && current.editable) {
                await current.edit({
                    embeds: [
                        interaction.client.embedManager.Success({
                            content: message.split('$seth').join(seth).split('$rose').join(Partnership.rose)
                        })
                    ]
                });
            }

        } catch (e) {
            console.error(e);

            try {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "shop.error", interaction.locale)
                        })
                    ]
                });
            } catch (e) {
                console.error(e);
            }
        }
    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const value = interaction.options.getString('item') ?? interaction.options.getString('esya') ?? '';

    const items = [];

    if (PARTNERSHIP_ROSE.name[interaction.locale].startsWith(value)) {
        items.push({
            name: PARTNERSHIP_ROSE.name["en-US"],
            value: String(PARTNERSHIP_ROSE.id),
            nameLocalizations: PARTNERSHIP_ROSE.name
        });
    }

    for (const item of SHOP_ITEMS) {
        if (items.length > 25) {
            break;
        }

        if (item.name[interaction.locale].startsWith(value)) {
            items.push({
                name: item.name["en-US"],
                value: String(item.id),
                nameLocalizations: item.name
            });
        }
    }

    return await interaction.respond(items);
}