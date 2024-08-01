import { t } from "i18next";
import { Partnership, seth, Boxes } from "../constants/emojis";

const predefines = {
    '$seth': seth,
    '$rose': Partnership.rose,
    '$luck': '🍀',
    '$classic': Boxes.classical
}

export default function getTranslation(namespace: string, key: string, lng: string, params: {
    [key: string]: any
} = {}) {
    let str = t(key, {
        ns: namespace,
        lng: lng === 'tr' ? 'tr' : 'en',
        ...params
    });

    for (const [key, value] of Object.entries(predefines)) {
        str = str.replaceAll(key, value);
    }

    return str;
}