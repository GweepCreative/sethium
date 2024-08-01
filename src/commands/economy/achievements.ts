import { AutocompleteInteraction, ChatInputCommandInteraction, Locale, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import { calculateCurrentAchievementStep, getAchievement, getAchievementStep } from "../../helpers/user/achievements";
import { achievementNames, achievements } from "../../constants/achievements";
import ProgressBar, { percentage } from "../../helpers/general/progressBar";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('achievements')
    .setNameLocalization('tr', 'başarımlar')
    .setDescriptionLocalization('tr', 'Bot başarımlarını gösterir.')
    .setDescription('Displays list of bot achievements.')
    .addStringOption(
        option => option.setName('name')
            .setDescription('The name of the achievement')
            .setRequired(false)
            .setAutocomplete(true)
    );

export const shouldRegister = true;

export async function autocomplete(interaction: AutocompleteInteraction) {
    const value = interaction.options.getString('name')?.toLowerCase();

    const list = [];

    for (let achievement of achievements) {
        if (list.length >= 25) break;

        const firstUpperCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

        if (achievement.name.toLowerCase().includes(value || "") && !achievement.hidden) {
            list.push({
                name: firstUpperCase(achievement.name),
                value: achievement.name,
                nameLocalizations: {
                    tr: firstUpperCase(achievement.label.tr),
                }
            });
        }
    }

    return await interaction.respond(
        list
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const achievementLanguage = (({
        "en-US": "en",
        "en-GB": "en",
        "tr": "tr"
    } as any)?.[interaction.locale as any] || "en") as "en" | "tr";

    const user = (await User.findOne({ id: interaction.user.id }))! as PopulatedUser;

    const value = interaction.options.getString('name')?.toLowerCase() as any || "";

    for (const name of achievementNames) {
        const res = calculateCurrentAchievementStep(user, name);

        if (user.achievements.get(name) == res) continue;

        /* const achievement = getAchievementStep(user, name);

        if (!achievement) continue; */

        user.achievements.set(name, res);
    }

    await user.save();

    const embed = interaction.client.embedManager.Info({
        title: getTranslation('commands', 'achievements.title', interaction.locale),
        content: getTranslation('commands', 'achievements.description', interaction.locale)
    });

    if (value.length) {
        const achievement = getAchievement(value);

        if (!achievement) return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'achievements.noAchievements', interaction.locale)
                })
            ]
        });

        const step = getAchievementStep(user, value);

        if (!step) return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'achievements.noAchievements', interaction.locale)
                })
            ]
        });

        const status = step.status(user);

        embed.addFields({
            name: `**${achievement.label[achievementLanguage]}** (${step.label[achievementLanguage]}, ${percentage(status[0], status[1])}%)`,
            value: ProgressBar(status[0], status[1]),
            inline: false
        }).setDescription(
            embed.data.description + `\n\`${step.todo[achievementLanguage]}\``
        )
    } else {
        for (const name of achievementNames.slice(0, 25)) {
            const achievement = getAchievement(name);
            const step = getAchievementStep(user, name);

            if (!achievement || !step) continue

            const status = step.status(user);

            if (achievement.hidden ? status[0] >= status[1] : true) {

                const actions = {
                    'Madenci': {
                        en: 'mine',
                        tr: 'maden kaz'
                    },
                    'Oduncu': {
                        en: 'chop',
                        tr: 'odun kes'
                    },
                    'Balıkçı': {
                        en: 'fish',
                        tr: 'balık tut'
                    },
                    'Demirci': {
                        en: 'craft',
                        tr: 'eşya yap'
                    },
                    'Marangoz': {
                        en: 'craft',
                        tr: 'eşya yap'
                    },
                    'Kasap': {
                        en: 'chop',
                        tr: 'et kes'
                    },
                    'Çiftçi': {
                        en: 'harvest',
                        tr: 'hasat yap'
                    },
                    'Şef': {
                        en: 'cook',
                        tr: 'yemek yap'
                    }
                } as any;
        
                embed.addFields({
                    name: `**${achievement.label[achievementLanguage]}** (${step.label[
                        achievementLanguage
                    ].replace('$action', 
                        actions?.[user?.job?.name!]?.[interaction.locale === Locale.Turkish ? 'tr' : 'en'] || 'çalış'
                    )}, ${percentage(status[0], status[1])}%)`,
                    value: `${step.description[achievementLanguage]}`,
                    inline: false
                });
            }
        }
    }

    return await interaction.reply({
        embeds: [
            embed
        ]
    });
}