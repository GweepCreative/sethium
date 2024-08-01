import { JobNameRegex } from "./regexes";

export const JobField = {
    type: String,
    required: true,
    validate: {
        validator: (v: string) => JobNameRegex.test(v),
        message: (props: { value: string }) => `${props.value} is not a valid job name`
    }
} as const;

export const SnowflakeField = {
    type: String,
    required: true,
    validate: {
        validator: (v: string) => /^[0-9]{17,}$/.test(v),
        message: (props: { value: string }) => `${props.value} is not a valid Discord Snowflake`
    }
} as const;

export const EmojiField = {
    type: String,
    required: true,
    /* validate: {
        validator: (v: string) => /^<a?:[a-zA-Z0-9_]+:[0-9]{17,}>$/.test(v),
        message: (props: { value: string }) => `${props.value} is not a valid Discord Emoji`
    } */
} as const;