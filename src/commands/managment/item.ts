import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import isAdmin from "../../helpers/isAdmin";
import Job from "../../models/Job";
import { JobNameRegex } from "../../helpers/regexes";
import Loot from "../../models/Loot";
import { InferSchemaType } from "mongoose";
import Item from "../../models/Item";
import getTranslation from "../../helpers/i18n";

export const admin = true;

export const data = new SlashCommandBuilder()
    .setName('item')
    .setDescription('Manage items')
    .setDescriptionLocalization('tr', 'Eşyaları yönetir')
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List items in the database')
            .setDescriptionLocalization('tr', 'Veritabanındaki eşyaları listeler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('List items for a job')
                    .setDescriptionLocalization('tr', 'Mesleğe ait eşyaları listeler')
                    .setAutocomplete(true)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add a new item')
            .setDescriptionLocalization('tr', 'Yeni bir eşya ekler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('The job that the item belongs to')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Edit an item')
            .setDescriptionLocalization('tr', 'Bir eşyayı düzenler')
            .addStringOption(option =>
                option
                    .setName('item')
                    .setDescription('The item to be edited')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    );

async function list(interaction: ChatInputCommandInteraction) {
    const job = interaction.options.getString('job', false);

    let items: InferSchemaType<typeof Item.schema>[] = [];

    if (job) {
        const isExist = await Job.findOne({ name: job });

        if (!isExist) {
            return await interaction.reply({
                embeds: [
                    interaction.client.embedManager.Error({
                        content: getTranslation("errors", "general.invalidJob", interaction.locale, { job })
                    })
                ]
                , ephemeral: true
            });
        }

        items = await Item.find({ job });
    } else {
        items = await Item.find();
    }

    if (!items.length) {
        return await interaction.reply({
            embeds: [
                interaction.client.embedManager.Error({
                    content: getTranslation("errors", "general.noItem", interaction.locale)
                })
            ], ephemeral: true
        });
    }

    let description = '';

    for (const item of items) {
        description += `• \`${item.id}\` ${item.emoji} ${item.title}`;

        if (item.minimumPrice || item.maximumPrice) {
            description += ` \`(${item.minimumPrice ?? '?'}-${item.maximumPrice ?? '?'})\``;
        }

        description += '\n';
    }

    return await interaction.reply({
        embeds: [
            interaction.client.embedManager.Info({
                title: `Lootlar${job ? ` (${job})` : ''}`,
                content: description
            })
        ]
    });
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
    modal.setTitle('Yeni Eşya Ekle');
    modal.setCustomId(`item.create.${job}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Eşya Adı')
        .setRequired(true)
        .setPlaceholder('Eşya adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    const emojiInput = new TextInputBuilder()
        .setLabel('Eşya Emoji')
        .setRequired(true)
        .setPlaceholder('Eşya için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    const recipeInput = new TextInputBuilder()
        .setLabel('Eşya Tarifi')
        .setRequired(true)
        .setPlaceholder('ID1*adet+ID2*adet+variant1*adet ...')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('recipe');

    const minimumPrice = new TextInputBuilder()
        .setLabel('Minimum Fiyat')
        .setRequired(true)
        .setPlaceholder('Eşyanın minimum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('minimumPrice');
    const maximumPrice = new TextInputBuilder()
        .setLabel('Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Eşyanın maximum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('maximumPrice');

    /* const durability = new TextInputBuilder()
        .setLabel('Dayanıklılık')
        .setRequired(true)
        .setPlaceholder('Eşyanın dayanıklılığını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('durability'); */

    modal.addComponents(
        ...[nameInput, emojiInput, recipeInput, minimumPrice, maximumPrice, /* durability */].map(input => new ActionRowBuilder().addComponents(input)) as any
    );

    return await interaction.showModal(modal);
}

async function edit(interaction: ChatInputCommandInteraction) {
    const itemID = interaction.options.getString('item', true);

    const item = await Item.findOne({ id: itemID }).populate('recipe.loots.loot').populate('recipe.items.item').exec() as any;

    if (!item) {
        return await interaction.reply({ content: 'Böyle bir eşya yok.', ephemeral: true });
    }

    const modal = new ModalBuilder();

    modal.setTitle('Eşya Düzenle');
    modal.setCustomId(`item.edit.${item.title}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Eşya Adı')
        .setRequired(true)
        .setPlaceholder('Eşya adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    if (item?.title) {
        nameInput.setValue(item.title);
    }

    const emojiInput = new TextInputBuilder()
        .setLabel('Eşya Emoji')
        .setRequired(true)
        .setPlaceholder('Eşya için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    if (item?.emoji) {
        emojiInput.setValue(item.emoji);
    }

    const recipeInput = new TextInputBuilder()
        .setLabel('Eşya Tarifi')
        .setRequired(true)
        .setPlaceholder('ID1*adet+ID2*adet+variant1*adet ...')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('recipe');

    if (item?.recipe) {
        const loots = await Loot.find({
            _id: {
                $in: item.recipe.loots.map((loot: any) => loot.loot?._id.toString())
            }
        });

        const items = await Item.find({
            _id: {
                $in: item.recipe.items.map((item: any) => item.item?._id.toString())
            }
        });

        const variants = item.recipe.variants.map((item: any) => [item.variant, item.quantity]);

        const recipeItems = item.recipe.items.map((item: any) => [item.item?._id.toString(), item.quantity]);
        const recipeLoots = item.recipe.loots.map((loot: any) => [loot.loot?._id.toString(), loot.quantity]);

        for (const loot of recipeLoots) {
            loot[0] = loots.find((x: any) => x._id.toString() === loot[0])?.id;
        }

        for (const item of recipeItems) {
            item[0] = items.find((x: any) => x._id.toString() === item[0])?.id;
        }

        const recipe = [...recipeLoots, ...recipeItems, ...variants].map(x => x.join('*')).join('+');

        recipeInput.setValue(recipe);
    }

    const minimumPrice = new TextInputBuilder()
        .setLabel('Minimum Fiyat')
        .setRequired(true)
        .setPlaceholder('Eşyanın minimum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('minimumPrice');
    const maximumPrice = new TextInputBuilder()
        .setLabel('Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Eşyanın maximum fiyatını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('maximumPrice');

    if (item?.minimumPrice) {
        minimumPrice.setValue(String(item.minimumPrice));
    }

    if (item?.maximumPrice) {
        maximumPrice.setValue(String(item.maximumPrice));
    }

    const durability = new TextInputBuilder()
        .setLabel('Dayanıklılık')
        .setRequired(true)
        .setPlaceholder('Eşyanın dayanıklılığını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('durability');

    if (item?.durability) {
        durability.setValue(String(item.durability));
    }

    modal.addComponents(
        ...[nameInput, emojiInput, recipeInput, minimumPrice, maximumPrice, /* durability */].map(input => new ActionRowBuilder().addComponents(input)) as any
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
    try {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add' || subcommand === 'list') {
            const value = interaction.options.getString('job', true) || '';

            const jobs = await Job.find({
                name: { $regex: new RegExp(value, 'i') }, parent: {
                    $ne: ""
                }
            }).limit(25);

            return await interaction.respond(
                jobs.map(job => ({
                    name: String(job.name),
                    value: String(job.name)
                })) || []
            );
        }

        if (subcommand === 'edit') {
            const value = interaction.options.getString('item', true) || '';

            const items = await Item.find({ title: { $regex: new RegExp(value, 'i') } }).limit(25);

            return await interaction.respond(
                items.map(item => ({
                    name: String(item.title),
                    value: String(item.id)
                })) || []
            );
        }
    } catch (error) {
        console.error(error);
    }
}