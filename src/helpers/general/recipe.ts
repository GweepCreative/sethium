import mongoose, { InferSchemaType } from "mongoose";
import { PopulatedItem } from "../../models/Item";
import Loot from "../../models/Loot";
import getTranslation from "../i18n";

interface Recipe { 
    variants: {
        variant: string;
        quantity: number;
    }[];
    loots: {
        loot: InferSchemaType<typeof Loot.schema> & mongoose.Document<typeof Loot.schema>;
        quantity: number;
    }[];
    items: {
        item: PopulatedItem;
        quantity: number;
    }[];
}

export function recipeToHumanReadable(recipe: Recipe, locale: string): string {
    let recipeList = new Map<string, number>();

    for (const variant of recipe.variants) {
        const name = getTranslation("global", variant.variant, locale === "tr" ? "tr" : "en");
        const value = parseInt(recipeList.get(name) as any) ?? 0;
        recipeList.set(name, (value ? value : 0) + variant.quantity);
    }

    for (const loot of recipe.loots) {
        const value = parseInt(recipeList.get(loot.loot.title) as any) ?? 0;
        recipeList.set(`${loot.loot.emoji} ${loot.loot.title}`, (value ? value : 0) + loot.quantity);
    }

    for (const item of recipe.items) {
        const value = parseInt(recipeList.get(item.item.title) as any) ?? 0;
        recipeList.set(`${item.item.emoji} ${item.item.title}`, (value ? value : 0) + item.quantity);
    }

    let recipeString = "";

    for (const [key, value] of recipeList.entries()) {
        recipeString += `${value}x ${key} `;
    }

    return recipeString.slice(0, -1);
}