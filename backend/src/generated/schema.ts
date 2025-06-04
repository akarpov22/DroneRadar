import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Drone as PrismaDrone, DroneModel as PrismaDroneModel, DroneSession as PrismaDroneSession, Operator as PrismaOperator, Position as PrismaPosition, Region as PrismaRegion } from '../prisma/client';
import { Context } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
};

export type AppendPositionInput = {
  altitude: Scalars['Float']['input'];
  droneId: Scalars['String']['input'];
  heading?: InputMaybe<Scalars['Float']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  speed?: InputMaybe<Scalars['Float']['input']>;
  timestamp: Scalars['DateTime']['input'];
};

export type AssignModelInput = {
  droneId: Scalars['String']['input'];
  modelId: Scalars['String']['input'];
};

export type AssignOperatorInput = {
  droneId: Scalars['String']['input'];
  operatorId: Scalars['String']['input'];
};

export type CreateDroneModelInput = {
  manufacturer: Scalars['String']['input'];
  maxRange: Scalars['Float']['input'];
  name: Scalars['String']['input'];
};

export type CreateSessionInput = {
  droneId: Scalars['ID']['input'];
  regionId: Scalars['ID']['input'];
};

export type Drone = {
  __typename?: 'Drone';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  model?: Maybe<DroneModel>;
  name: Scalars['String']['output'];
  operator?: Maybe<Operator>;
  serial?: Maybe<Scalars['String']['output']>;
  sessions: Array<DroneSession>;
};

export type DroneModel = {
  __typename?: 'DroneModel';
  drones: Array<Drone>;
  id: Scalars['ID']['output'];
  manufacturer: Scalars['String']['output'];
  maxRange: Scalars['Float']['output'];
  maxSpeed?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
};

export type DroneSession = {
  __typename?: 'DroneSession';
  drone: Drone;
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  positions: Array<Position>;
  region: Region;
  startedAt: Scalars['DateTime']['output'];
};

export type EndSessionInput = {
  droneId: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  appendPosition: Position;
  assignModel: Drone;
  assignOperator: Drone;
  createDroneModel: DroneModel;
  createSession: DroneSession;
  endSession: DroneSession;
  registerDroneIfNotExists: Drone;
};


export type MutationAppendPositionArgs = {
  input: AppendPositionInput;
};


export type MutationAssignModelArgs = {
  input: AssignModelInput;
};


export type MutationAssignOperatorArgs = {
  input: AssignOperatorInput;
};


export type MutationCreateDroneModelArgs = {
  input: CreateDroneModelInput;
};


export type MutationCreateSessionArgs = {
  input: CreateSessionInput;
};


export type MutationEndSessionArgs = {
  input: EndSessionInput;
};


export type MutationRegisterDroneIfNotExistsArgs = {
  input: RegisterDroneIfNotExistsInput;
};

export type Operator = {
  __typename?: 'Operator';
  drones: Array<Drone>;
  id: Scalars['ID']['output'];
  licenseId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type Position = {
  __typename?: 'Position';
  altitude?: Maybe<Scalars['Float']['output']>;
  heading?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  recordedAt: Scalars['DateTime']['output'];
  session: DroneSession;
  speed?: Maybe<Scalars['Float']['output']>;
};

export type Query = {
  __typename?: 'Query';
  drone: Drone;
  droneModel: DroneModel;
  droneModels: Array<DroneModel>;
  droneSession: DroneSession;
  droneSessions: Array<DroneSession>;
  drones: Array<Drone>;
  operator: Operator;
  operators: Array<Operator>;
  position: Position;
  positions: Array<Position>;
  region: Region;
  regions: Array<Region>;
};


export type QueryDroneArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDroneModelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDroneSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOperatorArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPositionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRegionArgs = {
  id: Scalars['ID']['input'];
};

export type Region = {
  __typename?: 'Region';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  regionCode: Scalars['String']['output'];
  sessions: Array<DroneSession>;
};

export type RegisterDroneIfNotExistsInput = {
  modelId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  operatorId?: InputMaybe<Scalars['String']['input']>;
  regionCode: Scalars['String']['input'];
  serial: Scalars['String']['input'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AppendPositionInput: AppendPositionInput;
  AssignModelInput: AssignModelInput;
  AssignOperatorInput: AssignOperatorInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateDroneModelInput: CreateDroneModelInput;
  CreateSessionInput: CreateSessionInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Drone: ResolverTypeWrapper<PrismaDrone>;
  DroneModel: ResolverTypeWrapper<PrismaDroneModel>;
  DroneSession: ResolverTypeWrapper<PrismaDroneSession>;
  EndSessionInput: EndSessionInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Operator: ResolverTypeWrapper<PrismaOperator>;
  Position: ResolverTypeWrapper<PrismaPosition>;
  Query: ResolverTypeWrapper<{}>;
  Region: ResolverTypeWrapper<PrismaRegion>;
  RegisterDroneIfNotExistsInput: RegisterDroneIfNotExistsInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AppendPositionInput: AppendPositionInput;
  AssignModelInput: AssignModelInput;
  AssignOperatorInput: AssignOperatorInput;
  Boolean: Scalars['Boolean']['output'];
  CreateDroneModelInput: CreateDroneModelInput;
  CreateSessionInput: CreateSessionInput;
  DateTime: Scalars['DateTime']['output'];
  Drone: PrismaDrone;
  DroneModel: PrismaDroneModel;
  DroneSession: PrismaDroneSession;
  EndSessionInput: EndSessionInput;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Mutation: {};
  Operator: PrismaOperator;
  Position: PrismaPosition;
  Query: {};
  Region: PrismaRegion;
  RegisterDroneIfNotExistsInput: RegisterDroneIfNotExistsInput;
  String: Scalars['String']['output'];
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DroneResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Drone'] = ResolversParentTypes['Drone']> = {
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  model?: Resolver<Maybe<ResolversTypes['DroneModel']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  operator?: Resolver<Maybe<ResolversTypes['Operator']>, ParentType, ContextType>;
  serial?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sessions?: Resolver<Array<ResolversTypes['DroneSession']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DroneModelResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DroneModel'] = ResolversParentTypes['DroneModel']> = {
  drones?: Resolver<Array<ResolversTypes['Drone']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  manufacturer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxRange?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxSpeed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DroneSessionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['DroneSession'] = ResolversParentTypes['DroneSession']> = {
  drone?: Resolver<ResolversTypes['Drone'], ParentType, ContextType>;
  endedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  positions?: Resolver<Array<ResolversTypes['Position']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['Region'], ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  appendPosition?: Resolver<ResolversTypes['Position'], ParentType, ContextType, RequireFields<MutationAppendPositionArgs, 'input'>>;
  assignModel?: Resolver<ResolversTypes['Drone'], ParentType, ContextType, RequireFields<MutationAssignModelArgs, 'input'>>;
  assignOperator?: Resolver<ResolversTypes['Drone'], ParentType, ContextType, RequireFields<MutationAssignOperatorArgs, 'input'>>;
  createDroneModel?: Resolver<ResolversTypes['DroneModel'], ParentType, ContextType, RequireFields<MutationCreateDroneModelArgs, 'input'>>;
  createSession?: Resolver<ResolversTypes['DroneSession'], ParentType, ContextType, RequireFields<MutationCreateSessionArgs, 'input'>>;
  endSession?: Resolver<ResolversTypes['DroneSession'], ParentType, ContextType, RequireFields<MutationEndSessionArgs, 'input'>>;
  registerDroneIfNotExists?: Resolver<ResolversTypes['Drone'], ParentType, ContextType, RequireFields<MutationRegisterDroneIfNotExistsArgs, 'input'>>;
};

export type OperatorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Operator'] = ResolversParentTypes['Operator']> = {
  drones?: Resolver<Array<ResolversTypes['Drone']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  licenseId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PositionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Position'] = ResolversParentTypes['Position']> = {
  altitude?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  heading?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  session?: Resolver<ResolversTypes['DroneSession'], ParentType, ContextType>;
  speed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  drone?: Resolver<ResolversTypes['Drone'], ParentType, ContextType, RequireFields<QueryDroneArgs, 'id'>>;
  droneModel?: Resolver<ResolversTypes['DroneModel'], ParentType, ContextType, RequireFields<QueryDroneModelArgs, 'id'>>;
  droneModels?: Resolver<Array<ResolversTypes['DroneModel']>, ParentType, ContextType>;
  droneSession?: Resolver<ResolversTypes['DroneSession'], ParentType, ContextType, RequireFields<QueryDroneSessionArgs, 'id'>>;
  droneSessions?: Resolver<Array<ResolversTypes['DroneSession']>, ParentType, ContextType>;
  drones?: Resolver<Array<ResolversTypes['Drone']>, ParentType, ContextType>;
  operator?: Resolver<ResolversTypes['Operator'], ParentType, ContextType, RequireFields<QueryOperatorArgs, 'id'>>;
  operators?: Resolver<Array<ResolversTypes['Operator']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Position'], ParentType, ContextType, RequireFields<QueryPositionArgs, 'id'>>;
  positions?: Resolver<Array<ResolversTypes['Position']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['Region'], ParentType, ContextType, RequireFields<QueryRegionArgs, 'id'>>;
  regions?: Resolver<Array<ResolversTypes['Region']>, ParentType, ContextType>;
};

export type RegionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Region'] = ResolversParentTypes['Region']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  regionCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessions?: Resolver<Array<ResolversTypes['DroneSession']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  DateTime?: GraphQLScalarType;
  Drone?: DroneResolvers<ContextType>;
  DroneModel?: DroneModelResolvers<ContextType>;
  DroneSession?: DroneSessionResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Operator?: OperatorResolvers<ContextType>;
  Position?: PositionResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Region?: RegionResolvers<ContextType>;
};

