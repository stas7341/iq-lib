import { IRepoCommands, RepoCommandArgument } from "../interface/repoCommands";
import { LogLevel, Message } from "@asmtechno/service-lib";
import EventEmitter from "node:events";
import { buildGroupName, GUID, PREFIX } from "../utils/iqHelper";

export interface IIQManagerConfig {
    repoClient: IRepoCommands;
    ttl?: number;
    asyncLog?: boolean;
}

export interface IQueueMessageResult {
    queueName: string;
    groupName: string;
    num: number;
}

export interface IPopupGroupResult {
    groupName: RepoCommandArgument;
    allMessages: { [p: string]: RepoCommandArgument };
}

export class IQManager extends EventEmitter {
    private queues = new Map<string, string[]>();
    private repoClient: IRepoCommands;
    private readonly ttl: number;
    private readonly asyncLog: boolean;

    constructor(config: IIQManagerConfig) {
        super();
        this.repoClient = config.repoClient;
        this.ttl = config.ttl ?? 3600;
        this.asyncLog = config.asyncLog ?? true;
    }

    private log = (text: string, level: LogLevel = LogLevel.trace, metadata?: any): void => {
        if (this.asyncLog) {
            setTimeout(() => this.emit("log", text, level, metadata), 0);
        } else {
            this.emit("log", text, level, metadata);
        }
    };

    private raiseEvent = (eventName: string, metadata?: any): void => {
        setTimeout(() => this.emit(eventName, metadata), 0);
    };

    async createQueue(queueName: string, criteria: string[]): Promise<boolean> {
        this.log("createQueue", LogLevel.trace, { queueName, criteria });
        if (!queueName || typeof queueName !== 'string') {
            this.log('missing or invalid queueName', LogLevel.error, queueName);
            return false;
        }
        if (criteria && Array.isArray(criteria) && criteria.length > 0) {
            this.queues.set(queueName, criteria);
            return true;
        } else {
            this.log('missing parameters of criteria', LogLevel.error, queueName);
            return false;
        }
    }

    async deleteQueue(queueName: string): Promise<boolean> {
        this.log("deleteQueue", LogLevel.trace, queueName);
        return this.queues.delete(queueName);
    }

    async addMessageToQueue(queueName: string, msg: Message): Promise<IQueueMessageResult> {
        this.log("addMessageToQueue", LogLevel.trace, { queueName, msg });
        const criteria = this.queues.get(queueName) || [];
        const groupName = buildGroupName(msg, criteria);
        const fullQueueName = `${PREFIX('queue')}:${queueName}`;
        // entering critical section of queueName
        await this.repoClient.addFieldsToHash(groupName, GUID(), JSON.stringify(msg));
        const num = await this.repoClient.getNumberOfFieldsInHash(groupName);
        await this.repoClient.setExpiration(groupName, this.ttl);
        await this.repoClient.addItemToZQ(fullQueueName, groupName, num);
        await this.repoClient.setExpiration(fullQueueName, this.ttl);
        // end critical section of queueName
        this.raiseEvent('queued', { queueName, groupName, num });
        return { queueName, groupName, num };
    }

    async getListGroupsFromQueue(queueName: string): Promise<RepoCommandArgument[]> {
        const fullQueueName = `${PREFIX('queue')}:${queueName}`;
        this.log("getListGroupsFromQueue", LogLevel.trace, queueName);
        return this.repoClient.getAllItemsFromZQ(fullQueueName);
    }

    async getListMessagesFromGroup(groupName: string): Promise<{ [p: string]: RepoCommandArgument }> {
        this.log("getListMessagesFromGroup", LogLevel.trace, groupName);
        return this.repoClient.getAllFieldsFromHash(groupName);
    }

    async readAllMessageFromQueue(queueName: string): Promise<Array<{ [p: string]: RepoCommandArgument }>> {
        const fullQueueName = `${PREFIX('queue')}:${queueName}`;
        this.log("readAllMessageFromQueue", LogLevel.trace, queueName);
        const groupList = await this.repoClient.getAllItemsFromZQ(fullQueueName);
        const allMessages: Array<{ [p: string]: RepoCommandArgument }> = [];
        for (const groupName of groupList) {
            const msgFromGroup = await this.repoClient.getAllFieldsFromHash(groupName);
            allMessages.push(msgFromGroup);
        }
        return allMessages;
    }

    async popupGroupFromQueue(queueName: string): Promise<{ [p: string]: RepoCommandArgument } | undefined> {
        const fullQueueName = `${PREFIX('queue')}:${queueName}`;
        this.log("popupGroupFromQueue", LogLevel.trace, queueName);
        // entering critical section queueName
        const groupItem = await this.repoClient.popItemFromZQ(fullQueueName, false);
        if (!groupItem || !groupItem.value) {
            return undefined;
        }
        const allMessages = await this.repoClient.getAllFieldsFromHash(groupItem.value);
        await this.repoClient.deleteItem(groupItem.value);
        // end critical section queueName
        return allMessages;
    }

    async popupGroupFromQueue2(queueName: string): Promise<IPopupGroupResult | undefined> {
        const fullQueueName = `${PREFIX('queue')}:${queueName}`;
        this.log("popupGroupFromQueue2", LogLevel.trace, queueName);
        // entering critical section queueName
        const groupItem = await this.repoClient.popItemFromZQ(fullQueueName, false);
        if (!groupItem || !groupItem.value) {
            return undefined;
        }
        const allMessages = await this.repoClient.getAllFieldsFromHash(groupItem.value);
        await this.repoClient.deleteItem(groupItem.value);
        // end critical section queueName
        return { groupName: groupItem.value, allMessages };
    }
}

export function createIQManager(options: IIQManagerConfig): IQManager {
    if (!options?.repoClient) {
        throw new Error(`repoClient parameter mandatory`);
    }

    return new IQManager({ repoClient: options.repoClient, ttl: options.ttl, asyncLog: options.asyncLog });
}
