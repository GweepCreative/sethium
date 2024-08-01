import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import isAdmin from "../../helpers/isAdmin";
import Job from "../../models/Job";
import { JobNameRegex } from "../../helpers/regexes";
import Loot from "../../models/Loot";
import { InferSchemaType } from "mongoose";
import Item from "../../models/Item";
import Tool from "../../models/Tool";

export const admin = true;

export const data = new SlashCommandBuilder()
    .setName('tool')
    .setDescription('Manage tools')
    .setDescriptionLocalization('tr', 'Araçları yönetir')
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List the tools in the database')
            .setDescriptionLocalization('tr', 'Veritabanındaki araçları listeler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('List the tools of the job')
                    .setDescriptionLocalization('tr', 'Mesleğe ait araçları listeler')
                    .setAutocomplete(true)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add a new tool')
            .setDescriptionLocalization('tr', 'Yeni bir araç ekler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('The job that the tool belongs to')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Edit a tool')
            .setDescriptionLocalization('tr', 'Bir aracı düzenler')
            .addStringOption(option =>
                option
                    .setName('tool')
                    .setDescription('The tool to be edited')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    );

async function list(interaction: ChatInputCommandInteraction) {
    const job = interaction.options.getString('job', false);

    let tools: InferSchemaType<typeof Tool.schema>[] = [];

    if (job) {
        const isExist = await Job.findOne({ name: job });

        if (!isExist) {
            return await interaction.reply({ content: 'Böyle bir meslek yok.', ephemeral: true });
        }

        tools = await Tool.find({ job });
    } else {
        tools = await Tool.find();
    }

    if (!tools.length) {
        return await interaction.reply({ content: 'Veritabanında hiç tool yok.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`Toollar${job ? ` (${job})` : ''
            }`)
        .setDescription(tools.map(tool => [
            `• ${tool.emoji} ${tool.title}`,
            (tool.minimumPrice || tool.maximumPrice) ? `\`(Fiyat: ${tool.minimumPrice ?? '?'}-${tool.maximumPrice ?? '?'})\`` : ''
        ].filter(String).join(' ')).join('\n'))
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
    modal.setTitle('Yeni Araç Ekle');
    modal.setCustomId(`tool.create.${job}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Araç Adı')
        .setRequired(true)
        .setPlaceholder('Araç adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    const emojiInput = new TextInputBuilder()
        .setLabel('Araç Emoji')
        .setRequired(true)
        .setPlaceholder('Araç için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    const recipeInput = new TextInputBuilder()
        .setLabel('Araç Tarifi')
        .setRequired(true)
        .setPlaceholder('ID1*adet+ID2*adet+variant1*adet ...')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('recipe');

    const price = new TextInputBuilder()
        .setLabel('Minimum ve Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Araçnın minimum ve maximum fiyatını girin ve - ile ayırın.')
        .setStyle(TextInputStyle.Short)
        .setCustomId('price');

    const durability = new TextInputBuilder()
        .setLabel('Dayanıklılık')
        .setRequired(true)
        .setPlaceholder('Araçnın dayanıklılığını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('durability');

    modal.addComponents(
        ...[nameInput, emojiInput, recipeInput, price, durability].map(input => new ActionRowBuilder().addComponents(input)) as any
    );

    return await interaction.showModal(modal);
}

async function edit(interaction: ChatInputCommandInteraction) {
    const toolID = interaction.options.getString('tool', true);

    const tool = await Tool.findOne({ id: toolID }).populate('recipe.loots.loot').populate('recipe.items.item').exec() as any;

    if (!tool) {
        return await interaction.reply({ content: 'Böyle bir araç yok.', ephemeral: true });
    }

    const modal = new ModalBuilder();

    modal.setTitle('Araç Düzenle');
    modal.setCustomId(`tool.edit.${tool.title}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Araç Adı')
        .setRequired(true)
        .setPlaceholder('Araç adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    if (tool?.title) {
        nameInput.setValue(tool.title);
    }

    const emojiInput = new TextInputBuilder()
        .setLabel('Araç Emoji')
        .setRequired(true)
        .setPlaceholder('Araç için bir emoji seçin')
        .setMinLength(1)
        .setStyle(TextInputStyle.Short)
        .setCustomId('emoji');

    if (tool?.emoji) {
        emojiInput.setValue(tool.emoji);
    }

    const recipeInput = new TextInputBuilder()
        .setLabel('Araç Tarifi')
        .setRequired(true)
        .setPlaceholder('ID1*adet+ID2*adet+variant1*adet ...')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('recipe');

    if (tool?.recipe) {
        const loots = await Loot.find({
            _id: {
                $in: tool.recipe.loots.map((loot: any) => loot.loot?._id.toString())
            }
        });

        const items = await Item.find({
            _id: {
                $in: tool.recipe.items.map((item: any) => item.item?._id.toString())
            }
        });

        const variants = tool.recipe.variants.map((item: any) => [item.variant, item.quantity]);

        const recipeItems = tool.recipe.items.map((item: any) => [item.item?._id.toString(), item.quantity]);
        const recipeLoots = tool.recipe.loots.map((loot: any) => [loot.loot?._id.toString(), loot.quantity]);

        for (const loot of recipeLoots) {
            loot[0] = loots.find((x: any) => x._id.toString() === loot[0])?.id;
        }

        for (const item of recipeItems) {
            item[0] = items.find((x: any) => x._id.toString() === item[0])?.id;
        }

        const recipe = [...recipeLoots, ...recipeItems, ...variants].map(x => x.join('*')).join('+');

        recipeInput.setValue(recipe);
    }

    const price = new TextInputBuilder()
        .setLabel('Minimum ve Maximum Fiyat')
        .setRequired(true)
        .setPlaceholder('Araçnın minimum ve maximum fiyatını girin ve - ile ayırın.')
        .setStyle(TextInputStyle.Short)
        .setCustomId('price');

    let priceValue = '';

    priceValue += tool.minimumPrice ?? '0';
    priceValue += '-';
    priceValue += tool.maximumPrice ?? (tool.minimumPrice ? (tool.minimumPrice + 1) : '0');

    const durability = new TextInputBuilder()
        .setLabel('Dayanıklılık')
        .setRequired(true)
        .setPlaceholder('Araçnın dayanıklılığını girin')
        .setStyle(TextInputStyle.Short)
        .setCustomId('durability');

    if (tool?.durability) {
        durability.setValue(String(tool.durability));
    }

    modal.addComponents(
        ...[nameInput, emojiInput, recipeInput, price, durability].map(input => new ActionRowBuilder().addComponents(input)) as any
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
                name: { $regex: new RegExp(value, 'i') }
            }).limit(25);

            return await interaction.respond(
                jobs.map(job => ({
                    name: String(job.name),
                    value: String(job.name)
                })) || []
            );
        }

        if (subcommand === 'edit') {
            const value = interaction.options.getString('tool', true) || '';

            const tools = await Tool.find({ title: { $regex: new RegExp(value, 'i') } }).limit(25);

            return await interaction.respond(
                tools.map(tool => ({
                    name: String(tool.title),
                    value: String(tool.id)
                })) || []
            );
        }
    } catch (error) {
        console.error(error);
    }
}