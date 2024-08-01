const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";

const SuperscriptNumber = (value: number) => value.toString()
    .split("").map(digit => superscripts[parseInt(digit)]).join("");

export default SuperscriptNumber