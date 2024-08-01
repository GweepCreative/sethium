import { ActionRowBuilder, ButtonBuilder, Client } from "discord.js";
import { InferSchemaType } from "mongoose";
import User from "../models/User";
import { calculateJobTier, promotionLevels } from "./job";

export const createRows = (buttons: ButtonBuilder[]) => Array.from({ length: 3 }, (_, i) => (
    new ActionRowBuilder()
        .addComponents(buttons.slice(i * 3, (i + 1) * 3))
));

export const isAdvancingAvailable = async (user: InferSchemaType<typeof User.schema>, client?: Client): Promise<boolean | null> => {
    let isAvailable = false;
    
    if (!user.canAdvance) {
        if (!user.job) {
            return null;
        }

        const currentJobTier = await calculateJobTier(user.job);
        

        if (currentJobTier >= 3) {
            return null;
        }

        const next = promotionLevels?.[currentJobTier + 1];

        if (!next) {
            return null;
        }

        isAvailable = user.workExperience >= next;

        if (isAvailable) {
            user.canAdvance = true;
           
        }
    }

    if (client && (user.canAdvance || isAvailable)) {
        try {
            const messageToSend = await client.users.fetch(user.id);

            if (messageToSend) {
                const dm = await messageToSend.createDM();

                const locales = {
                    "en-US": "You have enough work experience to advance to the next tier of your job!",
                    "en-GB": "You have enough work experience to advance to the next tier of your job!",
                    "tr": "İş tecrübeniz artık bir sonraki seviyeye geçmek için yeterli!"
                } as any;

                if (dm) await dm.send({
                    embeds: [
                        client.embedManager.Info({
                            content: locales[user.language]
                        })
                    ]
                });

            }
        } catch (e) {
            console.log(`Cannot send promotion message to ${user.id}:`, e);
        }
    }

    return user.canAdvance || isAvailable;
}