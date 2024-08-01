import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../../models/User";
import { seth } from "../../constants/emojis";
import getTranslation from "../../helpers/i18n";
import { XPToLevel } from "../../helpers/level";

export const data = new SlashCommandBuilder()
    .setName('wallet')
    .setNameLocalization('tr', 'cüzdan')
    .setDescriptionLocalization('tr', 'Cüzdanınızı gösterir')
    .setDescription('Shows your wallet');

export const timeout = 1000 * 30;

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ id: interaction.user.id });

    if (!user) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation('errors', 'account.noAccount', interaction.locale)
                })
            ]
        });
    }

    if (user.tutorial === 6) {
        user.tutorial = 7;
        await user.save();
    }

    const intl =  new Intl.NumberFormat(interaction.locale).format;
    const intlFormat = (value: number) => intl(Math.floor(value));

    const depositButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'deposit', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`wallet.deposit.${interaction.user.id}`);

    const withdrawButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'withdraw', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`wallet.withdraw.${interaction.user.id}`);

    const transferButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'transfer', interaction.locale))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`wallet.transfer.${interaction.user.id}`);

    const transactionHistoryButton = new ButtonBuilder()
        .setLabel(getTranslation('global', 'transactionHistory', interaction.locale))
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`wallet.history.${interaction.user.id}`);

    const limit = (user.premium.status ? 2 : 1) * 50000 * Math.floor(XPToLevel(user.xp)) + 100000

    const res = await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: getTranslation('commands', 'wallet.title', interaction.locale),
                fields: [
                    {
                        name: getTranslation('global', 'wallet', interaction.locale),
                        value: `**${seth} ${intlFormat(user.wallet.seth)}${"" /* \n<:yethium:1084074771366543381> ${intlFormat(user.wallet.yeth)} */}**`,
                        inline: true
                    },
                    {
                        name: getTranslation('global', 'bank', interaction.locale),
                        value: `**${seth} ${intlFormat(user.bank.seth)}/${intlFormat(limit)}**`,
                        inline: true
                    },
                    {
                        name: getTranslation('global', 'account', interaction.locale),
                        value: `**ID${interaction.user.id}**`,
                        inline: true
                    }
                ]
            })
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({
                    text: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL()
                })
        ],
        components: [
            new ActionRowBuilder().addComponents(depositButton, withdrawButton, transferButton, transactionHistoryButton) as any
        ]
    });

    // Disable buttons after 30 second idle
    const collector = res.createMessageComponentCollector({ idle: 30000, dispose: true, filter: i => i.user.id === interaction.user.id });

    collector.on('end', async () => {
        depositButton.setDisabled(true);
        withdrawButton.setDisabled(true);
        transferButton.setDisabled(true);
        transactionHistoryButton.setDisabled(true);

        try {
            const msg = await interaction.fetchReply();

            if (msg && msg.editable)
                await msg.edit({
                    components: [
                        new ActionRowBuilder().addComponents(depositButton, withdrawButton, transferButton, transactionHistoryButton) as any
                    ]
                });
        } catch (error) {
            console.error(error);
        }

        collector.stop();
    });
}