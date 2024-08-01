// https://www.30secondsofcode.org/js/s/split-array-into-chunks/

export default function chunk<T extends any>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    )
}