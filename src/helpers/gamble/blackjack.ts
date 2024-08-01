import { Interaction } from "discord.js";
import { InferSchemaType } from "mongoose";
import Blackjack from "../../models/Blackjack";
import getTranslation from "../i18n";

export const deck = {
    c: {
        1: "<:ac:1212057383631855678>",
        2: "<:2c:1212057456646164530>",
        3: "<:3c:1212057305605079050>",
        4: "<:4c:1212057403441422376>",
        5: "<:5c:1212057405534244935>",
        6: "<:6c:1212057386513080370>",
        7: "<:7c:1212057444444930108>",
        8: "<:8c:1212067554814853201>",
        9: "<:9c:1212057418322673665>",
        10: "<:10c:1212057436274303037>",
        11: "<:jc:1212057400627036161>",
        12: "<:qc:1212057425432027237>",
        13: "<:kc:1212057471661768794>",
    },
    s: {
        1: "<:as:1212057508831559791>",
        2: "<:2s:1212062556479299646>",
        3: "<:3s:1212057430641606686>",
        4: "<:4s:1212057477491855470>",
        5: "<:5s:1212057413021077567>",
        6: "<:6s:1212057421556748368>",
        7: "<:7s:1212057439005052980>",
        8: "<:8s:1212057391873527808>",
        9: "<:9s:1212057496798105601>",
        10: "<:10s:1212057441613643806>",
        11: "<:js:1212057465605328907>",
        12: "<:qs:1212057499390181456>",
        13: "<:ks:1212067350367703100>",
    },
    d: {
        1: "<:ad:1212065085409984593>",
        2: "<:2d:1212057427982164029>",
        3: "<:3d:1212057487747063859>",
        4: "<:4d:1212057388811821136>",
        5: "<:5d:1212057479882473472>",
        6: "<:6d:1212057433732554752>",
        7: "<:7d:1212062713669484566>",
        8: "<:8d:1212057415785119794>",
        9: "<:9d:1212057408222920714>",
        10: "<:10d:1212063011611742308>",
        11: "<:jd:1212057453559029770>",
        12: "<:qd:1212057398081228800>",
        13: "<:kd:1212057410886312008>",
    },
    hf: {
        1: "<:ahf:1212057490443997285>",
        2: "<:2hf:1212067169127370823>",
        3: "<:3hf:1212057459888230410>",
        4: "<:4hf:1212057485154979921>",
        5: "<:5hf:1212057462421848144>",
        6: "<:6hf:1212057506184957993>",
        7: "<:7hf:1212057395270787072>",
        8: "<:8hf:1212057450526806116>",
        9: "<:9hf:1212057511511859240>",
        10: "<:10hf:1212063090078781440>",
        11: "<:jhf:1212057482659233832>",
        12: "<:qhf:1212057381354348636>",
        13: "<:khf:1212057516922511492>",
    }
} as any;

export const closed = "<:purplecard:1212068046928351262>";

export function createDeck(
    allowOverflow: boolean = false
) {
    const deck: number[] = [
        Math.floor(13 * Math.random() + 1)
    ];

    const maximum = allowOverflow ? 13 : (21 - deck[0]);

    deck[1] = Math.floor(maximum * Math.random()) + 1;

    return deck;
}

export function deckValue(deck: number[], removeLast: boolean = false) {
    let value = 0;
    const limit = removeLast ? deck.length - 1 : deck.length;

    for (let i = 0; i < limit; i++) {
        value += Math.min(deck[i], 10);
    }

    return value;
}

export function renderEmbed(interaction: Interaction, game: InferSchemaType<typeof Blackjack.schema>) {
    const isDealersLastCardClosed = game.active;

    let dealers = [], users = [];

    {
        const limit = isDealersLastCardClosed ? game.dealerCards.length - 1 : game.dealerCards.length;
        for (let i = 0; i < limit; i++) {
            dealers.push(deck?.[game.dealerType]?.[String(game.dealerCards[i]) as any]);
        }

        if (isDealersLastCardClosed) {
            dealers.push(closed);
        }
    }

    for (let card of game.userCards) {
        users.push(deck?.[game.userType]?.[String(card) as any]);
    }

    const dealersPoint = deckValue(game.dealerCards, isDealersLastCardClosed ? true : false);
    const usersPoint = deckValue(game.userCards)

    const fields = [
        {
            name: `${getTranslation("global", "dealer", interaction.locale)} **\`[${dealersPoint}${isDealersLastCardClosed ? ` + ?` : ""}]\`**`,
            value: dealers.join(" "),
            inline: true
        },
        {
            name: `${getTranslation("global", "user", interaction.locale)} **\`[${usersPoint}]\`**`,
            value: users.join(" "),
            inline: true
        }
    ]

    const header = getTranslation("commands", "blackjack.header", interaction.locale, {
        username: interaction.user.username,
        amount: game.bet
    });

    return {
        fields,
        header
    }
}