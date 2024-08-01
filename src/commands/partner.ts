import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User, { PopulatedUser } from "../models/User";
import Partnership from "../models/Partnership";
import getTranslation from "../helpers/i18n";
import { LevelToRose } from "../helpers/general/partner";
import { seth } from "../constants/emojis";

export const data = new SlashCommandBuilder()
    .setName('partnership')
    .setNameLocalization('tr', 'ortaklık')
    .setDescription('Manage your partnerships')
    .setDescriptionLocalization('tr', 'Ortaklıklarınızı yönetin')
    .addSubcommand(
        subcommand => subcommand
            .setName('status')
            .setNameLocalization('tr', 'durum')
            .setDescription('View your current partnerships')
            .setDescriptionLocalization('tr', 'Mevcut ortaklıklarınızı görüntüleyin')
    )
    .addSubcommand(
        subcommand => subcommand
            .setName('send')
            .setNameLocalization('tr', 'gonder')
            .setDescription('Send a partnership request')
            .setDescriptionLocalization('tr', 'Ortaklık isteği gönder')
            .addUserOption(
                option => option
                    .setName('user')
                    .setNameLocalization('tr', 'kullanici')
                    .setDescription('The user you want to send the request to')
                    .setDescriptionLocalization('tr', 'İsteği göndermek istediğiniz kullanıcı')
                    .setRequired(true)
            )
    )

export const shouldRegister = true;


export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const user = await User.findOne({ id: interaction.user.id })
            .populate('partner.requests.user')
            .populate('partner.partner').exec() as any as PopulatedUser;

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "account.noAccount", interaction.locale)
                    })
                ]
            });
        }

        const subcommand = interaction.options.getSubcommand();

        const subcommands = {
            status: {
                execute: status,
                names: ['status', 'durum']
            },
            send: {
                execute: send,
                names: ['send', 'gonder']
            },
        } as {
            [key: string]: {
                execute: (interaction: ChatInputCommandInteraction, user: PopulatedUser) => Promise<any>;
                names: string[];
            };
        };

        const request = Object.values(subcommands).find(
            request => request.names.includes(subcommand)
        );

        if (!request) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidSubcommand", interaction.locale)
                    })
                ]
            });
        }

        return await request.execute(interaction, user);
    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}

export async function status(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const partnership = await Partnership.findOne({
        $or: [
            { 'from': user._id, active: true },
            { 'to': user._id, active: true }
        ]
    })
        .populate('from')
        .populate('to')
        .exec() as any;

    if (!partnership) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.notPartnered", interaction.locale)
                })
            ]
        });
    }

    const PartnerObjectID = partnership.from.id.toString() === user.id.toString() ? partnership.to : partnership.from;

    const partner = await User.findById(PartnerObjectID);

    if (!partner) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.error", interaction.locale)
                })
            ]
        })
    }

    const partnerUser = await interaction.client.users.fetch(partner.id);

    if (!partnerUser) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.userNoWallet", interaction.locale)
                })
            ]
        });
    }

    const depositButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'deposit', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`partner.deposit.${interaction.user.id}`);

    const withdrawButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'withdraw', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`partner.withdraw.${interaction.user.id}`);

    const transactionHistoryButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'transactionHistory', interaction.locale))
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`partner.history.${interaction.user.id}`);

        const leaveButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'leavePartnership', interaction.locale))
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`partner.leave.${interaction.user.id}`);

    const intlFormat = new Intl.NumberFormat(interaction.locale).format;

    let additionalFeatures = '';

    for (let i = 0; i < partnership.level; i++) {
        additionalFeatures += `🔓 **${getTranslation("commands", `partner.levels.${i + 1}`, interaction.locale)}**\n`;
    }

    for (let i = partnership.level; i < 4; i++) {
        additionalFeatures += `🔒 *${getTranslation("commands", `partner.levels.${i + 1}`, interaction.locale)}*\n`;
    }

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                content: getTranslation("commands", "partner.partneredWith", interaction.locale, {
                    tag: partnerUser.tag,
                    user: partner.id
                })
            }).setFields(
                {
                    name: getTranslation("global", "rose", interaction.locale),
                    value: '🌹 ' + LevelToRose(partnership.level).map(intlFormat).join('/'),
                    inline: true
                },
                {
                    name: getTranslation("global", "level", interaction.locale),
                    value: '❤️ ' + partnership.level.toString(),
                    inline: true
                },
                ...(partnership.level >= 4
                    ? [
                        {
                            name: getTranslation("global", "storage", interaction.locale),
                            value: `${seth} ${intlFormat(partnership.storage)}/${intlFormat(100000)}`,
                            inline: true
                        }
                    ]
                    : []),
                {
                    inline: false,
                    name: getTranslation("commands", "partner.additionalFeatures", interaction.locale),
                    value: additionalFeatures.slice(0, -1)
                }
            )
        ],
        components: [
            ...(partnership.level >= 4 ? [
                new ActionRowBuilder().addComponents([
                    depositButton,
                    withdrawButton,
                    transactionHistoryButton
                ]) as any
            ] : []),
            new ActionRowBuilder().addComponents([
                leaveButton
            ]) as any
        ]
    });
}

export async function send(interaction: ChatInputCommandInteraction, user: PopulatedUser) {
    const userToSend = interaction.options.getUser('user', true);

    if (!userToSend) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.invalidUser", interaction.locale)
                })
            ]
        });
    }

    if (userToSend.id === user.id) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.cannotSendToSelf", interaction.locale)
                })
            ]
        });
    }

    if (user.partner?.partner) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.alreadyPartnered", interaction.locale)
                })
            ]
        });
    }

    const userToSendDoc = await User.findOne({ id: userToSend.id })
        .populate('partner.requests.user')
        .populate('partner.partner').exec() as any as PopulatedUser;

    if (!userToSendDoc) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.userNoWallet", interaction.locale)
                })
            ]
        });
    }

    if (userToSendDoc.partner?.partner) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.userAlreadyPartnered", interaction.locale)
                })
            ]
        });
    }

    if (userToSendDoc.partner?.requests.some(request => request.user.id === userToSend.id)) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.alreadySentRequest", interaction.locale)
                })
            ]
        });
    }

    userToSendDoc.partner.requests.push({ user: user, date: new Date() });

    userToSendDoc.markModified('partner.requests');
    await userToSendDoc.save();

    try {
        const accept = new ButtonBuilder()
            .setCustomId(`partnership.accept.${userToSend.id}.${user.id}`)
            .setLabel(getTranslation("commands", "partner.accept", userToSendDoc.language))
            .setStyle(ButtonStyle.Success);

        const decline = new ButtonBuilder()
            .setCustomId(`partnership.decline.${userToSend.id}.${user.id}`)
            .setLabel(getTranslation("commands", "partner.decline", userToSendDoc.language))
            .setStyle(ButtonStyle.Danger);

        await interaction.channel?.send({
            embeds: [
                interaction.client.embedManager.Info({
                    content: getTranslation("commands", "partner.recievedRequest", userToSendDoc.language, {
                        user: interaction.user.id,
                        tag: interaction.user.tag
                    })
                })
            ],
            components: [
                new ActionRowBuilder().addComponents([accept, decline]) as any
            ]
        });

        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Success({
                    content: getTranslation("commands", "partner.requestSent", interaction.locale)
                })
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error while sending partnership request:', error);
        await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "partner.errorWhileSending", interaction.locale)
                })
            ]
        });
    }
}