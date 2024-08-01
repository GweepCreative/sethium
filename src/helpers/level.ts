import { Client } from "discord.js"
import { PopulatedUser } from "../models/User"

export function LevelToXP(level: number) {
    return 50 * Math.sqrt(Math.pow(level, 3))
}

export function XPToLevel(xp: number) {
    const res = Math.pow(Math.pow(xp / 50, 2), 1 / 3)

    return xp === LevelToXP(res) && xp > 0 ? res + 1 : res
}

export function isLevelingUp(oldXP: number, newXP: number) {
    return Math.floor(XPToLevel(oldXP)) < Math.floor(XPToLevel(newXP))
}

export function checkLevelUp(client: Client, user: PopulatedUser, increasment: number) {
    user.xp = (user.xp || 0) + increasment

    const reward = (Math.floor(XPToLevel(user.xp)) + 1) * 2000;
    user.wallet.seth = (user.wallet.seth || 0) + reward;

    if (isLevelingUp(user.xp - increasment, user.xp)) {
        client.emit('levelUp', client, user)
    }
}