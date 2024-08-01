import { Client } from "discord.js";
import { Achievement, AchievementName, AchievementStep, achievementNames, achievements } from "../../constants/achievements";
import { PopulatedUser } from "../../models/User";
import getTranslation from "../i18n";
import { calculateJobTier } from "../job";

export const createAchievementMap = () => new Map<string, number>(
    achievementNames.map(name => [name, 0])
);

export function getAchievementStep(user: PopulatedUser, name: AchievementName): AchievementStep | null {
    const achievement = achievements.find(achievement => achievement.name === name);
    if (!achievement) throw new Error("Achievement not found.");

    const currentStep = Number(user.achievements.get(name) || 0);

    if (achievement.children) {
        return achievement.children[
            achievement.hidden
                ? 0
                : Math.min(currentStep, achievement.children.length - 1)
        ];
    }

    return null;
}

export function getAchievement(name: AchievementName): Achievement | null {
    return achievements.find(achievement => achievement.name === name) || null;
}

export function getNextAchievementStep(user: PopulatedUser, name: AchievementName): AchievementStep | null {
    const achievement = getAchievement(name);
    if (!achievement) throw new Error("Achievement not found.");

    const currentStep = Number(user.achievements.get(name) || 0);

    if (achievement.children && currentStep < achievement.children.length - 1) {
        return achievement.children[currentStep + 1];
    }

    return null;
}

export function calculateCurrentAchievementStep(user: PopulatedUser, name: AchievementName): number {
    const achievement = getAchievement(name);
    if (!achievement) throw new Error("Achievement not found.");

    let currentStep = 0;

    if (achievement.children) {
        for (let { status } of achievement.children) {
            const res = status(user);

            if (res[0] < res[1]) {
                break;
            }

            currentStep++;
        }
    }

    return currentStep;
}

export function isAchievementProgressed(user: PopulatedUser, name: AchievementName) {
    const achievement = getAchievement(name);
    if (!achievement) throw new Error("Achievement not found.");

    if (!achievement.children) return false;

    const currentStep = Number(user.achievements.get(name) || 0);
    const recalculatedStep = calculateCurrentAchievementStep(user, name);

    return recalculatedStep > currentStep;
}

export async function increaseActionCount(client: Client, user: PopulatedUser, name: AchievementName, increasement: number = 1) {
    const achievement = getAchievement(name);
    if (!achievement) throw new Error("Achievement not found.");

    if (name === "luck") {
        user.luck = (user.luck || 0) + increasement;
        user.markModified("luck");
    } else if (name === "level") {

    } else {
        user.actionCounts[name] = (user.actionCounts[name] || 0) + 1;
        user.markModified(`actionCounts.${name}`);
    }

    const isProgressed = isAchievementProgressed(user, name);

    if (isProgressed) {
        const step = getNextAchievementStep(user, name);

        if (step) {
            user.achievements.set(name, Number(user.achievements.get(name) || 0) + 1);
            user.markModified(`achievements.${name}`);

            if (typeof step?.reward?.seth === "number") {
                user.wallet.seth = (user.wallet.seth || 0) + step.reward.seth;
                user.markModified("wallet.seth");
            }
        }

        try {
            const account = await client.users.fetch(user.id);
            const lang = user.language === "tr" ? "tr" : "en";

            if (account) {
                await account.send({
                    embeds: [
                        client.embedManager.Success({
                            content: getTranslation("commands", "achievements.progress", user.language, {
                                level: user.achievements.get(name),
                                achievement: achievement.label[lang],
                                details: step?.label[lang]
                            })
                        })
                    ]
                });
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    return true;
}

export async function countOfCompletedAchievements(user: PopulatedUser): Promise<[number, number]> {
    let count = 0;

    for (const name of achievementNames) {
        const step = getAchievementStep(user, name);
        if (!step) continue;

        const [current, total] = step.status(user);

        if (current >= total) {
            count++;
        }
    }

    return [count + (user.job ? await calculateJobTier(user.job) : 0), achievementNames.length + 3];
}

export function listOfAchievements(user: PopulatedUser): string {
    return achievementNames.map(name => {
        const step = getAchievementStep(user, name);

        if (!step) {
            return `**${name}**\n${user.language === "tr" ? "Tamamlandı" : "Completed"
                }`;
        }

        const [current, total] = step.status(user);
    }).join("\n\n");
}