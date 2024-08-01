import mongoose, { InferSchemaType, Schema } from 'mongoose';
import { EmojiField, JobField, SnowflakeField } from '../helpers/mongoose';
import Loot from './Loot';
import Item from './Item';

const ToolSchema = new Schema({
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
    upgrades: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Tool'
            }
        ],
        required: true,
        default: []
    },
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
    durability: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

export type PopulatedTool = Omit<Omit<InferSchemaType<typeof ToolSchema>, 'upgrades'>, 'recipe'> & {
    upgrades: PopulatedTool[],
    recipe: {
        variants: {
            variant: string,
            quantity: number
        }[],
        loots: {
            loot: InferSchemaType<typeof Loot.schema>,
            quantity: number
        }[],
        items: {
            item: InferSchemaType<typeof Item.schema>,
            quantity: number
        }[]

    }
}

const Register = () => mongoose.model('Tool', ToolSchema);

const Tool = (mongoose.models.Tool || Register()) as ReturnType<typeof Register>;

export default Tool;