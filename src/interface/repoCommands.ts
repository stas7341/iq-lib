export type RepoCommandArgument = string | Buffer;

type Types = RepoCommandArgument | number;
type HSETObject = Record<string | number, Types>;
type HSETMap = Map<Types, Types>;
type HSETTuples = Array<[Types, Types]> | Array<Types>;
type GenericArguments = [key: RepoCommandArgument];
export type SingleFieldArguments = [...generic: GenericArguments, field: Types, value: Types];
export type MultipleFieldsArguments = [...generic: GenericArguments, value: HSETObject | HSETMap | HSETTuples];

export interface IRepoCommands {
    addItem(key: RepoCommandArgument, value: RepoCommandArgument): Promise<boolean>;

    getItem(key: RepoCommandArgument): Promise<RepoCommandArgument | null>;

    deleteItem(key: RepoCommandArgument): Promise<boolean>;

    searchKeys(pattern: RepoCommandArgument): Promise<RepoCommandArgument[]>;

    isKeyExist(key: RepoCommandArgument): Promise<boolean>;

    popItemFromZQ(queueName: string, zpopmin?: boolean): Promise<{ score: number, value: RepoCommandArgument } | null>;

    getAllItemsFromZQ(queueName: string): Promise<RepoCommandArgument[]>;

    addItemToZQ(queueName: string, item: RepoCommandArgument | RepoCommandArgument[], priority?: number): Promise<boolean>;

    removeItemFromZQ(queueName: string, item: RepoCommandArgument): Promise<boolean>;

    getZQLength(queueName: string): Promise<number>;

    setExpiration(item: RepoCommandArgument, ttl: number, mode?: "NX" | "XX" | "GT" | "LT"): Promise<boolean>;

    addFieldsToHash(...[key, value, fieldValue]: SingleFieldArguments | MultipleFieldsArguments): Promise<number>;

    removeFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument | Array<RepoCommandArgument>): Promise<number>;

    isFieldExistInHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<boolean>;

    getFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<RepoCommandArgument | null>;

    getFieldsFromHash(key: RepoCommandArgument, fields: RepoCommandArgument | Array<RepoCommandArgument>): Promise<RepoCommandArgument[]>

    getAllFieldsFromHash(key: RepoCommandArgument): Promise<{ [p: string]: RepoCommandArgument}>

    getFieldNamesFromHash(key: RepoCommandArgument): Promise<RepoCommandArgument[]>;

    getNumberOfFieldsInHash(key: RepoCommandArgument): Promise<number>;
}
