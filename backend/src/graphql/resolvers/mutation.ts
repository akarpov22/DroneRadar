import { MutationResolvers } from "../../generated/schema";
import { registerDroneIfNotExists } from '../mutations/register-drone-If-not-exists'
import { appendPosition } from '../mutations/append-position'

export const mutationResolvers: MutationResolvers = {
    registerDroneIfNotExists,
    appendPosition
}