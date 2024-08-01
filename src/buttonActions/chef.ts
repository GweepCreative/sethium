import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import User from "../models/User";
import { InferSchemaType } from "mongoose";
import Log from "../models/Log";
import { ChefEmojis, seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";

async function tables(interaction: ButtonInteraction, user: InferSchemaType<typeof User.schema>) {
    const tables = [];
    const chairs = [];

    let closestTableToBreaking = 10;
    let closestChairToBreaking = 3;

    for (let table of user.chef.tables) {
        tables.push(table.table);

        if (table.table < closestTableToBreaking) {
            closestTableToBreaking = table.table;
        }

        chairs.push(table.firstChair);
        chairs.push(table.secondChair);

        if (table.firstChair < closestChairToBreaking) {
            closestChairToBreaking = table.firstChair;
        }

        if (table.secondChair < closestChairToBreaking) {
            closestChairToBreaking = table.secondChair;
        }
    }

    const chairCurrent = chairs.filter(chair => chair > 0).length;
    //const chairBreakCount = chairs.filter(chair => chair === closestChairToBreaking).length;

    const tableCurrent = tables.filter(table => table > 0).length;
    //const tableBreakCount = tables.filter(table => table === closestTableToBreaking).length;

    let description = getTranslation("commands", "chef.chair", interaction.locale, {
        current: chairCurrent,
        total: chairs.length,
    }) + '\n';

    for (let i = 0; i < chairCurrent; i++) {
        description += ChefEmojis.chair;
    }

    description += `\n> ${getTranslation("commands", "chef.chairBreakAfter", interaction.locale, {
        count: 1, //chairBreakCount,
        durability: closestChairToBreaking
    })}\n\n`;

    description += getTranslation("commands", "chef.table", interaction.locale, {
        current: tableCurrent,
        total: tables.length,
    }) + '\n';

    for (let i = 0; i < tableCurrent; i++) {
        description += ChefEmojis.table;
    }

    description += `\n> ${getTranslation("commands", "chef.tableBreakAfter", interaction.locale, {
        count: 1, // tableBreakCount,
        durability: closestTableToBreaking
    })}`;

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                content: description
            })
        ]
    });
}

export default async function ChefButtons(interaction: ButtonInteraction) {
    const [_, action, userID] = interaction.customId.split(".");

    if (userID !== interaction.user.id) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.notYourAccount", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    if (
        !['tables'].includes(action)
    ) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.invalidAction", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    const user = await User.findOne({ id: interaction.user.id });

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "account.noAccount", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    const handlers = {
        tables
    } as any;

    try {
        await handlers?.[action]?.(interaction, user);
    } catch (error) {
        console.log(`Error executing ${interaction.customId}`);
        console.log(error);

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ], ephemeral: true
        });
    }
}