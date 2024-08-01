import { upgradeRequirements } from "../../constants/partner";

export function LevelToRose(level: number) {
    let rose = 0;

    for (let i = 0; i < Math.floor(level); i++) {
        rose += upgradeRequirements[i];
    }

    const float = level - Math.floor(level);

    rose += upgradeRequirements[Math.floor(level)] * float;

    let full = rose + (upgradeRequirements[Math.floor(level)] * (1 - float));

    return [Math.floor(rose), Math.floor(full)]
}