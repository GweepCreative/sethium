import mongoose, { Schema } from 'mongoose';
import { InferSchemaType } from 'mongoose';
import Loot from './Loot';
import Item from './Item';
import User from './User';

const ListingSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: false
    },
    item: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Item',
        required: false
    },
    itemID: {
        type: Number,
        required: true,
    },
    loot: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Loot',
        required: false
    },
    price: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    sold: {
        type: Boolean,
        required: true,
        default: false
    },
    buyer: [{
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: false
    }],
    single: {
        type: Boolean,
        required: true,
        default: false
    },
}, {
    timestamps: true
});

export type PopulatedListing = Omit<Omit<Omit<InferSchemaType<typeof ListingSchema> & mongoose.Document, 'loot'>, 'item'>, 'user'> & {
    loot: InferSchemaType<typeof Loot.schema> & mongoose.Document;
    item: InferSchemaType<typeof Item.schema> & mongoose.Document;
    user: InferSchemaType<typeof User.schema> & mongoose.Document;
};

const Register = () => mongoose.model('Listing', ListingSchema);

const Listing = (mongoose.models.Listing || Register()) as ReturnType<typeof Register>;

export default Listing;