import { MutationResolvers } from "../../generated/schema";
import { registerDroneIfNotExists } from '../mutations/register-drone-If-not-exists'
import { appendPosition } from '../mutations/append-position'
import { assignOperator } from "../mutations/assign-operator";
import { assignModel } from "../mutations/assign-model";
import { endSession } from "../mutations/end-seesion";
import { createSession } from "../mutations/create-session";
import { createOperator } from "../mutations/create-operator";
import { createRegion } from "../mutations/create-region";

export const mutationResolvers: MutationResolvers = {
    registerDroneIfNotExists,
    appendPosition,
    assignOperator,
    assignModel,
    endSession,
    createSession,
    createOperator,
    createRegion
}