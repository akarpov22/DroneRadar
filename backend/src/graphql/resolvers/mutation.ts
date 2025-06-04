import { MutationResolvers } from "../../generated/schema";
import { createDrone } from '../mutations/create-drone'

export const mutationResolvers: MutationResolvers = {
    createDrone
}