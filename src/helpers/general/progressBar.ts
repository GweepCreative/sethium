const filled = {
    left: "<:soldolu:1203422221234741298>",
    right: "<:sagdolu:1203422285546127360>",
    middle: "<:ortadolu:1203422258043822081>"
}
const empty = {
    left: "<:solbos:1203422186749042778>",
    right: "<:sagbos:1203422271801266227>",
    middle: "<:ortabos:1203422242831343626>"
}
export const percentage = (current: number, total: number) => (current / total * 100).toFixed(2);

export default function ProgressBar(current: number, total: number, length: number = 10, percentage: boolean = false) {
    // Calculate the ratio of current progress to total
    const ratio = Math.max(Math.min(current / total, 1), 0);

    // Calculate how many slots should be filled
    const filledSlots = Math.round(ratio * length);

    // Build the progress bar
    let progressBar = '';

    progressBar += filledSlots > 0 ? filled.left : empty.left;

    progressBar += filled.middle.repeat(Math.max(filledSlots - 1, 0));
    progressBar += empty.middle.repeat(Math.max(length - filledSlots - 1, 0));

    progressBar += filledSlots == length ? filled.right : empty.right;

    if (percentage)
        progressBar += ` \`${(ratio * 100).toFixed(2)}%\``;

    return progressBar;

}