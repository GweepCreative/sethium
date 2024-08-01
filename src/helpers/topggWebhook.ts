import { Webhook } from "@top-gg/sdk";
import express from "express";
import User from "../models/User";
import { Client } from "discord.js";

export default async function createTopGGWebhook(client: Client,authorization: string) {
    console.log("Creating TopGG Webhook");

    const webhook = new Webhook(authorization, {
        error: (error) => {
            console.error("TopGG Webhook Error:", error)
        }
    })

    const app = express();

    app.post(
        "/vote",
        webhook.listener(async (vote) => {
            try {
                const id = vote.user;

                const user = await User.findOne({
                    id
                });

                if (!user) return;

                const classicalBox = user.inventory.shopItems.find((item) => item.id === 1);

                if (classicalBox) classicalBox.amount += 1;
                else user.inventory.shopItems.push({
                    id: 1,
                    amount: 1
                });

                user.markModified("inventory.shopItems");

                user.votes.push(new Date());

                await user.save();

                const res = await client.users.fetch(id);

                const locales = {
                    "en-US": "Thank you for voting!",
                    "en-GB": "Thank you for voting!",
                    "tr": "Oy verdiğiniz için teşekkürler!"
                } as any;

                if (res) await res.send({
                    embeds: [
                        (client as any).embedManager.Info({
                            content: locales[user.language]
                        })
                    ]
                });
            } catch (error) {
                console.error("Error processing TopGG vote", error);
            }
        })
    );

    app.listen(3000, () => {
        console.log("TopGG Webhook is listening on port 3000");
    }); // your port
}