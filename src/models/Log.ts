import mongoose, { Schema } from 'mongoose';
import { SnowflakeField } from '../helpers/mongoose';

const LogSchema = new Schema({
    from: {
        ...SnowflakeField,
        required: true
    },
    to: {
        ...SnowflakeField,
        required: true
    },
    type: {
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

const Register = () => mongoose.model('Log', LogSchema);

const Log = (mongoose.models.Log || Register()) as ReturnType<typeof Register>;

export default Log;