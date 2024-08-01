import mongoose, { InferSchemaType, Schema } from 'mongoose';
import { PopulatedUser } from './User';

const PartnershipSchema = new Schema({
    id: {
        type: Number,
        required: true,
        default: 1,
        unique: true,
        auto: true
    },
    from: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    active: {
        type: Boolean,
        default: true,
        required: true
    },
    level: {
        type: Number,
        default: 1,
        required: true
    },
    storage: {
        type: Number,
        default: 0,
        required: true
    },
}, {
    timestamps: true
});

export type PopulatedPartnership = Omit<Omit<InferSchemaType<typeof PartnershipSchema> & mongoose.Document, 'from'>,'to'> & {
    from: PopulatedUser;
    to: PopulatedUser;
};

// On creation create a incrementing number for the blackjack id
PartnershipSchema.pre('save', async function (next) {
    if (this.isNew) {
        const last = await Partnership.findOne().sort({ id: -1 });
        this.id = last ? last.id + 1 : 1;
    }
    next();
});

const Register = () => mongoose.model('Partnership', PartnershipSchema);

const Partnership = (mongoose.models.Partnership || Register()) as ReturnType<typeof Register>;

export default Partnership;
