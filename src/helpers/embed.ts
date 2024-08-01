import { EmbedBuilder } from "@discordjs/builders";
import { Client } from "discord.js";

interface EmbedOptions {
    content?: string;
    color: Colors;
    fields?: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
    title?: string;
}

export enum Colors {
    Error = 0xf43f5e,
    Success = 0x10b981,
    Info = 0xFEBC8A,
    Warn = 0xeab308,
    Grey = 0x64748b,
    Green = 0x22c55e,
    Red = 0xef4444,
}

type CustomEmbedOptions = ({
    content: string;
} | {
    fields: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
}) & {
    title?: string;
}

export default class EmbedManager {
    constructor(private client: Client<true>) { }

    public Embed(options: EmbedOptions) {
        return new EmbedBuilder({
            color: options.color,
            description: options.content,
            author: {
                name: this.client.user.username,
                icon_url: this.client.user?.displayAvatarURL(),
            },
            timestamp: new Date().toISOString(),
            title: options.title,
            fields: options.fields,
        })
    }

    public Error(options: CustomEmbedOptions) {
        return this.Embed({
            color: Colors.Error,
            ...(
                "content" in options
                    ? { content: options.content }
                    : { fields: options.fields }
            )
        })
    }

    public Success(options: CustomEmbedOptions) {
        return this.Embed({
            color: Colors.Success,
            ...(
                "content" in options
                    ? { content: options.content }
                    : { fields: options.fields }
            )
        })
    }

    public Info(options: CustomEmbedOptions) {
        return this.Embed({
            color: Colors.Info,
            ...(
                "content" in options
                    ? { content: options.content }
                    : { fields: options.fields }
            )
        })
    }

    public Warn(options: CustomEmbedOptions) {
        return this.Embed({
            color: Colors.Warn,
            ...(
                "content" in options
                    ? { content: options.content }
                    : { fields: options.fields }
            )
        })
    }
}