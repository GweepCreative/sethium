import mongoose, { InferSchemaType, Schema } from 'mongoose';
import { EmojiField, JobField, SnowflakeField } from '../helpers/mongoose';
import Loot from './Loot';

const ItemSchema = new Schema({
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
    recipe: {
        type: {
            variants: {
                type: [
                    {
                        variant: {
                            type: String,
                            required: true,
                        },
                        quantity: {
                            type: Number,
                            required: true,
                            min: 1
                        }
                    }
                ],
                required: true,
            },
            loots: {
                type: [
                    {
                        loot: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Loot',
                        },
                        quantity: {
                            type: Number,
                            required: true,
                            min: 1
                        }
                    }
                ],
                required: true,
            },
            items: {
                type: [
                    {
                        item: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Item'
                        },
                        quantity: {
                            type: Number,
                            required: true,
                            min: 1
                        }
                    }
                ],
                required: true,
            },
        },
        required: true,
        default: {
            variants: [],
            loots: [],
            items: []
        }

    },
    tradeable: {
        type: Boolean,
        required: true,
        default: true
    }
}, {
    timestamps: true
});

const Register = () => mongoose.model('Item', ItemSchema);

const Item = (mongoose.models.Item || Register()) as ReturnType<typeof Register>;

export type PopulatedItem = Omit<InferSchemaType<typeof ItemSchema> & mongoose.Document<typeof ItemSchema>, 'recipe'> & {
    recipe: {
        variants: {
            variant: string;
            quantity: number;
        }[];
        loots: {
            loot: InferSchemaType<typeof Loot.schema> & mongoose.Document<typeof Loot.schema>;
            quantity: number;
        }[];
        items: {
            item: PopulatedItem;
            quantity: number;
        }[];
    };
};

export default Item;