import { InferSchemaType } from "mongoose";
import Job from "../models/Job";

export const promotionLevels = {
	1: 75,
	2: 500,
	3: 1500,
} as any;

export async function calculateJobTier(
	job: InferSchemaType<typeof Job.schema>
): Promise<number> {
	if (!job.parent) {
		return 1;
	}

	const parent = await Job.findOne({ name: job.parent });

	if (!parent) {
		return 1;
	}

	return (await calculateJobTier(parent)) + 1;
}

export async function calculateCurrentJobPath(
	job: InferSchemaType<typeof Job.schema>
): Promise<[number, number]> {
	// current tier, max tier

	const tier = await calculateJobTier(job);
	/* 
    const parent = await Job.findOne({ name: job.parent });
 */
	return [tier, ["Madenci", "Demirci"].includes(job.name) ? 2 : 3];
}

export async function calculateCurrentJobDuration(
	job: InferSchemaType<typeof Job.schema>
): Promise<number> {
	const tier = await calculateJobTier(job);

	return promotionLevels?.[tier + 1] ?? promotionLevels?.[tier] ?? 0;
}
