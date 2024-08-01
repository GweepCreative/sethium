import { Locale } from "discord.js";
import { ToolsEmojis } from "./emojis";

export interface IShopItem {
    id: number;
    name: Record<Locale, string>;
    price: number;
    type: 'box' | 'item' | 'rose' | 'tool';
    emojis: {
        constant: string;
    };
    usable: boolean;
}

type ITool = IShopItem & {
    type: 'tool';
    emojis: {
        constant: string;
    };
    durability: number;
    usable: false;
    job: string;
}

type IBox = IShopItem & {
    type: 'box';
    emojis: {
        constant: string;
        animated: string;
        open: string;
    };
    rewards: Record<REWARD_KEYS, [number, number]>;
    usable: true;
}

export type IItem<T extends IShopItem["type"]> = IShopItem & (
    T extends 'box' ? IBox :
    T extends 'tool' ? ITool :
    IShopItem
);

export const BOXES = [
    {
        id: 1,
        name: {
            "en-US": 'Classic Box',
            "en-GB": 'Classic Box',
            tr: 'Klasik Kutu'
        },
        emojis: {
            constant: '<:klasikkutu:1221897470905417782>',
            animated: '<a:klasikkutuaciliyor:1224348281249861763>',
            open: '<:klasikkutuacildi:1221897110933340350>'
        },
        price: 25000,
        rewards: {
            seth: [20000, 30000],
            luck: [1, 5],
            rose: [1, 2]
        },
        usable: true,
    }
];

export const PARTNERSHIP_ROSE = {
    id: 9999,
    name: {
        "en-US": 'Partnership Rose',
        "en-GB": 'Partnership Rose',
        tr: 'Ortaklık Gülü'
    },
    price: 0,
    type: 'rose',
    emojis: {
        constant: '🌹'
    },
} as IItem<'rose'>;

export const TOOL_IDS = {
    pickaxe: 10,
    axe: 11,
    fishingRod: 12,
    saw: 13,
    cleaver: 14,
    hoe: 15,
    spoon: 16
} as Record<string, number>;

export const SHOP_TOOLS = [
    {
        id: 10,
        name: {
            "en-US": 'Pickaxe',
            "en-GB": 'Pickaxe',
            tr: 'Kazma'
        },
        price: 27500,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.pickaxe
        },
        job: "Madenci"
    },
    {
        // Balta
        id: 11,
        name: {
            "en-US": 'Axe',
            "en-GB": 'Axe',
            tr: 'Balta'
        },
        price: 27500,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.axe
        },
        job: "Oduncu"
    },
    {
        // Olta
        id: 12,
        name: {
            "en-US": 'Fishing Rod',
            "en-GB": 'Fishing Rod',
            tr: 'Olta'
        },
        price: 27500,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.fishingRod
        },
        job: "Balıkçı"
    },
    {
        // Testere
        id: 13,
        name: {
            "en-US": 'Saw',
            "en-GB": 'Saw',
            tr: 'Testere'
        },
        price: 45000,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.saw
        },
        job: "Marangoz"
    },
    {
        // Satır
        id: 14,
        name: {
            "en-US": 'Cleaver',
            "en-GB": 'Cleaver',
            tr: 'Satır'
        },
        price: 45000,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.cleaver
        },
        job: "Kasap"
    },
    {
        // Çapa
        id: 15,
        name: {
            "en-US": 'Hoe',
            "en-GB": 'Hoe',
            tr: 'Çapa'
        },
        price: 65000,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.hoe
        },
        job: "Çiftçi"
    },
    {
        // Kaşık
        id: 16,
        name: {
            "en-US": 'Spoon',
            "en-GB": 'Spoon',
            tr: 'Kaşık'
        },
        price: 65000,
        type: 'tool',
        durability: 30,
        emojis: {
            constant: ToolsEmojis.spoon
        },
        job: "Şef"
    }
]

export const SHOP_ITEMS = [
    ...BOXES as IItem<'box'>[],
    ...SHOP_TOOLS as IItem<'tool'>[]
]

export type REWARD_KEYS = 'seth' | 'luck' | 'rose';

export const REWARDS_LIST = ['seth', 'luck', 'rose'] as REWARD_KEYS[];
