import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import User from "../models/User";
import { createCanvas, loadImage } from "canvas";
import { join } from "path";
import { XPToLevel } from "../helpers/level";
import Listing from "../models/Listing";
import { countOfCompletedAchievements } from "../helpers/user/achievements";
import getTranslation from "../helpers/i18n";

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setNameLocalization('tr', 'profil')
    .setDescription('Görsel profilinizi görüntüler.')
    .setDescriptionLocalization('tr', 'Görsel profilinizi görüntüler.')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user whose profile you want to view.')
            .setDescriptionLocalization('tr', 'Profilini görüntülemek istediğiniz kullanıcı.')
            .setRequired(false)
    );

export const shouldRegister = true;

export async function execute(interaction: ChatInputCommandInteraction) {
    try {

        const specifiedUser = interaction.options.getUser('user');

        const user = await User.findOne({
            id: specifiedUser?.id || interaction.user.id
        });

        if (!user) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "profile.noAccount", interaction.locale)
                    })
                ]
            });
        }

        const userDetails = await interaction.client.users.fetch(user.id);

        const canvas = createCanvas(2048, 512);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load the background image and draw it to the canvas
        const background = await loadImage(join(__dirname, '../images/rank-card.png'));
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Draw the user's avatar to the canvas as a circle (416x416px)
        const avatar = await loadImage(userDetails.displayAvatarURL({ extension: 'png', size: 512 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(416 / 2 + 48, 416 / 2 + 48, 416 / 2, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 48, 48, 416, 416);
        ctx.restore();

        // Draw the user's username to the canvas with specified font from file
        ctx.font = 'bold 80px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(userDetails.username, 512 + 16, 112);

        const usernameWidth = ctx.measureText(userDetails.username).width;

        const badges = [
            {
                path: 'crown.png',
                value: 1 << 2
            },
            {
                path: 'gear.png',
                value: 1 << 1
            },
            {
                path: 'star.png',
                value: 1
            }
        ]

        let drawedBadges = 0;

        for (const badge of badges) {
            if (user.badges & badge.value) {
                const badgeImage = await loadImage(join(__dirname, '../images/badges', badge.path));
                ctx.drawImage(badgeImage, 512 + usernameWidth + 16 + 18 + 110 * drawedBadges, 32, 92, 92);
                drawedBadges++;
            }
        }

        const sales = await Listing.find({ user: user._id, sold: true }).countDocuments();

        const titles = [
            [
                {
                    name: getTranslation("global", "level", interaction.locale),
                    value: Math.floor(XPToLevel(user.xp)).toString(),
                    inline: true
                },
                {
                   name: getTranslation("global", "luck", interaction.locale),
                    value: Math.floor(user.luck).toString(),
                    inline: true
                },
                {
                    name: getTranslation("global", "sales", interaction.locale),
                    value: sales.toString(),
                    inline: true
                },
            ],
            [
                {
                    name: getTranslation("global", "job", interaction.locale),
                    value: user.job?.name as string || 'N/A',
                    inline: true
                },
                {
                    name: getTranslation("global", "achievement", interaction.locale),
                    value: (await countOfCompletedAchievements(user as any)).join('/'),
                    inline: true
                },
            ]
        ] as { name: string, value: string, inline?: boolean }[][];

        const titleLocations: { x: number, y: number, value: string }[] = [];

        ctx.font = 'medium 60px sans-serif';
        ctx.fillStyle = '#ffffff';

        for (let row = 0; row < titles.length; row++) {
            const titleRow = titles[row];

            for (let col = 0; col < titleRow.length; col++) {
                const title = titleRow[col];

                let location = {
                    x: 512 + 16 + 1504 / 3 * col,
                    y: 512 - 48 - 32 - 90 * (1 - row),
                    value: title.value
                };
                ctx.fillText(title.name, location.x, location.y);

                if (title.inline) {
                    const width = ctx.measureText(title.name).width;
                    location.x += width + 32;
                } else {
                    location.y += 60;
                }

                titleLocations.push(location);

            }
        }
        ctx.fillStyle = '#fec396';

        for (const location of titleLocations) {
            ctx.fillText(
                location.value,
                location.x, location.y
            );
        }

        ctx.font = 'bold 60px sans-serif';
        ctx.fillText((user.description ?? getTranslation("global", "na", interaction.locale)).slice(0, 32), 512 + 16, 192);

        const updateDescription = new ButtonBuilder()
            .setCustomId(`profile.updateDescription.${user.id}`)
            .setLabel(getTranslation("commands", "profile.updateDescription", interaction.locale))
            .setStyle(ButtonStyle.Primary)

        return await interaction.reply({
            files: [canvas.toBuffer()],
            components: [
                new ActionRowBuilder().addComponents(updateDescription) as any
            ]
        });

    } catch (error) {
        console.error('Error while executing work command:', error);
    }
}