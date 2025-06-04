import { MutationResolvers } from "../../generated/schema";
import { registerDroneIfNotExists } from '../mutations/register-drone-If-not-exists'

export const mutationResolvers: MutationResolvers = {
    registerDroneIfNotExists
}