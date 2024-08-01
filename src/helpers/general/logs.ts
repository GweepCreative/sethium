import { Client, GuildMember, DiscordErrorData } from "discord.js";

export async function RulesLog(client: Client, member: GuildMember) {
    try {
        const channel = await client.channels.fetch(process.env.RULES_LOG!);

        if (!channel || !channel.isTextBased()) return;

        await channel.send({
            embeds: [
                client.embedManager.Info({
                    title: "Kurallar Log",
                    content: `**${member.user.tag}** kuralları kabul etti.`
                }).setFields(
                    { name: "Kullanıcı", value: member.toString(), inline: true },
                    { name: "Kullanıcı ID", value: member.id, inline: true },
                    { name: "Hesap Oluşturma Tarihi", value: member.user.createdAt.toDateString(), inline: true }
                ).setThumbnail(member.user.displayAvatarURL() || member.user.defaultAvatarURL)
            ]
        });
    } catch (error: any) {
        try {
            //ErrorLog(client, "RulesLog", error, member);
        } catch(e) {}
    }
}
export async function ErrorLog(client: Client, title: string, content: string, member: GuildMember) {
    try {
        const channel = await client.channels.fetch(process.env.ERROR_LOG!);

        if (!channel || !channel.isTextBased()) return;

        await channel.send({
            embeds: [
                client.embedManager.Error({
                    title: "Hata Log",
                    content: `**${title}**`
                }).setFields(
                    { name: "Kullanıcı", value: member.toString(), inline: true },
                    { name: "Kullanıcı ID", value: member.id, inline: true },
                    { name: "Sunucu", value: member.guild.name, inline: true},
                    { name: "Sunucu ID", value: member.guild.id, inline: true },
                    { name:"Hata", value: content, inline: true }
                ).setThumbnail(member.user.displayAvatarURL() || member.user.defaultAvatarURL)
            ]
        });
    } catch (error) {
        
    }
}