import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
} from "discord.js";
import User from "../models/User";
import Log from "../models/Log";
import { dices, seth } from "../constants/emojis";
import getTranslation from "../helpers/i18n";
import { increaseActionCount } from "../helpers/user/achievements";
import { checkLevelUp } from "../helpers/level";

export default async function DiceSelection(interaction: ButtonInteraction) {
  try {
    let [id, selection, amount]: any[] = interaction.customId
      .split("dice.select.")?.[1]
      .split(".");

    if (id !== interaction.user.id) {
      if (!interaction.replied)
        await interaction.reply({
          embeds: [
            interaction.client.embedManager.Error({
              content: getTranslation(
                "errors",
                "account.notYourAccount",
                interaction.locale
              ),
            }),
          ],
          ephemeral: true,
        });

      return;
    }

    selection = parseInt(selection);
    amount = parseInt(amount);

    if (isNaN(selection) || selection < 1 || selection > 6) {
      if (!interaction.replied)
        await interaction.reply({
          embeds: [
            interaction.client.embedManager.Error({
              content: getTranslation(
                "errors",
                "dice.invalidSelection",
                interaction.locale
              ),
            }),
          ],
          ephemeral: true,
        });

      return;
    }

    const user = await User.findOne({ id: interaction.user.id });

    if (!user) {
      if (!interaction.replied)
        await interaction.reply({
          embeds: [
            interaction.client.embedManager.Error({
              content: getTranslation(
                "errors",
                "account.noAccount",
                interaction.locale
              ),
            }),
          ],
          ephemeral: true,
        });

      return;
    }

    if (amount < 1 || isNaN(amount)) {
      if (!interaction.replied)
        await interaction.reply({
          embeds: [
            interaction.client.embedManager.Error({
              content: getTranslation(
                "errors",
                "general.invalidAmount",
                interaction.locale
              ),
            }),
          ],
        });

      return;
    }

    if (amount > user.wallet.seth) {
      if (!interaction.replied)
        await interaction.reply({
          embeds: [
            interaction.client.embedManager.Error({
              content: getTranslation(
                "errors",
                "general.infussicientBalance",
                interaction.locale
              ),
            }),
          ],
        });

      return;
    }

    let dicelist = Array.from({ length: 6 }, (_, i) => i + 1).map((i) =>
      new ButtonBuilder()
        .setCustomId(`dice.select.${interaction.user.id}.${i}.${amount}`)
        .setEmoji(dices[String(i)])
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    dicelist[selection - 1] = dicelist[selection - 1].setStyle(
      ButtonStyle.Primary
    );

    try {
      const msg = await interaction.message.fetch();
      if (msg && msg.editable)
        await msg.edit({
          embeds: [
            interaction.client.embedManager.Info({
              title: getTranslation(
                "commands",
                "dice.rollingTitle",
                interaction.locale
              ),
              content: getTranslation(
                "commands",
                "dice.rollingDescription",
                interaction.locale,
                {
                  amount,
                  dice: dices[String(selection)],
                  rolling: dices.rolling,
                }
              )
                .replace("$dice", dices[String(selection)])
                .replace("$rolling", dices.rolling),
            }),
          ],
          components: [
            new ActionRowBuilder().addComponents(dicelist.slice(0, 3)) as any,
            new ActionRowBuilder().addComponents(dicelist.slice(3, 6)) as any,
          ],
        });
    } catch (e) {
      console.log(e);
    }

    await interaction.update({ content: "." });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const isWon = Math.random() <= 1 / 6;
    const change = isWon ? amount * 6 : -amount;

    if (isWon) {
      await increaseActionCount(interaction.client, user as any, "dice");
    }

    user.wallet.seth += change;
    checkLevelUp(interaction.client, user as any, isWon ? 3 : 1);
    await user.save();

    await new Log({
      from: isWon ? "00000000000000000" : user.id,
      to: isWon ? user.id : "00000000000000000",
      type: "dice",
      amount: Math.abs(change),
    }).save();

    const dicesExceptSelection = [1, 2, 3, 4, 5, 6].filter(
      (i) => i !== selection
    );
    const randomDice = isWon ? selection :
      dicesExceptSelection[
        Math.floor(Math.random() * dicesExceptSelection.length)
      ];

    // DEBUG
    console.log("randomDice", randomDice);
    console.log("selection", selection);
    console.log("Rolled", dices[String(randomDice)]);

    const description = getTranslation(
      "commands",
      isWon ? "dice.win" : "dice.lose",
      interaction.locale,
      {
        reward: amount * 6,
        amount,
      }
    )
      .replace("$dice", dices[String(selection)])
      .replace("$rolled", dices[String(randomDice)]);

    dicelist[selection - 1] = dicelist[selection - 1].setStyle(
      isWon ? ButtonStyle.Success : ButtonStyle.Danger
    );

    try {
      const msg = await interaction.message.fetch(true);
      if (msg && msg.editable)
        await msg.edit({
          content: null,
          embeds: [
            interaction.client.embedManager.Info({
              title: getTranslation(
                "commands",
                "dice.title",
                interaction.locale
              ),
              content: description,
            }),
          ],
          components: [
            new ActionRowBuilder().addComponents(dicelist.slice(0, 3)) as any,
            new ActionRowBuilder().addComponents(dicelist.slice(3, 6)) as any,
          ],
        });
    } catch (e: any) {
      return console.log("The message no longer exists.");
    }
  } catch (e) {
    console.log(e);
  }
}
