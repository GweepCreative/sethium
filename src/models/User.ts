import mongoose, { InferSchemaType, Schema } from 'mongoose';
import { SnowflakeField } from '../helpers/mongoose';
import Job from './Job';
import Loot from './Loot';
import Tool from './Tool';
import Item from './Item';
import { PopulatedPartnership } from './Partnership';

const UserSchema = new Schema({
    id: {
        ...SnowflakeField,
        unique: true
    },
    job: {
        type: Job.schema,
        required: false
    },
    experience: {
        type: Number,
        required: true,
        default: 0
    },
    workExperience: {
        type: Number,
        required: true,
        default: 0
    },
    canAdvance: {
        type: Boolean,
        required: true,
        default: false
    },
    inventory: {
        type: {
            loots: {
                type: [
                    {
                        loot: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Loot',
                            required: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        }
                    }
                ],
                required: true,
                default: []
            },
            items: {
                type: [
                    {
                        item: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Item',
                            required: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        },
                        durability: {
                            type: Number,
                            required: false
                        }
                    }
                ],
                required: true,
                default: []
            },
            tools: {
                type: [
                    {
                        tool: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Tool',
                            required: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        },
                        durability: {
                            type: Number,
                            required: true
                        }
                    }
                ],
                required: true,
                default: []
            },
            shopItems: {
                type: [
                    {
                        id: {
                            type: Number,
                            required: true
                        },
                        amount: {
                            type: Number,
                            required: true
                        },
                        durability: {
                            type: Number,
                            required: false
                        }
                    }
                ],
                required: true,
                default: []
            }
        },
        required: true,
        default: {
            loots: [],
            tools: [],
            items: [],
            shopItems: []
        }
    },
    wallet: {
        type: {
            seth: {
                type: Number,
                required: true,
                default: 0
            },
            yeth: {
                type: Number,
                required: true,
                default: 0
            }
        },
        required: true,
        default: {
            seth: 0,
            yeth: 0
        }
    },
    lastDaily: {
        type: Date,
        required: false
    },
    lastHourly: {
        type: Date,
        required: false
    },
    bank: {
        type: {
            seth: {
                type: Number,
                required: true,
                default: 0
            }
        },
        required: true,
        default: {
            seth: 0
        }
    },
    limit: {
        type: {
            used: {
                type: Number,
                required: true,
                default: 0
            },
            total: {
                type: Number,
                required: true,
                default: 100000
            }
        },
        required: true,
        default: {
            used: 0,
            total: 100000
        }
    },
    lastBankAction: {
        type: Date,
        required: false
    },
    luck: {
        type: Number,
        required: true,
        default: 0
    },
    xp: {
        type: Number,
        required: true,
        default: 0
    },
    votes: {
        type: [
            Date
        ],
        required: true,
        default: []
    },

    // Specific fields for jobs

    // Butcher Fields
    butcher: {
        type: {
            transports: {
                cow: {
                    renewal: {
                        type: Date,
                        required: true
                    }
                },
                sheep: {
                    renewal: {
                        type: Date,
                        required: true
                    }
                },
                chicken: {
                    renewal: {
                        type: Date,
                        required: true
                    }
                }
            },
            storage: {
                cow: {
                    type: Number,
                    required: true,
                    default: 0
                },
                sheep: {
                    type: Number,
                    required: true,
                    default: 0
                },
                chicken: {
                    type: Number,
                    required: true,
                    default: 0
                }
            },
            refrigerator: [
                {
                    capacity: {
                        type: Number,
                        required: true,
                        default: 15
                    },
                    cow: {
                        type: Number,
                        required: true,
                        default: 0
                    },
                    sheep: {
                        type: Number,
                        required: true,
                        default: 0
                    },
                    chicken: {
                        type: Number,
                        required: true,
                        default: 0
                    },
                    total: {
                        type: Number,
                        required: true,
                        default: 0
                    }
                }
            ]
        },
        required: true,
        default: {
            transports: {
                cow: { renewal: new Date(0) },
                sheep: { renewal: new Date(0) },
                chicken: { renewal: new Date(0) }
            },
            storage: { cow: 0, sheep: 0, chicken: 0 },
            refrigerator: [
                { capacity: 15, cow: 0, sheep: 0, chicken: 0, total: 0 },
                { capacity: 15, cow: 0, sheep: 0, chicken: 0, total: 0 },
                { capacity: 15, cow: 0, sheep: 0, chicken: 0, total: 0 }
            ]
        }
    },

    // Farmer Fields
    farmer: {
        type: {
            zones: {
                type: [
                    {
                        status: {
                            type: String,
                            required: true,
                            enum: ['dried', 'plowed', 'watered', 'planted'],
                        },
                        lastAction: {
                            type: Date,
                            required: true
                        },
                        seed: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'Loot',
                            required: false
                        },
                    }
                ],
                required: true,
                default: []
            },
        },
        required: true,
        default: {}
    },
    chef: {
        type: {
            shop: {
                type: Boolean,
                required: true,
                default: false
            },
            tables: {
                type: [{
                    firstChair: {
                        type: Number,
                        required: true
                    },
                    secondChair: {
                        type: Number,
                        required: true
                    },
                    table: {
                        type: Number,
                        required: true
                    },
                }],
                required: true,
                default: []
            },
            orders: {
                type: [{
                    order: {
                        type: Number,
                        required: true
                    },
                    id: {
                        type: Number,
                        required: true
                    },
                    renewal: {
                        type: Date,
                        required: true
                    },
                    delivered: {
                        type: Boolean,
                        required: true,
                        default: false
                    }
                }],
                required: true,
                default: []
            },
            lastOrderID: {
                type: Number,
                required: true,
                default: 1
            },
        },
        required: true,
        default: {}
    },
    achievements: {
        type: Map,
        of: String,
        required: true,
        default: {}
    },
    rose: {
        type: Number,
        required: true,
        default: 0
    },
    badges: {
        type: Number,
        required: true,
        default: 0
    },
    description: {
        type: String,
        required: false,
        default: ''
    },
    language: {
        type: String,
        required: true,
        default: 'en-US',
        enum: ['en-GB', 'en-US', 'tr']
    },
    partner: {
        type: {
            requests: {
                type: [
                    {
                        user: {
                            type: mongoose.SchemaTypes.ObjectId,
                            ref: 'User',
                            required: true
                        },
                        date: {
                            type: Date,
                            required: true
                        }
                    }
                ],
                required: true,
                default: []
            },
            partner: {
                type: mongoose.SchemaTypes.ObjectId,
                ref: 'User',
                required: false
            },
        },
        required: true,
        default: {}
    },
    premium: {
        type: {
            status: {
                type: Boolean,
                required: true,
                default: true
            },
            expiration: {
                type: Date,
                required: true
            }
        },
        required: true,
        default: {
            status: false,
            expiration: null
        }
    },
    actionCounts: {
        type: {
            bet: {
                type: Number,
                required: true,
                default: 0
            },
            slots: {
                type: Number,
                required: true,
                default: 0
            },
            daily: {
                type: Number,
                required: true,
                default: 0
            },
            guess: {
                type: Number,
                required: true,
                default: 0
            },
            dice: {
                type: Number,
                required: true,
                default: 0
            },
            sales: {
                type: Number,
                required: true,
                default: 0
            },
            blackjack: {
                type: Number,
                required: true,
                default: 0
            },
            work: {
                type: Number,
                required: true,
                default: 0
            }
        },
        required: true,
        default: {
            bet: 0,
            slots: 0,
            daily: 0,
            guess: 0,
            dice: 0,
            sales: 0,
            blackjack: 0,
            work: 0
        }
    },
    tutorial: {
        type: Number,
        required: true,
        default: 1
    }
}, {
    timestamps: true
});

const Register = () => mongoose.model('User', UserSchema);

const User = (mongoose.models.User || Register()) as ReturnType<typeof Register>;

export type PopulatedUser = Omit<Omit<Omit<Omit<InferSchemaType<typeof UserSchema> & mongoose.Document, 'inventory'>, 'farmer'>, 'achievements'>, 'partner'> & {
    inventory: {
        loots: {
            loot: InferSchemaType<typeof Loot.schema>;
            amount: number;
        }[];
        items: {
            item: InferSchemaType<typeof Item.schema>;
            amount: number;
            durability?: number;
        }[];
        tools: {
            tool: InferSchemaType<typeof Tool.schema>;
            amount: number;
            durability: number;
        }[];
        shopItems: {
            id: number;
            amount: number;
            durability?: number;
        }[];
    },
    farmer: {
        zones: {
            status: 'dried' | 'plowed' | 'watered' | 'planted';
            lastAction: Date;
            seed?: InferSchemaType<typeof Loot.schema>;
        }[];
    };
    achievements: Map<string, number>;
    partner: {
        requests: {
            user: PopulatedUser;
            date: Date;
        }[];
        partner?: PopulatedPartnership;
    };
}

export default User;