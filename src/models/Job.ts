import mongoose, { Schema } from 'mongoose';
import Tool from './Tool';
import Loot from './Loot';

const JobSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    parent: {
        type: String,
        required: false
    },
    experience: {
        type: Number,
        required: true,
        default: 0
    },
    tools: {
        type: [
            {
                type: Tool.schema,
                required: true
            }
        ],
        required: true,
        default: []
    },
    loots: {
        type: [
            {
                type: Loot.schema,
                required: true
            }
        ],
        required: true,
        default: []
    }
}, {
    timestamps: true
});

const Register = () => mongoose.model('Job', JobSchema);

const Job = (mongoose.models.Job || Register()) as ReturnType<typeof Register>;

export default Job;