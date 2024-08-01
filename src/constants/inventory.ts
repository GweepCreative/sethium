type Category =  {
    name: {
        en: string;
        tr: string;
    };
    type: 'loot' | 'item' | 'tool' | 'shopItems' | 'equipment';
    job?: string;
    variant?: string;
    items?: number[];
};

export const JobEquipments = {
    "Madenci": "pickaxe",
    "Oduncu": "axe",
    "Balıkçı": "fishingRod",
    "Marangoz": "saw",
    "Kasap": "cleaver",
    "Çiftçi": "hoe",
    "Şef": "spoon",
} as Record<string, string>;

export const InventoryCategories = [
    {
        name: {
            "en": "Equipment",
            "tr": "Ekipman"
        },
        type: 'equipment'
    },
    {
        name: {
            en: "Ores",
            tr: "Madenler",
        },
        variant: 'ore',
        type: 'loot'
    },
    {
        name: {
            en: "Woods",
            tr: "Odunlar",
        },
        variant: 'wood',
        type: 'loot'
    },
    {
        name: {
            en: "Fishes",
            tr: "Balıklar",
        },
        variant: 'fish',
        type: 'loot'
    },
    {
        name: {
            en: "Furnitures",
            tr: "Mobilyalar",
        },
        items: [15,16,17,18],
        type: 'item'
    },
    {
        name: {
            en: "Meats",
            tr: "Etler",
        },
        variant: 'meat',
        type: 'loot'
    },
    {
        name: {
            en: "Fruits and Vegetables",
            tr: "Meyve ve Sebzeler",
        },
        variant: 'vegetable',
        type: 'loot'
    },
    {
        name: {
            en: "Boxes",
            tr: "Kutular",
        },
        items: [1],
        type: 'shopItems'
    },
    {
        name: {
            en: "Equipments",
            tr: "Ekipmanlar",
        },
        items: [],
        type: 'item',
        job: 'Demirci'
    }
] as Category[];