import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import isAdmin from "../../helpers/isAdmin";
import Job from "../../models/Job";
import { JobNameRegex } from "../../helpers/regexes";

export const admin = true;

export const data = new SlashCommandBuilder()
    .setName('job')
    .setNameLocalization('tr', 'meslek')
    .setDescription('Meslekleri yönetir')
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Veritabanındaki meslekleri listeler')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Yeni bir meslek ekler')
            .addStringOption(option =>
                option
                    .setName('parent')
                    .setDescription('Meslek serisinin devamı mesleği')
                    .setAutocomplete(true)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Bir mesleği düzenler')
            .addStringOption(option =>
                option
                    .setName('job')
                    .setDescription('Düzenlenecek meslek')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    );

async function list(interaction: ChatInputCommandInteraction) {
    const jobs = await Job.find();

    if (!jobs.length) {
        return await interaction.reply({ content: 'Veritabanında hiç meslek yok.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('Meslekler')
        .setDescription(jobs.map(job => [
            `• ${job.name}`,
            job.parent ? `\`(Üst Meslek: ${job.parent})\`` : '',
            job.experience ? `\`(Deneyim: ${job.experience})\`` : ''
        ].filter(String).join(' ')).join('\n'))
        .setTimestamp();

    return await interaction.reply({ embeds: [embed] });
}

async function add(interaction: ChatInputCommandInteraction) {
    const parent = interaction.options.getString('parent', false);

    if (parent) {
        if (!JobNameRegex.test(parent)) {
            return await interaction.reply({ content: 'Geçersiz bir meslek adı girdiniz.', ephemeral: true });
        }

        const isExist = await Job.findOne({ name: parent });

        if (!isExist) {
            return await interaction.reply({ content: 'Böyle bir meslek yok.', ephemeral: true });
        }
    }


    const modal = new ModalBuilder();
    modal.setTitle('Yeni Meslek Ekle');
    modal.setCustomId(`job.create${parent ? `.${parent}` : ''
        }`);

    const nameInput = new TextInputBuilder()
        .setLabel('Meslek Adı')
        .setRequired(true)
        .setPlaceholder('Meslek adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    const experienceInput = new TextInputBuilder()
        .setLabel('Deneyim')
        .setRequired(false)
        .setPlaceholder('Seviye atlamak için gereken Deneyim puanı')
        .setStyle(TextInputStyle.Short)
        .setCustomId('experience');

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput) as any,
        new ActionRowBuilder().addComponents(experienceInput) as any
    );

    return await interaction.showModal(modal);
}

async function edit(interaction: ChatInputCommandInteraction) {
    const jobName = interaction.options.getString('job', true);

    const job = await Job.findOne({ name: jobName }) as any;

    if (!job) {
        return await interaction.reply({ content: 'Böyle bir meslek yok.', ephemeral: true });
    }

    const modal = new ModalBuilder();

    modal.setTitle('Meslek Düzenle');
    modal.setCustomId(`job.edit.${job.name}`);

    const nameInput = new TextInputBuilder()
        .setLabel('Meslek Adı')
        .setRequired(false)
        .setPlaceholder('Meslek adını girin')
        .setMinLength(3)
        .setStyle(TextInputStyle.Short)
        .setCustomId('name');

    if (job?.name) {
        nameInput.setValue(job.name);
    }

    const experienceInput = new TextInputBuilder()
        .setLabel('Deneyim')
        .setRequired(false)
        .setPlaceholder('Seviye atlamak için gereken Deneyim puanı')
        .setStyle(TextInputStyle.Short)
        .setCustomId('experience');
    
    if (job?.experience) {
        experienceInput.setValue(String(job.experience));
    }

    const parentInput = new TextInputBuilder()
        .setLabel('Üst Meslek')
        .setRequired(false)
        .setPlaceholder('Bu meslek hangi meslek serisinin devamı?')
        .setStyle(TextInputStyle.Short)
        .setCustomId('parent');

    if (job?.parent) {
        parentInput.setValue(job.parent);
    }

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput) as any,
        new ActionRowBuilder().addComponents(experienceInput) as any,
        new ActionRowBuilder().addComponents(parentInput) as any
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

    if (subcommand === 'add' || subcommand === 'edit') {
        const value = interaction.options.getString((
            subcommand === 'add' ? 'parent' : 'job'
        ), true) || '';

        const jobs = await Job.find({ name: { $regex: new RegExp(value, 'i') } }).limit(25);

        return await interaction.respond(
            jobs.map(job => ({
                name: String(job.name),
                value: String(job.name)
            })) || []
        );
    }
}