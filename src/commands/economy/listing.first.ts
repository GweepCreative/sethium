import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import User, { PopulatedUser } from "../../models/User";
import Listing, { PopulatedListing } from "../../models/Listing";
import getTranslation from "../../helpers/i18n";
import Item from "../../models/Item";
import Loot from "../../models/Loot";

export const data = new SlashCommandBuilder()
	.setName("listing")
	.setNameLocalization("tr", "ilan")
	.setDescription("Manage your marketplace listings!")
	.setDescriptionLocalization("tr", "Pazar yeri ilanlarınızı yönetin!")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("add")
			.setNameLocalization("tr", "ekle")
			.setDescription("Add an item to the market")
			.setDescriptionLocalization("tr", "Bir eşyayı pazara ekler")
			.addStringOption((option) =>
				option
					.setName("item")
					.setNameLocalization("tr", "esya")
					.setDescription("The item you want to add to the market")
					.setDescriptionLocalization(
						"tr",
						"Pazara eklemek istediğiniz eşya"
					)
					.setRequired(true)
					.setAutocomplete(true)
			)
			.addNumberOption((option) =>
				option
					.setName("price")
					.setNameLocalization("tr", "fiyat")
					.setDescription("The price per item")
					.setDescriptionLocalization("tr", "Eşyanın tane fiyatı")
					.setMinValue(1)
					.setRequired(true)
			)
			.addNumberOption((option) =>
				option
					.setName("amount")
					.setNameLocalization("tr", "miktar")
					.setDescription("The amount of the item")
					.setDescriptionLocalization("tr", "Eşyanın miktarı")
					.setMinValue(1)
					.setRequired(true)
			)
			.addBooleanOption((option) =>
				option
					.setName("single")
					.setNameLocalization("tr", "perakende")
					.setDescription("Whether the listing is single or not")
					.setDescriptionLocalization(
						"tr",
						"İlanın perakende olup olmadığı"
					)
					.setRequired(true)
			)
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("remove")
			.setNameLocalization("tr", "kaldır")
			.setDescription("Remove an item from the market")
			.setDescriptionLocalization("tr", "Pazardan bir eşyayı kaldırır")
			.addStringOption((option) =>
				option
					.setName("id")
					.setDescription("The ID of the listing you want to remove")
					.setDescriptionLocalization(
						"tr",
						"Kaldırmak istediğiniz ilanın ID'si"
					)
					.setRequired(true)
			)
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("update")
			.setNameLocalization("tr", "düzenle")
			.setDescription("Update an item on the market")
			.setDescriptionLocalization("tr", "Pazardaki bir eşyayı günceller")
			.addStringOption((option) =>
				option
					.setName("id")
					.setDescription("The ID of the listing you want to update")
					.setDescriptionLocalization(
						"tr",
						"Güncellemek istediğiniz ilanın ID'si"
					)
					.setRequired(true)
			)
	);

export const timeout = 1000 * 15;

export const shouldRegister = true;

export async function autocomplete(interaction: AutocompleteInteraction) {
	try {
		const subcommands = {
			add: {
				execute: async (interaction: AutocompleteInteraction) => {
					const user = (await User.findOne({
						id: interaction.user.id,
					})
						.populate("inventory.loots.loot")
						.populate("inventory.items.item")
						.exec()) as any as PopulatedUser;

					const value =
						(
							interaction.options.getString("item") ||
							interaction.options.getString("esya")
						)?.toLowerCase() || "";

					if (!user) {
						return await interaction.respond([]);
					}

					return await interaction.respond(
						user.inventory.items
							.filter(({ item }) =>
								item.title.toLowerCase().includes(value)
							)
							.map(({ item }) => ({
								name: item.title,
								value: `item.${item.id}`,
							}))
							.concat(
								user.inventory.loots
									.filter(({ loot }) =>
										loot.title.toLowerCase().includes(value)
									)
									.map(({ loot }) => ({
										name: loot.title,
										value: `loot.${loot.id}`,
									}))
							)
					);
				},
				names: ["add", "ekle"],
			},
		} as {
			[key: string]: {
				execute: (interaction: AutocompleteInteraction) => Promise<any>;
				names: string[];
			};
		};

		const subcommand = interaction.options.getSubcommand();

		const request = Object.values(subcommands).find((request) =>
			request.names.includes(subcommand)
		);

		if (!request) {
			return;
		}

		return await request.execute(interaction);
	} catch (error) {
		console.error("Error while autocompleting market command:", error);
	}
}

export async function execute(interaction: ChatInputCommandInteraction) {
	try {
		const user = (await User.findOne({ id: interaction.user.id })
			.populate("inventory.loots.loot")
			.populate("inventory.items.item")
			.populate("partner.partner")
			.exec()) as any as PopulatedUser;

		if (!user) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.noAccount",
							interaction.locale
						),
					}),
				],
			});
		}

		if (!user.job || !user.job.name) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"jobs.noJob",
							interaction.locale
						),
					}),
				],
			});
		}

		const subcommand = interaction.options.getSubcommand();

		const subcommands = {
			add: {
				execute: add,
				names: ["add", "ekle"],
			},
			remove: {
				execute: remove,
				names: ["remove", "kaldır"],
			},
			update: {
				execute: update,
				names: ["update", "düzenle"],
			},
		} as {
			[key: string]: {
				execute: (
					interaction: ChatInputCommandInteraction,
					user: PopulatedUser
				) => Promise<any>;
				names: string[];
			};
		};

		const request = Object.values(subcommands).find((request) =>
			request.names.includes(subcommand)
		);

		if (!request) {
			return await interaction.reply({
				embeds: [
					interaction.client.embedManager.Error({
						content: getTranslation(
							"errors",
							"account.notYourJob",
							interaction.locale,
							{
								job: user.job?.name,
							}
						),
					}),
				],
			});
		}

		return await request.execute(interaction, user);
	} catch (error) {
		console.error("Error while executing work command:", error);
	}
}

async function add(
	interaction: ChatInputCommandInteraction,
	user: PopulatedUser
) {
	const value = (
		interaction.options.getString("item") ||
		interaction.options.getString("esya") ||
		""
	).split(".");

	if (value.length !== 2) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"global.error",
						interaction.locale
					),
				}),
			],
		});
	}

	const item =
		value[0] === "item"
			? user.inventory.items.find(
					({ item }) => String(item.id) === value[1]
			  )
			: null;
	const loot = !item
		? user.inventory.loots.find(({ loot }) => String(loot.id) === value[1])
		: null;

	if (!item && !loot) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.invalidItem",
						interaction.locale
					),
				}),
			],
		});
	}

	const thing = item
		? {
				item: item.item,
				amount: item.amount,
		  }
		: {
				item: loot!.loot,
				amount: loot!.amount,
		  };

	if (
		thing.item.job &&
		user.job &&
		thing.item.job === "Demirci" &&
		user.job.name !== "Demirci"
	) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.notABlacksmith",
						interaction.locale
					),
				}),
			],
		});
	}

	const price = parseInt(
		String(
			interaction.options.getNumber("price") ||
				interaction.options.getNumber("fiyat") ||
				0
		)
	);

	if (!price || isNaN(price)) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.invalidPrice",
						interaction.locale
					),
				}),
			],
		});
	}

	if (price < thing?.item.minimumPrice * 2) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.priceTooLow",
						interaction.locale,
						{
							price: thing.item.minimumPrice * 2,
						}
					),
				}),
			],
		});
	}

	if (price > thing?.item.maximumPrice * 2) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.priceTooHigh",
						interaction.locale,
						{
							price: thing.item.maximumPrice * 2,
						}
					),
				}),
			],
		});
	}

	if (!thing.item.tradeable) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.thisItemIsNotSellable",
						interaction.locale
					),
				}),
			],
		});
	}

	const amount =
		interaction.options.getNumber("amount") ||
		interaction.options.getNumber("miktar") ||
		1;

	if (amount < 1) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.invalidAmount",
						interaction.locale
					),
				}),
			],
		});
	}

	if (amount > thing.amount) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.youDontHaveEnough",
						interaction.locale,
						{
							item: thing.item.title,
							amount: thing.amount,
						}
					).replace("$itemEmoji", thing.item.emoji || ""),
				}),
			],
		});
	}

	const single =
		interaction.options.getBoolean("single") ||
		interaction.options.getBoolean("perakende") ||
		false;

	const activeListingsCount = await Listing.countDocuments({
		user: user._id,
		sold: false,
	});

	let limit = 5;

	if (user.partner.partner && user.partner.partner.level >= 3) {
		limit += 2;
	}
	if (user.premium.status) {
		limit += 5;
	}

	if (activeListingsCount >= limit) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.cantHaveMoreListingsThan",
						interaction.locale,
						{
							count: limit,
						}
					),
				}),
			],
		});
	}

	const id = (await Listing.countDocuments()) + 1;

	const itemID = (
		item
			? ((await Item.findOne({ id: item.item.id }).exec()) as any)
			: ((await Loot.findOne({ id: loot!.loot.id }).exec()) as any)
	)?.id as number;

	if (isNaN(parseInt(itemID as any))) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"global.error",
						interaction.locale
					),
				}),
			],
		});
	}

	const listing = new Listing({
		id,
		user: user._id,
		...(item
			? { item: (item.item as any)?._id }
			: { loot: (loot!.loot as any)?._id }),
		price,
		amount,
		sold: false,
		itemID,
		single,
	});

	await listing.save();

	if (item) {
		item.amount -= amount;
		user.inventory.items = user.inventory.items.filter(
			({ amount }) => amount > 0
		);
	} else {
		loot!.amount -= amount;
		user.inventory.loots = user.inventory.loots.filter(
			({ amount }) => amount > 0
		);
	}

	user.markModified("inventory");

	if (user.tutorial === 4) {
		user.tutorial = 5;
	}

	await user.save();

	await interaction.reply({
		embeds: [
			interaction.client.embedManager.Success({
				content: getTranslation(
					"commands",
					"market.added",
					interaction.locale,
					{
						amount: (String(amount) + "x").replace(
							"$item",
							thing.item.title
						),
						price: String(price),
						item: thing.item.title,
					}
				).replace("$itemEmoji", thing.item.emoji || ""),
			}),
		],
	});
}

async function remove(
	interaction: ChatInputCommandInteraction,
	user: PopulatedUser
) {
	const id = parseInt(interaction.options.getString("id", true) || "");

	if (isNaN(id) || id < 1) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.invalidID",
						interaction.locale
					),
				}),
			],
		});
	}

	const listing = (await Listing.findOne({ id, sold: false })
		.populate("item")
		.populate("loot")
		.populate("user")
		.exec()) as any as PopulatedListing;

	if (!listing) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.cannotFindListing",
						interaction.locale
					),
				}),
			],
		});
	}

	if (listing.user.id !== user.id) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.isNotYours",
						interaction.locale
					),
				}),
			],
		});
	}

	const remaining = listing.sold
		? 0
		: listing.single
		? listing.amount - listing.buyer.length
		: listing.amount;

	if (remaining) {
		const inv =
			user.inventory.items.find(
				({ item }) => item.id === listing.itemID
			) ||
			user.inventory.loots.find(({ loot }) => loot.id === listing.itemID);

		if (inv) {
			inv.amount += remaining;
		} else {
			if (listing.item) {
				user.inventory.items.push({
					item: listing.item,
					amount: remaining,
				});
			} else {
				user.inventory.loots.push({
					loot: listing.loot,
					amount: remaining,
				});
			}
		}
	}

	listing.sold = true;

	await listing.save();

	user.inventory.items = user.inventory.items.filter(
		({ amount }) => amount > 0
	);

	user.markModified("inventory");

	await user.save();

	await interaction.reply({
		embeds: [
			interaction.client.embedManager.Success({
				content: getTranslation(
					"commands",
					"market.removed",
					interaction.locale
				),
			}),
		],
	});
}

async function update(
	interaction: ChatInputCommandInteraction,
	user: PopulatedUser
) {
	const id = parseInt(interaction.options.getString("id", true) || "");

	if (isNaN(id) || id < 1) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.invalidID",
						interaction.locale
					),
				}),
			],
		});
	}

	const listing = (await Listing.findOne({ id, sold: false })
		.populate("item")
		.populate("loot")
		.populate("user")
		.exec()) as any as PopulatedListing;

	if (!listing) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.cannotFindListing",
						interaction.locale
					),
				}),
			],
		});
	}

	if (listing.user.id !== user.id) {
		return await interaction.reply({
			embeds: [
				interaction.client.embedManager.Error({
					content: getTranslation(
						"errors",
						"market.isNotYours",
						interaction.locale
					),
				}),
			],
		});
	}

	const modal = new ModalBuilder()
		.setTitle(
			getTranslation("commands", "market.update", interaction.locale)
		)
		.setCustomId(`market.update.${interaction.user.id}.${id}`);

	const priceInput = new TextInputBuilder()
		.setCustomId("price")
		.setLabel(getTranslation("global", "price", interaction.locale))
		.setPlaceholder(
			getTranslation("commands", "market.enterPrice", interaction.locale)
		)
		.setValue(String(listing.price))
		.setMinLength(1)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const remaining = listing.sold
		? 0
		: listing.single
		? listing.amount - listing.buyer.length
		: listing.amount;

	const amountInput = new TextInputBuilder()
		.setCustomId("amount")
		.setLabel(getTranslation("global", "amount", interaction.locale))
		.setPlaceholder(
			getTranslation("commands", "market.enterAmount", interaction.locale)
		)
		.setValue(String(remaining))
		.setMinLength(1)
		.setMaxLength(remaining.toString().length)
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	modal.addComponents(
		[priceInput, amountInput].map(
			(input) => new ActionRowBuilder().addComponents(input) as any
		)
	);

	await interaction.showModal(modal);
}
