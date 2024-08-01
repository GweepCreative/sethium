import User from "../../models/User";

export default async function checkPremiumsPassed() {
    try {
        // If premium.expiration is less than the current date, set it to null
        const res = await User.updateMany(
            {
                "premium.expiration": {
                    $lt: Date.now()
                },
                "premium.status": true
            },
            {
                $set: {
                    "premium.status": false
                }
            }
        );

        console.log(`Updated ${res.matchedCount} users to non-premium.`);
    } catch (e) {
        console.log(e);
    }
}