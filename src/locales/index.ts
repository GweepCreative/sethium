import fs from 'node:fs';
import path from 'node:path';

const languages: string[] = [];

for (const entity of fs.readdirSync(__dirname)) {
    if (fs.statSync(path.join(__dirname, entity)).isDirectory() && /[a-z]{2}/.test(entity)) {
        languages.push(entity);
    }
}

languages.sort((a, b) => {
    if (a === 'en') return -1;
    if (b === 'en') return 1;
    return a.localeCompare(b);
});

const namespaces: string[] = [];

for (const entity of fs.readdirSync(path.join(__dirname, languages[0]))) {
    if (entity.endsWith('.json')) {
        namespaces.push(entity.replace(/\.json$/, ''));
    }
}

export {
    languages,
    namespaces
}

const translation: {
    [key: string]: {
        [key: string]: any
    }
} = {}

for (const language of languages) {
    translation[language] = {};

    const files = fs.readdirSync(path.join(__dirname, language));

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const content = fs.readFileSync(path.join(__dirname, language, file), 'utf-8');
        const parsed = JSON.parse(content);

        translation[language][file.replace(/\.json$/, '')] = parsed;
    }

    for (const namespace of namespaces) {
        if (!translation[language][namespace]) {
            translation[language][namespace] = {};
        }
    }
}

export default translation;