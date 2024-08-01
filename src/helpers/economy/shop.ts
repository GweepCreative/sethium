import { IItem, REWARDS_LIST, REWARD_KEYS } from "../../constants/shop";
import selectRandom from "../array/selectRandom";
import rand from "../math/rand";

export const getAvailableRewards = (box: IItem<'box'>) => {
    const availableRewards = [];

    for (const reward of REWARDS_LIST) {
        if (reward in box.rewards) {
            availableRewards.push(reward);
        }
    }

    return availableRewards;
}

export const getRandomReward = (box: IItem<'box'>, list: REWARD_KEYS[]) => {
    const reward = selectRandom(list) as REWARD_KEYS;
    const rewardRange = box.rewards[reward];

    return {
        reward,
        amount: rewardRange ? rand(rewardRange[0], rewardRange[1]) : null
    }
}