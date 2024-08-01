import Item from "../../models/Item";
import Loot from "../../models/Loot";
import Tool from "../../models/Tool";

export default async function lastContentID() {
    const lastLoot = await Loot.findOne().sort({ id: -1 });
    const lastTool = await Tool.findOne().sort({ id: -1 });
    const lastItem = await Item.findOne().sort({ id: -1 });

    return Math.max(lastLoot?.id || 0, lastTool?.id || 0, lastItem?.id || 0);
}