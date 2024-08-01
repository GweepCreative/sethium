export const chefShopRequirements = {
    // Chair
    15: 8,
    // Table
    16: 4
} as {
    [key: number]: number
}

export const chefShopRequirementsIDs = {
    table: 16,
    chair: 15
}

export const meals = [
    32, // Chicken Menu
    33, // Fish Menu
    34, // Meat Doner
    35 // Salad
]

export const mealKeys = {
    32: "chicken",
    33: "fish",
    34: "doner",
    35: "salad"
} as {
    [key: number]: string

}

export const mealNames = {
    32: {
        "en-US": "Chicken Menu",
        "en-GB": "Chicken Menu",
        "tr": "Tavuk Menü"
    },
    33: {
        "en-US": "Fish Menu",
        "en-GB": "Fish Menu",
        "tr": "Balık Menü"
    },
    34: {
        "en-US": "Meat Doner",
        "en-GB": "Meat Doner",
        "tr": "Et Döner"
    },
    35: {
        "en-US": "Salad",
        "en-GB": "Salad",
        "tr": "Salata"
    }
} as {
    [key: number]: Record<any, string>
}

export const orderSelectionIcons = [
    "<:icons_1:866951385148293170>", 
    "<:icons_2:866951385416859668>", 
    "<:icons_3:866951386187825182>", 
    "<:icons_4:866951385114476565>", 
    "<:icons_5:866951385664978984>", 
    "<:icons_6:866951386372505600>", 
    "<:icons_7:866951385542950943>", 
    "<:icons_8:866951385765773323>",
]