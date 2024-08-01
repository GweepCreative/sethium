import i18next from 'i18next';

import translation, { languages, namespaces } from './locales';

const resources: {
    [key: string]: {
        [key: string]: any
    }
} = {};

for (const language of languages) {
    resources[language] = {};

    for (const namespace of namespaces) {
        resources[language][namespace] = translation[language][namespace];
    }
}

i18next.init({
    lng: 'tr', // if you're using a language detector, do not define the lng option
    // debug: true,

    // run without waiting for loaded translations to be used
    initImmediate: true,

    fallbackLng: 'tr',
    supportedLngs: languages,

    ns: namespaces,

    resources
});