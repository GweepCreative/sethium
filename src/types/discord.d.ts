/* eslint-disable no-var */
import { Client, Collection, Locale } from 'discord.js'
import EmbedManager from '../helpers/embed';
import i18next from 'i18next';

declare module 'discord.js' {
    interface Client {
        embedManager: EmbedManager
        timeouts: Map<string, number>;
        cooldownedCommands: Map<string, {
            name: string;
            localizations: Partial<Record<Locale, string | null>> | undefined;
            timeout: number;
        }>;
    }
}

export { }