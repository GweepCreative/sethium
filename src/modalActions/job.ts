import { ModalSubmitInteraction } from "discord.js";
import isAdmin from "../helpers/isAdmin";
import Job from "../models/Job";
import User from "../models/User";

export const name = 'job';

// Define an async function to execute upon interaction with a modal submit.
export async function execute(interaction: ModalSubmitInteraction) {
    try {
        // Check if the user is an administrator by comparing their ID to a list of administrator IDs stored in environment variables.
        const is_admin = await isAdmin(interaction);

        // If the user is not an administrator, reply with a permission error message and stop further execution.
        if (!is_admin) {
            return await interaction.reply({ content: 'Bu komutu kullanma izniniz yok.', ephemeral: true });
        }

        const [_,subaction, ...data] = interaction.customId.split('.');

        if (subaction === 'create') {
            const name = interaction.fields.getTextInputValue('name');
            const experience = interaction.fields.getTextInputValue('experience');

            if (!name) {
                return await interaction.reply({ content: 'Bir meslek adı girmelisiniz.', ephemeral: true });
            }

            if (!experience) {
                return await interaction.reply({ content: 'Bir deneyim puanı girmelisiniz.', ephemeral: true });
            }
            
            const experiencePoints = parseInt(experience);

            if (isNaN(experiencePoints)) {
                return await interaction.reply({ content: 'Deneyim puanı sayı olmalıdır.', ephemeral: true });
            }

            if (experiencePoints < 0) {
                return await interaction.reply({ content: 'Deneyim puanı negatif olamaz.', ephemeral: true });
            }

            const isExist = await Job.findOne({ name });

            if (isExist) {
                return await interaction.reply({ content: 'Bu ada sahip bir meslek zaten var.', ephemeral: true });
            }

            const job = new Job(
                data?.[0] ? { name, parent: data?.[0], experience } : { name, experience }
            );
            
            await job.save();

            // Reply to the interaction indicating the job was created successfully.
            return await interaction.reply({ content: `Meslek başarıyla oluşturuldu: ${name}`, ephemeral: true });
        } 

        if (subaction === 'edit') {

            const job = await Job.findOne({ name: data?.[0] });

            if (!job) {
                return await interaction.reply({ content: 'Bu ada sahip bir meslek yok.', ephemeral: true });
            }

            const name = interaction.fields.getTextInputValue('name');
            const experience = interaction.fields.getTextInputValue('experience');
            const parent = interaction.fields.getTextInputValue('parent');

            if (!name) {
                return await interaction.reply({ content: 'Bir meslek adı girmelisiniz.', ephemeral: true });
            }

            if (!experience) {
                return await interaction.reply({ content: 'Bir deneyim puanı girmelisiniz.', ephemeral: true });
            }
            
            const experiencePoints = parseInt(experience);

            if (isNaN(experiencePoints)) {
                return await interaction.reply({ content: 'Deneyim puanı sayı olmalıdır.', ephemeral: true });
            }

            if (experiencePoints < 0) {
                return await interaction.reply({ content: 'Deneyim puanı negatif olamaz.', ephemeral: true });
            }

            const isNewNameExist = data?.[0] !== name ? await Job.findOne({ name }) : false;

            if (isNewNameExist) {
                return await interaction.reply({ content: 'Bu ada sahip bir meslek zaten var.', ephemeral: true });
            }
            
            const isParentExists = parent ? await Job.findOne({ name: parent }) : true;

            if (!isParentExists) {
                return await interaction.reply({ content: 'Bu ada sahip bir üst meslek yok.', ephemeral: true });
            }

            job.name = name;
            job.experience = experiencePoints;
            job.parent = parent;

            await job.save();

            if (data?.[0] !== name) {
                await Job.updateMany({ parent: data?.[0] }, { parent: name });
                await User.updateMany({ job: data?.[0] }, { job: name });
            }

            // Reply to the interaction indicating the job was updated successfully.
            return await interaction.reply({ content: `Meslek başarıyla güncellendi: ${name}`, ephemeral: true });

        }
    } catch (e) {
        console.log(e); // Log any encountered errors to the console.

        // Reply to the interaction indicating an error occurred.
        await interaction.reply({ content: 'Bir hata oluştu', ephemeral: true });
    }
}