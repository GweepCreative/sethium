import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import isAdmin from "../../helpers/isAdmin";
import Job from "../../models/Job";
import { JobNameRegex } from "../../helpers/regexes";
import Loot from "../../models/Loot";
import { InferSchemaType } from "mongoose";

export const admin = true;

export const data = new SlashCommandBuilder()
    .setName('loot')
    .setNameLocalization('tr', 'loot')
    .setDescription('Lootları yönetir')
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Veritabanındaki lootları listeler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('Mesleğe ait lootları listeler')
                    .setAutocomplete(true)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Yeni bir loot ekler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('Lootun ait olduğu meslek')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Bir lootu düzenler')
            .addStringOption(option =>
                option
                    .setName('loot')
                    .setDescription('Düzenlenecek loot')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    );

async function list(interaction: ChatInputCommandInteraction) {
    const job = interaction.options.getString('job', false);

    let loots: InferSchemaType<typeof Loot.schema>[] = [];

    if (job) {
        const isExist = await Job.findOne({ name: job });

        if (!isExist) {
            return await interaction.reply({ content: 'Böyle bir meslek yok.', ephemeral: true });
        }

        loots = await Loot.find({ job });
    } else {
        loots = await Loot.find();
    }

    if (!loots.length) {
        return await interaction.reply({ content: 'Veritabanında hiç loot yok.', ephemeral: true });
    }

    const grouper = (variant: string | null | undefined) => variant || 'Ana';

    const groupedLoots = loots.reduce((acc, loot) => {
        const key = grouper(loot?.variant);

        if (!acc[key]) {
            acc[key] = [];
        }

        acc[key].push(loot);

        return acc;
    }, {} as Record<string, InferSchemaType<typeof Loot.schema>[]>);

    const embed = new EmbedBuilder()
        .setTitle(`Lootlar${job ? ` (${job})` : ''
            }`)
        .setDescription(
            Object.entries(groupedLoots).map(([key, value]) => {
                return `**${key}**\n${value.map(loot => [
                    `•\`${loot.id}\` ${loot.emoji} ${loot.title}`,
                    (loot.minimumPrice || loot.maximumPrice) ? `\`(Fiyat: ${loot.minimumPrice ?? '?'}-${loot.maximumPrice ?? '?'})\`` : '',
                ].filter(String).join(' ')).join('\n')
                    }`;
            }).join('\n\n')
        )
        .setTimestamp();

    return await interaction.reply({ embeds: [embed] });
}

async function add(interaction: ChatInputCommandInteraction) {
    const job = interaction.options.getString('job', true);

    if (job) {
        if (!JobNameRegex.test(job)) {
            return await interaction.reply({ content: 'Geçersiz bir meslek adı girdiniz.', ephemeral: true });
        }

        const isExist = await Job.findOne({ name: job });

        if (!isExist) {
            return await interaction.reply({ content: 'Böyle bir meslek yok.', ephemeral: true });
        }
    }


    const modal = new ModalBuilder();
    modal.setTitle('Yeni Loot Ekle');
    modal.setCustomId(`loot.create.${job}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Loot Adı')
        .setRequired(true)
        .setPlaceholder('Loot adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    const emojiInput = new TextInputBuilder()
        .setLabel('Loot Emoji')
        .setRequired(true)
        .setPlaceholder('Loot için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    const minimumPrice = new TextInputBuilder()
        .setLabel('Minimum Fiyat')
        .setRequired(true)
        .setPlaceholder('Lootun minimum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('minimumPrice');
    const maximumPrice = new TextInputBuilder()
        .setLabel('Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Lootun maximum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('maximumPrice');

    const variantInput = new TextInputBuilder()
        .setLabel('Loot Varyantı')
        .setRequired(false)
        .setPlaceholder('Lootun varyantını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('variant');


    modal.addComponents(
        ...[nameInput, emojiInput, minimumPrice, maximumPrice, variantInput].map(input => new ActionRowBuilder().addComponents(input)) as any
    );

    return await interaction.showModal(modal);
}

async function edit(interaction: ChatInputCommandInteraction) {
    const lootName = interaction.options.getString('loot', true);

    const loot = await Loot.findOne({ title: lootName }) as any;

    if (!loot) {
        return await interaction.reply({ content: 'Böyle bir loot yok.', ephemeral: true });
    }

    const modal = new ModalBuilder();

    modal.setTitle('Loot Düzenle');
    modal.setCustomId(`loot.edit.${loot.title}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Loot Adı')
        .setRequired(true)
        .setPlaceholder('Loot adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    if (loot?.title) {
        nameInput.setValue(loot.title);
    }

    const emojiInput = new TextInputBuilder()
        .setLabel('Loot Emoji')
        .setRequired(true)
        .setPlaceholder('Loot için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    if (loot?.emoji) {
        emojiInput.setValue(loot.emoji);
    }

    const minimumPrice = new TextInputBuilder()
        .setLabel('Minimum Fiyat')
        .setRequired(true)
        .setPlaceholder('Lootun minimum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('minimumPrice');
    const maximumPrice = new TextInputBuilder()
        .setLabel('Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Lootun maximum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('maximumPrice');

    if (loot?.minimumPrice) {
        minimumPrice.setValue(String(loot.minimumPrice));
    }

    if (loot?.maximumPrice) {
        maximumPrice.setValue(String(loot.maximumPrice));
    }


    const variantInput = new TextInputBuilder()
        .setLabel('Loot Varyantı')
        .setRequired(false)
        .setPlaceholder('Lootun varyantını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('variant');

    if (loot?.variant) {
        variantInput.setValue(loot.variant);
    }

    modal.addComponents(
        ...[nameInput, emojiInput, minimumPrice, maximumPrice, variantInput].map(input => new ActionRowBuilder().addComponents(input)) as any
    );

    return await interaction.showModal(modal);
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const isUserAdmin = await isAdmin(interaction);

    if (!isUserAdmin) {
        return await interaction.reply({ content: 'Bu komutu kullanmaya yetkiniz yok.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    const handler = ({
        list,
        add,
        edit
    })?.[subcommand];

    if (!handler) {
        return await interaction.reply({ content: 'Bu komutun bir işlevi yok.', ephemeral: true });
    }

    await handler(interaction);
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add' || subcommand === 'list') {
        const value = interaction.options.getString('job', true) || '';

        const jobs = await Job.find({
            name: { $regex: new RegExp(value, 'i') }//, parent: ""
        }).limit(25);

        return await interaction.respond(
            jobs.map(job => ({
                name: String(job.name),
                value: String(job.name)
            })) || []
        );
    }

    if (subcommand === 'edit') {
        const value = interaction.options.getString('loot', true) || '';

        const jobs = await Loot.find({ title: { $regex: new RegExp(value, 'i') } }).limit(25);

        return await interaction.respond(
            jobs.map(job => ({
                name: String(job.title),
                value: String(job.title)
            })) || []
        );
    }
}