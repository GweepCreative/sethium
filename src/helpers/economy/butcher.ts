import { InferSchemaType } from "mongoose";
import User, { PopulatedUser } from "../../models/User";
import { butcher, seth } from "../../constants/emojis";
import getTranslation from "../i18n";

export const transports = [
    {
        name: "cow",
        price: 1000,
        cooldown: 1000 * 60 * 15
    },
    {
        name: "sheep",
        price: 500,
        cooldown: 1000 * 60 * 15
    },
    {
        name: "chicken",
        price: 250,
        cooldown: 1000 * 60 * 15
    }
]

const animals = {
    cow: "<:inek:1197223657039200396>",
    sheep: "<:koyun:1197223535395999804>",
    chicken: "<:tavuk:1197223625762275408>",
} as {
    [key: string]: string;
}

const animalUnicodeEmojis: {
    [key: string]: string
} = {
    "cow": "🥩",
    "sheep": "🍖",
    "chicken": "🍗"
}

export const animalLootIDS = {
    "cow": 25,
    "sheep": 26,
    "chicken": 27
}
export const animalEmojis = animals;

export function getTransportFields(user: InferSchemaType<typeof User.schema> | PopulatedUser, locale: "en-US" | "en-GB" | "tr" = "en-US") {

    const fields = [];

    for (const transport of transports) {
        const renewal = (user.butcher as any).transports[transport.name]?.renewal;

        const isAvailable = (!renewal || isNaN(new Date(renewal).getTime())) || (renewal.getTime()) < Date.now();
        const arrival = new Date(renewal).getTime();

        // convert number like 1000 to 1,000
        const intl = new Intl.NumberFormat(locale, {
            style: 'decimal',
            maximumFractionDigits: 1
        }).format;

        if (!renewal || isNaN(new Date(renewal).getTime())) {
            fields.push({
                name: getTranslation("global", transport.name, locale) + (
                    isAvailable
                        ? ""
                        : ` (${getTranslation("global", "arrivesIn", locale, {
                            time: Math.floor(arrival / 1000)
                        })})`
                ),
                value: `${butcher.capacity} ${isAvailable ? 5 : 0}/5\n${intl(transport.price)} ${seth}`,
                inline: true
            });
        } else {

            fields.push({
                name: getTranslation("global", transport.name, locale) + (
                    isAvailable
                        ? ""
                        : ` (${getTranslation("global", "arrivesIn", locale, {
                            time: Math.floor(arrival / 1000)
                        })})`
                ),
                value: `${butcher.capacity} ${isAvailable ? 5 : 0}/5\n${intl(transport.price)} ${seth}`,
                inline: true
            })
        }
    }

    return fields;
}

export function getAvailableTransports(user: InferSchemaType<typeof User.schema> | PopulatedUser) {
    const availableTransports = [];

    for (const transport of transports) {
        const renewal = (user.butcher as any).transports[transport.name]?.renewal;

        const isAvailable = !renewal || isNaN(new Date(renewal).getTime()) || (renewal.getTime()) < Date.now();

        availableTransports.push({
            name: transport.name,
            emoji: animals[transport.name],
            disabled: !isAvailable
        });
    }

    return availableTransports;
}

export function canBeButcherAnimals(user: InferSchemaType<typeof User.schema> | PopulatedUser) {
    const isAnyAnimalsOnStorage = ['cow', 'sheep', 'chicken'].map(animal => [(user as any).butcher.storage[animal] > 0, animal]) as [boolean, string][];
    const emptySpaceOnRefrigerator = user.butcher.refrigerator.reduce((acc: number, refrigerator: any) => acc + (refrigerator.capacity - refrigerator.total), 0);

    return {
        result: isAnyAnimalsOnStorage.some(x => x[0]) && (emptySpaceOnRefrigerator >= 5),
        space: emptySpaceOnRefrigerator,
        on: isAnyAnimalsOnStorage.map(x => x[1])
    };
}

export function listOfRefrigerator(user: InferSchemaType<typeof User.schema> | PopulatedUser, locale: "en-US" | "en-GB" | "tr" = "en-US") {

    const fields = [];

    for (const [idx, refrigerator] of Object.entries(user.butcher.refrigerator)) {
        fields.push({
            name: `${getTranslation("global","refrigerator", locale)} #${Number(idx) + 1} (${refrigerator.total}/${refrigerator.capacity})`,
            /* description: `${refrigerator.total}/${refrigerator.capacity} ${
                transports.map(({name}) => (
                    `(${(animalUnicodeEmojis as any)[name]}: ${(refrigerator as any)[name]})`
                )).join(' ')
            }`, */
            value: idx,
            inline: true
        });
    }

    return fields;
}