import mongoose, { InferSchemaType, Schema, mongo } from 'mongoose';
import { EmojiField, JobField, SnowflakeField } from '../helpers/mongoose';

const LootSchema = new Schema({
    id: {
        type: Number,
        required: true,
        min: 0
    },
    title: {
        type: String,
        required: true
    },
    job: JobField,
    emoji: EmojiField,
    minimumPrice: {
        type: Number,
        required: true
    },
    maximumPrice: {
        type: Number,
        required: true
    },
    variant: {
        type: String,
        required: false
    },
    tradeable: {
        type: Boolean,
        required: true,
        default: true
    }
}, {
    timestamps: true
});

const Register = () => mongoose.model('Loot', LootSchema);

const Loot = (mongoose.models.Loot || Register()) as ReturnType<typeof Register>;

export default Loot;