import { LevelToXP, XPToLevel } from "../helpers/level";
import { PopulatedUser } from "../models/User";

export const achievementNames = [
    "level", "bet", "slots", "daily", "guess", "dice", "luck", "sales", "blackjack", "work"
] as const;

export type AchievementName = typeof achievementNames[number];

export interface Achievement {
    name: AchievementName;
    children?: AchievementStep[];
    label: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    hidden?: boolean;
}

export interface AchievementStep {
    //descriptor: string;
    label: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    todo: {
        en: string;
        tr: string;
    };
    status: (user: PopulatedUser) => [number, number];
    reward?: {
        seth?: number;
    }
}

/* {

        if (i.values[0] === "efsanevi") {
            let bahiss;
            if (userdb.get(`meslek.${message.author.id}`) === "Çiftçi") bahiss = `<:ciftcibasarim:1201439934121254912> **Çiftçi**
<:replycont:1203383415983054868> 500 kere tohum ek.
<:replycont:1203383415983054868> ${emojis.sethium} **200.000** + ${emojis.yethium} **150**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`c.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`c.${message.author.id}`) || 0}/500\`\n`

            if (userdb.get(`meslek.${message.author.id}`) === "Demirci") bahiss = `<:demircibasarim:1201439859777228860> **Demirci**
<:replycont:1203383415983054868> 500 kere ekipman yap.
<:replycont:1203383415983054868> ${emojis.sethium} **150.000** + ${emojis.yethium} **100**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`d.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`d.${message.author.id}`) || 0}/500\`\n`

            if (userdb.get(`meslek.${message.author.id}`) === "Kasap") bahiss = `<:kasapbasarim:1201439969378574436> **Kasap**
<:replycont:1203383415983054868> 500 kere et kes.
<:replycont:1203383415983054868> ${emojis.sethium} **150.000** + ${emojis.yethium} **100**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`k.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`k.${message.author.id}`) || 0}/500\`\n`

            if (userdb.get(`meslek.${message.author.id}`) === "Marangoz") bahiss = `<:marangozbasarim:1201439874968989726> **Marangoz**
<:replycont:1203383415983054868> 500 kere eşya yap.
<:replycont:1203383415983054868> ${emojis.sethium} **150.000** + ${emojis.yethium} **100**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`m.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`m.${message.author.id}`) || 0}/500\`\n`

            if (userdb.get(`meslek.${message.author.id}`) === "Mühendis") bahiss = `<:muhendisbasarim:1201439950546145351> **Mühendis**
<:replycont:1203383415983054868> 500 kere gelişmiş ekipman yap.
<:replycont:1203383415983054868> ${emojis.sethium} **200.000** + ${emojis.yethium} **150**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`muh.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`muh.${message.author.id}`) || 0}/500\`\n`

            if (userdb.get(`meslek.${message.author.id}`) === "Şef") bahiss = `<:sefbasarim:1201439908796043264> **Şef**
<:replycont:1203383415983054868> 500 kere yemek servis et.
<:replycont:1203383415983054868> ${emojis.sethium} **200.000** + ${emojis.yethium} **150**
<:replycont:1203383415983054868> ${progressBar(basarimdb.get(`s.${message.author.id}`) || 0, 500, 5)}
<:reply:1203383401046999060> \`${basarimdb.get(`s.${message.author.id}`) || 0}/500\`\n`

            i.message.edit({
                embeds: [embed.setColor("#EDE75F").setDescription(`${bahiss || "Henüz görebileceğiniz **efsanevi** başarım yok."}`)]
            })
        }


    }
} */

export const achievements = [
    {
        name: "level",
        label: {
            en: "Level",
            tr: "Seviye"
        },
        description: {
            en: "You can earn these achievements by leveling up.",
            tr: "Bu başarıları seviye atlayarak kazanabilirsin."
        },
        children: [
            {
                "label": {
                    "en": "Sapling Philosopher 🌱",
                    "tr": "Fidan Filozofu 🌱"
                },
                "description": {
                    "en": "Congratulations, you're no longer a rookie!",
                    "tr": "Tebrikler, artık çömez değilsin!"
                },
                "todo": {
                    "en": "Reach level 10.",
                    "tr": "10. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(10)]
            },
            {
                "label": {
                    "en": "Experienced Rookie 😎",
                    "tr": "Tecrübeli Çaylak 😎"
                },
                "description": {
                    "en": "Now that you're getting the hang of this place, it's time to make a mess.",
                    "tr": "Artık buranın tozunu yutmaya başladın, yavaştan ortalığı dağıtma vakti geliyor."
                },
                "todo": {
                    "en": "Reach level 20.",
                    "tr": "20. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(20)]
            },
            {
                "label": {
                    "en": "Middling Valiant 🤠",
                    "tr": "Orta Halli Mert 🤠"
                },
                "description": {
                    "en": "Come on! You're making a name for yourself in this Discord world.",
                    "tr": "Hadi be! Şu Discord aleminde artık adın duyulmaya başlandı."
                },
                "todo": {
                    "en": "Reach level 30.",
                    "tr": "30. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(30)]
            },
            {
                "label": {
                    "en": "On the Brink of Fame 💫",
                    "tr": "Şöhretin Eşiğinde 💫"
                },
                "description": {
                    "en": "Reach level 1.",
                    "tr": "Az kaldı, az! Biraz daha kasarsan efsaneler arasında anılacaksın."
                },
                "todo": {
                    "en": "Reach level 40.",
                    "tr": "40. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(40)]
            },
            {
                "label": {
                    "en": "Server Monster 👹",
                    "tr": "Server Canavarı 👹"
                },
                "description": {
                    "en": "This server is your kingdom, now you can run it however you want.",
                    "tr": "Bu server senin krallığın, artık istediğin gibi at koşturabilirsin."
                },
                "todo": {
                    "en": "Reach level 50.",
                    "tr": "50. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(50)]
            },
            {
                "label": {
                    "en": "Epic Hero 🏆",
                    "tr": "Destansı Kahraman 🏆"
                },
                "description": {
                    "en": "The legends are true! A legend has come to Server.",
                    "tr": "Efsaneler doğruymuş! Server'a bir efsane gelmiş."
                },
                "todo": {
                    "en": "Reach level 60.",
                    "tr": "60. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(60)]
            },
            {
                "label": {
                    "en": "Hera 😎",
                    "tr": "Hera 😎"
                },
                "description": {
                    "en": "You have reached a superhuman level, are we supposed to worship you now?",
                    "tr": "İnsanüstü bir seviyeye ulaştın, artık sana tapmamız mı gerekiyor?"
                },
                "todo": {
                    "en": "Reach level 70.",
                    "tr": "70. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(70)]
            },
            {
                "label": {
                    "en": "Discord Conqueror 👑",
                    "tr": "Discord Fatihi 👑"
                },
                "description": {
                    "en": "The whole Discord world is talking about your might, Godspeed conqueror!",
                    "tr": "Bütün Discord alemi senin kudretinden bahsediyor, yolun açık olsun fatih!"
                },
                "todo": {
                    "en": "Reach level 80.",
                    "tr": "80. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(80)]
            },
            {
                "label": {
                    "en": "Silvon Master ✨",
                    "tr": "Silvon Üstadı ✨"
                },
                "description": {
                    "en": "You've unlocked all the secrets of Silvon, now no one can hold you.",
                    "tr": "Silvon'un bütün sırlarını çözdün, artık seni kimse tutamaz."
                },
                "todo": {
                    "en": "Reach level 90.",
                    "tr": "90. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(90)]
            },
            {
                "label": {
                    "en": "Zeus ⚡",
                    "tr": "Zeus ⚡"
                },
                "description": {
                    "en": "Congratulations! You are now the mightiest being on this Discord platform.",
                    "tr": "Tebrikler! Artık bu Discord platformunun en kudretli varlığı sensin."
                },
                "todo": {
                    "en": "Reach level 100.",
                    "tr": "100. seviyeye ulaş."
                },
                "status": (user: PopulatedUser) => [user.xp, LevelToXP(100)]
            }
        ]
    },
    {
        name: "bet",
        label: {
            en: "Win Bet",
            tr: "Bahis Kazan"
        },
        description: {
            en: "Win a bet!",
            tr: "Bahis kazan!"
        },
        children: [
            {
                label: {
                    tr: "Şanslı Çaylak 🍀",
                    en: "Lucky Rookie 🍀"
                },
                description: {
                    tr: "Şans senden yana gibi görünüyor, bakalım bu seri ne kadar devam edecek?",
                    en: "Luck seems to be on your side, let's see how long this streak continues."
                },
                todo: {
                    tr: "50 kere bahis kazan.",
                    en: "Win bet 50 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.bet, 50],
                reward: {
                    seth: 30000,
                }
            },
            {
                label: {
                    tr: " Kumarbaz Kral 👑",
                    en: "The Gambling King 👑"
                },
                description: {
                    tr: "Kumar masasının tozunu attırıyorsun, artık sana rakip yok!",
                    en: "You're a gambling table killer, there's no competition for you now!"
                },
                todo: {
                    tr: "150 kere bahis kazan.",
                    en: "Win bet 150 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.bet, 150],
                reward: {
                    seth: 50000
                }
            },
            {
                label: {
                    tr: "Kumar Canavarı 👾",
                    en: "Gambling Monster 👾"
                },
                description: {
                    tr: "Şans artık senin ortağın! Kumar denilen sistemin takdirini kazandın.",
                    en: "Luck is now your partner! You have earned the appreciation of the system called gambling."
                },
                todo: {
                    tr: "300 kere bahis kazan.",
                    en: "Win bet 300 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.bet, 300],
                reward: {
                    seth: 75000
                }
            }
        ]
    },
    {
        name: "slots",
        label: {
            en: "Win Slot",
            tr: "Slot Kazan"
        },
        description: {
            en: "Win a slot!",
            tr: "Slot kazan!"
        },
        children: [
            {
                label: {
                    tr: " Şanslı Tıklayıcı 🎰",
                    en: "Lucky Clicker 🎰"
                },
                description: {
                    tr: "Slot makinelerinin dilinden anlıyorsun!",
                    en: "You speak the language of slot machines!"
                },
                todo: {
                    tr: "50 kere slot kazan.",
                    en: "Win slot 50 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.slots, 50],
                reward: {
                    seth: 30000
                }
            },
            {
                label: {
                    tr: "Jackpot Avcısı 🤑",
                    en: "Jackpot Hunter 🤑"
                },
                description: {
                    tr: "Jackpotlar seni bekliyor, sen neredesin?",
                    en: "Jackpots are waiting for you, where are you?"
                },
                status: (user: PopulatedUser) => [user.actionCounts.slots, 150],
                reward: {
                    seth: 50000
                }
            },
            {
                label: {
                    tr: "Slotların Efendisi 👑",
                    en: "Master of Slots 👑"
                },
                description: {
                    tr: "Slot makineleri senin emrinde, sen gelince jackpotlar patlıyor!",
                    en: "Slot machines at your disposal, jackpots explode when you come!"
                },
                todo: {
                    tr: "300 kere slot kazan.",
                    en: "Win slot 300 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.slots, 300],
                reward: {
                    seth: 75000
                }
            }
        ]
    },
    {
        name: "daily",
        label: {
            en: "Daily",
            tr: "Günlük"
        },
        description: {
            en: "Complete daily tasks.",
            tr: "Günlük görevleri tamamla."
        },
        children: [
            {
                label: {
                    tr: "Sadık Dost 🐶",
                    en: "Loyal Friend 🐶"
                },
                description: {
                    tr: "Her gün gelip ödülünü alıyorsun, aferin sana!",
                    en: "You come and take your reward every day, good for you!"
                },
                todo: {
                    tr: "15 kere günlük ödül al.",
                    en: "Get daily reward 15 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.daily, 15],
                reward: {
                    seth: 50000
                }
            },
            {
                label: {
                    tr: "Ödül Avcısı 🏆",
                    en: "Reward Hunter 🏆"
                },
                description: {
                    tr: "Günlük ödüllerini aksatmıyorsun, azmin zaferi!",
                    en: "You don't miss your daily rewards, the victory of perseverance!"
                },
                todo: {
                    tr: "30 kere günlük ödül al.",
                    en: "Get daily reward 30 times."
                },
                status: (user: PopulatedUser) => [user.actionCounts.daily, 30],
                reward: {
                    seth: 75000
                }
            }
        ]
    },
    {
        name: "guess",
        label: {
            en: "Guess",
            tr: "Tahmin"
        },
        description: {
            en: "Win a guess!",
            tr: "Tahmin kazan!"
        },
        children: [
            {
                label: {
                    tr: "Şanslı Falcı 🔮",
                    en: "Lucky Fortune Teller 🔮"
                },
                description: {
                    tr: "Geleceği görme yeteneğin mi var yoksa sadece şanslı mısın?",
                    en: "Do you have the ability to see the future or are you just lucky?"
                },
                todo: {
                    en: "Win guess 50 times.",
                    tr: "50 kere tahmin kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.guess, 50],
                reward: {
                    seth: 40000
                }
            },
            {
                label: {
                    tr: "Üçüncü Göz 👁️",
                    en: "Third Eye 👁️"
                },
                description: {
                    tr: "Her şeyi biliyorsun sanki! Bize loto numaralarını söyler misin?",
                    en: "You seem to know everything! Can you tell us the lotto numbers?"
                },
                todo: {
                    en: "Win guess 150 times.",
                    tr: "150 kere tahmin kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.guess, 150],
                reward: {
                    seth: 60000
                }
            },
            {
                label: {
                    tr: "Nostradamus'un Varisi 🧙‍♂️",
                    en: "Heir of Nostradamus 🧙‍♂️"
                },
                description: {
                    tr: "Kehanetlerinde hiç yanılmıyorsun, geleceği görme konusunda ustasın!",
                    en: "You are never wrong in your predictions, you are a master at seeing the future!"
                },
                todo: {
                    en: "Win guess 300 times.",
                    tr: "300 kere tahmin kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.guess, 300],
                reward: {
                    seth: 90000
                }
            }
        ]
    },
    {
        name: "dice",
        label: {
            en: "Dice",
            tr: "Zar"
        },
        description: {
            en: "Win a dice!",
            tr: "Zar kazan!"
        },
        children: [
            {
                label: {
                    tr: "Zar Büyücüsü 🎲",
                    en: "Dice Wizard 🎲"
                },
                description: {
                    tr: "Zarlar seninle dost olmuş gibi, şansın açık olsun!",
                    en: "The dice seem to have made friends with you, good luck!"
                },
                todo: {
                    en: "Win dice 50 times.",
                    tr: "50 kere zar kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.dice, 50],
                reward: {
                    seth: 50000
                }
            },
            {
                label: {
                    tr: "Zarların Efendisi 👑",
                    en: "Master of Dice 👑"
                },
                description: {
                    tr: "Zarlar senin emrinde, istediğin sayıyı getirtiyorsun!",
                    en: "The dice are at your command, you get the number you want!"
                },
                todo: {
                    en: "Win dice 150 times.",
                    tr: "150 kere zar kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.dice, 150],
                reward: {
                    seth: 80000
                }
            },
            {
                label: {
                    tr: "Zar Tanrısı 🌟",
                    en: "Dice God 🌟"
                },
                description: {
                    tr: "Zarlar seninle konuşuyor sanki, bu kadar şans normal değil!",
                    en: "It's like the dice are talking to you, such luck is not normal!"
                },
                todo: {
                    en: "Win dice 300 times.",
                    tr: "300 kere zar kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.dice, 300],
                reward: {
                    seth: 120000
                }
            }
        ]
    },
    {
        name: "luck",
        label: {
            en: "Luck",
            tr: "Şans"
        },
        description: {
            en: "Get lucky!",
            tr: "Şanslı ol!"
        },
        children: [
            {
                label: {
                    tr: "Umut Tacirleri ☁️",
                    en: "Hope Merchants ☁️"
                },
                description: {
                    tr: "Bu kadar şans diledikten sonra artık gerçekleşmesi lazım!",
                    en: "After wishing so much luck, it has to happen!"
                },
                todo: {
                    en: "Win luck 50 times.",
                    tr: "50 kere şans kazan."
                },
                status: (user: PopulatedUser) => [user.luck, 2000],
                reward: {
                    seth: 80000
                }
            },
        ]
    },
    {
        name: "sales",
        label: {
            en: "Sales",
            tr: "Satış"
        },
        description: {
            en: "Sell items.",
            tr: "Eşya sat."
        },
        children: [
            {
                label: {
                    tr: "Pazarlamacı Çırağı 💰",
                    en: "Salesman Apprentice 💰"
                },
                description: {
                    tr: "Pazarcılığa hızlı bir giriş yaptın, bakalım ne kadar kazanacaksın?",
                    en: "You've made a fast start in the market, let's see how much you can earn."
                },
                todo: {
                    en: "Sell 50 items.",
                    tr: "50 eşya sat."
                },
                status: (user: PopulatedUser) => [user.actionCounts.sales, 300],
                reward: {
                    seth: 100000
                }
            },
            {
                label: {
                    tr: "Pazarın Gözdesi 😎",
                    en: "Market Favorite 😎"
                },
                description: {
                    tr: "Artık pazarın aranan simalarındansın, tezgahın hiç boş kalmıyor!",
                    en: "Now you are one of the most popular faces in the market, your stall is never empty!"
                },
                todo: {
                    en: "Sell 150 items.",
                    tr: "150 eşya sat."
                },
                status: (user: PopulatedUser) => [user.actionCounts.sales, 750],
                reward: {
                    seth: 150000
                }
            },
            {
                label: {
                    tr: "Çin Tüccar 🎎",
                    en: "Chinese Merchant 🎎"
                },
                description: {
                    tr: "Pazar senin krallığın, bütün malları sen satıyorsun!",
                    en: "The market is your kingdom, you sell all the goods!"
                },
                todo: {
                    en: "Sell 300 items.",
                    tr: "300 eşya sat."
                },
                status: (user: PopulatedUser) => [user.actionCounts.sales, 1500],
                reward: {
                    seth: 220000
                }
            }
        ]
    },
    {
        name: "blackjack",
        label: {
            en: "BlackJack",
            tr: "BlackJack"
        },
        description: {
            en: "Win a blackjack!",
            tr: "Blackjack kazan!"
        },
        children: [
            {
                label: {
                    tr: "21 Ustası 🃏",
                    en: "Master of 21 🃏"
                },
                description: {
                    tr: "Blackjack masasının tozunu attırmaya başladın, yolun açık olsun!",
                    en: "You've started to dust off the blackjack table, good luck!"
                },
                todo: {
                    en: "Win blackjack 50 times.",
                    tr: "50 kere blackjack kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.blackjack, 50],
                reward: {
                    seth: 75000
                }
            },
            {
                label: {
                    tr: "Şanslı Kartçı 😎",
                    en: "Lucky Card Player 😎"
                },
                description: {
                    tr: "Kartlar hep senden yana, artık kasayı patlatma vakti!",
                    en: "The cards are stacked in your favor, it's time to blow the safe!"
                },
                todo: {
                    en: "Win blackjack 150 times.",
                    tr: "150 kere blackjack kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.blackjack, 150],
                reward: {
                    seth: 125000
                }
            },
            {
                label: {
                    tr: "Blackjack Efsanesi 🏆",
                    en: "Blackjack Legend 🏆"
                },
                description: {
                    tr: "Kasa her zaman kazanır, eğer sen yoksan...",
                    en: "The vault always wins, if you're not there..."
                },
                todo: {
                    en: "Win blackjack 300 times.",
                    tr: "300 kere blackjack kazan."
                },
                status: (user: PopulatedUser) => [user.actionCounts.blackjack, 300],
                reward: {
                    seth: 150000
                }
            }
        ]
    },
    {
        name: "work",
        label: {
            en: "Job",
            tr: "Meslek"
        },
        description: {
            en: "Work at your job.",
            tr: "Mesleğinde çalış."
        },
        children: [
            {
                label: {
                    tr: "500 kere $action",
                    en: "$action 500 times"
                },
                description: {
                    tr: "İşini hakkıyla yapabilecek misin?",
                    en: "Will you be able to do your job properly?"
                },
                todo: {
                    tr: "500 kere $action",
                    en: "$action 500 times"
                },
                status: (user: PopulatedUser) => [user.actionCounts.work, 500],
                reward: {
                    seth: 200000
                }
            }
        ]
    }
] as Achievement[];