import { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { farmer } from "../../constants/emojis";
import { PopulatedUser } from "../../models/User";
import chunk from "../array/chunk";
import Loot from "../../models/Loot";
import SuperscriptNumber from "../number/superscript";
import { vegetableNames } from "../../constants/farmer";
import getTranslation from "../i18n";

export function listOfGrowedVegetables(user: PopulatedUser) {
    const indexes = Array.from({ length: 9 }, (_, i) => i);

    return indexes.filter(
        i => user.farmer?.zones[i].status === "planted" &&
            (Date.now() - new Date(user.farmer?.zones[i].lastAction).getTime()) >= 1000 * 60 * 15
    );
}

export function getNearestVegetableGrow(user: PopulatedUser, locale: string) {
    const nearest = user.farmer.zones.filter(
        zone => zone.status === "planted"
    ).sort(
        (a, b) => new Date(a.lastAction).getTime() - new Date(b.lastAction).getTime()
    )?.[0];

    if (!nearest) return null;
    //return new Intl.RelativeTimeFormat(locale).format(Math.floor((new Date(nearest.lastAction).getTime() + 1000 * 60 * 15 - Date.now()) / 1000), 'seconds')
    return Math.floor(new Date(nearest.lastAction).getTime() / 1000 + 60 * 15);
}

export function getVegetableKeyFromTitle(title: string) {
    return Object.entries(vegetableNames).find(([key, value]) => value === title)?.[0];
}

export function renderZones(user: PopulatedUser, locale: string) {
    const zones = user.farmer?.zones || [];
    const growedVegetables = listOfGrowedVegetables(user);

    const rows = chunk(zones, 3);

    return `${
        getTranslation("commands", "farmer.nearestVegetableGrow", locale, {
            time: getNearestVegetableGrow(user, locale)
        })
    }\n` + rows.map((row, i) => {
        return `# ` + row.map((zone, j) => {
            const index = i * 3 + j;

            let emoji = '';

            if (growedVegetables.includes(index)) {
                const key = getVegetableKeyFromTitle(zone.seed?.title!)! as keyof typeof farmer.growed;
                emoji = farmer.growed[key];
            } else {
                emoji = ({
                    "dried": farmer.soils.normal,
                    "plowed": farmer.soils.plowed,
                    "watered": farmer.soils.watered,
                    "planted": ({
                        "Biber": farmer.planted.pepper,
                        "Havuç": farmer.planted.carrot,
                        "Domates": farmer.planted.tomato,
                        "Salatalık": farmer.planted.cucumber,
                    } as any)[zone.seed?.title!] || farmer.soils.watered
                })[zone.status];
            }

            return `${emoji}${SuperscriptNumber(index + 1)}`;
        }).join(" ");
    }).join("\n");
}

export function zoneSelectionButtons(user: PopulatedUser, canBeDisabled: boolean, disabledWhen: string, suffix?: string) {
    const zones = user.farmer?.zones || [];

    const buttons = Array.from({ length: 9 }, (_, i) => {
        const isAvailable = canBeDisabled ? (
            zones[i]?.status !== disabledWhen
        ) : true

        return new ButtonBuilder()
            .setLabel((i + 1).toString())
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`farmer.select.${user.id}.${i}${suffix ? `.${suffix}` : ""}`)
            .setDisabled(!isAvailable);
    }) as ButtonBuilder[];

    const chunked = chunk(buttons, 3);

    return chunked;
}

export const primaryActionButton = (user: PopulatedUser, locale: string): {
    button: ButtonBuilder,
    status: "dried" | "plowed" | "watered" | "planted"
} => {

    const actions = {
        "dried": "plow",
        "plowed": "water",
        "watered": "plant",
        "planted": "harvest"
    };

    const isAllPlanted = user.farmer?.zones.every(zone => zone.status === "planted");

    if (isAllPlanted) {
        return {
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "harvest", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["planted"]}.${user.id}`),
            status: "planted"
        }
    }

    const isWatered = !isAllPlanted && user.farmer?.zones.some(zone => zone.status === "watered");

    if (isWatered) {
        return {
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "plant", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["watered"]}.${user.id}`),
            status: "watered"
        }
    }

    const isPlowed = !isWatered && user.farmer?.zones.some(zone => zone.status === "plowed");

    if (isPlowed) {
        return {
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "water", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["plowed"]}.${user.id}`),
            status: "plowed"
        }
    }

    const isDried = !isPlowed && user.farmer?.zones.some(zone => zone.status === "dried");

    if (isDried) {
        return {
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "plow", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["dried"]}.${user.id}`),
            status: "dried"
        }
    }

    return {
        button: new ButtonBuilder()
            .setLabel(getTranslation("global", "plow", locale))
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`farmer.${actions["dried"]}.${user.id}`),
        status: "dried"
    }
}

export const primaryActionButtons = (user: PopulatedUser, locale: string): {
    button: ButtonBuilder,
    status: "dried" | "plowed" | "watered" | "planted"
}[] => {
    const actions = {
        "dried": "plow",
        "plowed": "water",
        "watered": "plant",
        "planted": "harvest"
    };

    const buttons: {
        button: ButtonBuilder,
        status: "dried" | "plowed" | "watered" | "planted"
    }[] = [];


    const isSomeGrowed = listOfGrowedVegetables(user).length > 0;

    if (isSomeGrowed) {
        buttons.push({
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "harvest", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["planted"]}.${user.id}`),
            status: "planted"
        });
    }

    const isWatered = user.farmer?.zones.some(zone => zone.status === "watered");

    if (isWatered) {
        buttons.push({
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "plant", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["watered"]}.${user.id}`),
            status: "watered"
        });
    }

    const isPlowed = user.farmer?.zones.some(zone => zone.status === "plowed");

    if (isPlowed) {
        buttons.push({
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "water", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["plowed"]}.${user.id}`),
            status: "plowed"
        });
    }

    const isDried = !isPlowed && user.farmer?.zones.some(zone => zone.status === "dried");

    if (isDried) {
        buttons.push({
            button: new ButtonBuilder()
                .setLabel(getTranslation("global", "plow", locale))
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`farmer.${actions["dried"]}.${user.id}`),
            status: "dried"
        });
    }

    return buttons;
}

export const createPlantingSelectMenu = async (user: PopulatedUser, locale: string) => {
    const vegetables = await Loot.find({ variant: "vegetable" });

    const vegetableEmojis = Object.entries(farmer.vegetables).map(([name, emoji]) => ({
        name,
        emoji
    }));

    const options = vegetables.map(vegetable => {
        const name = vegetableEmojis.find(veg => veg.emoji === vegetable.emoji)?.name;

        if (!name) return null;

        const seed = (farmer.seeds as any)[name];

        return {
            label: getTranslation("global", name, locale),
            value: name,
            emoji: seed as string,
        }
    }).filter(x => x !== null) as {
        label: string,
        value: string,
        emoji: string
    }[];

    return {
        selectMenu: new StringSelectMenuBuilder()
            .setCustomId(`farmer.plant.${user.id}`)
            .setPlaceholder(getTranslation("commands", "farmer.selectVegetable", locale))
            .setMaxValues(1)
            .setMinValues(1)
            .addOptions(
                ...options
            )
    }
}