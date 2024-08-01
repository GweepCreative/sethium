import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import Log from "../../models/Log";
import { seth } from "../../constants/emojis";
import Blackjack from "../../models/Blackjack";
import { InferSchemaType } from "mongoose";
import { createDeck, renderEmbed } from "../../helpers/gamble/blackjack";
import getTranslation from "../../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('blackjack')
    .setNameLocalization('tr', 'blackjack')
    .setDescriptionLocalization('tr', 'Blackjack oyna')
    .setDescription('Play blackjack')
    .addNumberOption(option =>
        option.setName('amount')
            .setDescription('The amount you want to bet')
            .setDescriptionLocalization('tr', 'Bahis miktarı')
            .setRequired(true)
    );

export const timeout = 15000;

const deck = {
    dark1: "<:darka:1150033222865002558>",
    dark2: "<:dark2:1150033229634601063>",
    dark3: "<:dark3:1150033245635870800>",
    dark4: "<:dark4:1150033226715385886>",
    dark5: "<:dark5:1150033241760337971>",
    dark6: "<:dark6:1150033238107107431>",
    dark7: "<a:dark7:1211749849003851826>",
    dark8: "<:dark8:1150033234101542992>",
    dark9: "<:dark9:1150033219698315274>",
    dark10: "<:dark10:1150033215508185098>",
    darkq: "<:darkq:1150033443338600458>",
    darkk: "<a:darkk:1211749864279638147>",
    darkj: "<:darkj:1150048318194458735>",
    reda: "<:reda:1150033397792653362>",
    red2: "<:red2:1150033371909587034>",
    red3: "<:red3:1150033379773919242>",
    red4: "<:red4:1150033387885690952>",
    red5: "<:red5:1150033420978749440>",
    red6: "<:red6:1150033404914573312>",
    red7: "<:red7:1150033367618822226>",
    red8: "<:red8:1150033401039032461>",
    red9: "<:red9:1150033375067906079>",
    red10: "<:red10:1150033416398581841>",
    redq: "<:redq:1150033393455730758>",
    redk: "<:redk:1150033413483540500>",
    redj: "<:redj:1150033409159200838>",

}

const closed = "<:closecard:1211757562115002499>";

const deckAnimated = {
    dark1: "<a:darkagif:1150033306801418321>",
    dark2: "<a:dark2gif:1150033311729721464>",
    dark3: "<a:dark3gif:1150033303726985236>",
    dark4: "<a:dark4gif:1150033339206598726>",
    dark5: "<a:dark5gif:1150033333896630293>",
    dark6: "<a:dark6gif:1150033322211283036>",
    dark7: "<a:dark7gif:1150033329744269422>",
    dark8: "<a:dark8gif:1150033296152076410>",
    dark9: "<a:dark9gif:1150033348354396180>",
    dark10: "<a:dark10gif:1150033343304450048>",
    darkq: "<a:darkqgif:1150033315504607334>",
    darkk: "<a:darkkgif:1150033326275567617 >",
    darkj: "<a:darkjgif:1150033292377202789 >",
    red1: "<a:redagif:1150033299352330353>",
    red2: "<a:red2gif:1150033257279275049>",
    red3: "<a:red3gif:1150033249393971221>",
    red4: "<a:red4gif:1150033267391746090>",
    red5: "<a:redi5gif:1150033276237520897>",
    red6: "<a:red6gif:1150033252879437894>",
    red7: "<a:red7gif:1150033271233716285>",
    red8: "<a:red8gif:1150033282013077544>",
    red9: "<a:red9gif:1150033287553757265>",
    red10: "<a:red10gif:1150033363231592539>",
    redq: "<a:redqgif:1150033357686706196>",
    redk: "<a:redkgif:1150033352603209748>",
    redj: "<a:redjgif:1150033262123700264>",
}


export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const intl = new Intl.NumberFormat(interaction.locale, {
            notation: "compact"
        }).format;
        const user = await User.findOne({ id: interaction.user.id });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ]
            });
        }

        const activeBlackjack = await Blackjack.findOne({ userId: interaction.user.id, active: true });

        if (!activeBlackjack) {
            const amount = interaction.options.getNumber('amount', true);

            if (amount < 1) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.invalidAmount", interaction.locale)
                        })
                    ]
                });
            }

            if (amount > user.wallet.seth) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.infussicientBalance", interaction.locale)
                        })
                    ]
                });
            }

            const limit = user.premium.status ? 50000 : 25000;
    
            if (amount> limit) {
                return await interaction.reply({
                    embeds: [
                        interaction.client.embedManager.Error({
                            content: getTranslation("errors", "general.excessedLimit", interaction.locale, {
                                limit: `**${intl(limit)}**`
                            })
                        })
                    ]
                });
            }

            const blackjack = new Blackjack({
                userId: interaction.user.id,
                bet: amount,
                active: true,
                userCards: createDeck(),
                dealerCards: createDeck(),
                userType: ["d", "hf"][Math.floor(Math.random() * 2)],
                dealerType: ["c", "s"][Math.floor(Math.random() * 2)]
            });

            await blackjack.save();

            user.wallet.seth -= amount;
            await user.save();

            await (new Log({
                from: interaction.user.id,
                to: "00000000000000000",
                type: "blackjack",
                amount: amount
            })).save();

            return await initalizeGame(interaction, user, blackjack);
        }

        return await initalizeGame(interaction, user, activeBlackjack);
    } catch (error) {
        console.error(error);
    }
}

async function initalizeGame(interaction: ChatInputCommandInteraction, user: InferSchemaType<typeof User.schema>, game: InferSchemaType<typeof Blackjack.schema>) {

    const hit = new ButtonBuilder()
        .setCustomId(`blackjack.hit.${interaction.user.id}`)
        .setLabel(getTranslation("global", "hit", interaction.locale))
        .setStyle(ButtonStyle.Primary);

    const stop = new ButtonBuilder()
        .setCustomId(`blackjack.stop.${interaction.user.id}`)
        .setLabel(getTranslation("global", "stop", interaction.locale))
        .setStyle(ButtonStyle.Danger);

    let render = renderEmbed(interaction, game);

    const embed = interaction.client.embedManager.Info({
        fields: render.fields
    }).setAuthor({
        name: render.header,
        iconURL: interaction.user.displayAvatarURL()
    })

    await interaction.reply({ 
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents([hit, stop]) as any
        ]
     });
}