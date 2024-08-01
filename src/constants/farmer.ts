export const availableVegetables = [
    "pepper",
    "carrot",
    "tomato",
    "cucumber"
] as const;

export const vegetableNames = {
    pepper: "Biber",
    carrot: "Havuç",
    tomato: "Domates",
    cucumber: "Salatalık"
} as {
    [key: string]: string
};