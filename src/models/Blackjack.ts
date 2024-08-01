import mongoose, { Schema } from 'mongoose';
import { SnowflakeField } from '../helpers/mongoose';

const BlackjackSchema = new Schema({
    bjid: {
        type: Number,
        required: true,
        default: 1,
        unique: true,
        auto: true
    },
    bet: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean
    },
    userId: {
        ...SnowflakeField
    },
    userType: {
        type: String,
        enum: ['d', 'hf'],
        default: 'd'
    },
    dealerType: {
        type: String,
        enum: ['c', 's'],
        default: 'c'
    },
    userCards: {
        type: [
            {
                type: Number
            }
        ],
        default: []
    },
    dealerCards: {
        type: [
            {
                type: Number
            }
        ],
        default: []
    },
    round: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

BlackjackSchema.index({ bjid: 1 });

// On creation create a incrementing number for the blackjack id
BlackjackSchema.pre('save', async function (next) {
    if (this.isNew) {
        const last = await Blackjack.findOne().sort({ bjid: -1 });
        this.bjid = last ? last.bjid + 1 : 1;
    }
    next();
});

const Register = () => mongoose.model('Blackjack', BlackjackSchema);

const Blackjack = (mongoose.models.Blackjack || Register()) as ReturnType<typeof Register>;

export default Blackjack;
