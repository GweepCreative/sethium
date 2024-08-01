import mongoose, { Schema } from 'mongoose';
import { SnowflakeField } from '../helpers/mongoose';

const PartnershipLogSchema = new Schema({
    partnership: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Partnership',
        required: true
    },
    user: {
        ...SnowflakeField,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const Register = () => mongoose.model('PartnershipLog', PartnershipLogSchema);

const PartnershipLog = (mongoose.models.PartnershipLog || Register()) as ReturnType<typeof Register>;

export default PartnershipLog;