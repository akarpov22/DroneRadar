import { MutationResolvers } from "../../generated/schema";
import { registerDroneIfNotExists } from '../mutations/register-drone-If-not-exists'
import { appendPosition } from '../mutations/append-position'
import { assignOperator } from "../mutations/assign-operator";

export const mutationResolvers: MutationResolvers = {
    registerDroneIfNotExists,
    appendPosition,
    assignOperator
}