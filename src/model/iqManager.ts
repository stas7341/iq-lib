import {IRepoCommands, RepoCommandArgument} from "../interface/repoCommands";
import {LogLevel, Message} from "@asmtechno/service-lib";
import EventEmitter from "node:events";
import {buildGroupName, GUID, PREFIX} from "../utils/iqHelper";

export class IQManager extends EventEmitter{
        private queues = new Map<string, string[]>();
        private repoClient: IRepoCommands;
        private readonly ttl: number;
        private readonly asyncLog: boolean;
        constructor(config: {repoClient: IRepoCommands, ttl?: number, asyncLog?: boolean}) {
                super();
                this.repoClient = config.repoClient;
                config.ttl ? this.ttl = config.ttl : this.ttl = 3600;
                config.asyncLog ? this.asyncLog = config.asyncLog : this.asyncLog = true;
        }

        private log = (text, level = LogLevel.trace, metadata?) => {
                this.asyncLog ?
                        setTimeout(() => this.emit("log", text, level, metadata), 0) :
                    this.emit("log", text, level, metadata);
        }

        private raiseEvent = (eventName, metadata?) => {
                setTimeout(() => this.emit(eventName, metadata), 0);
        }

        async createQueue(queueName: string, criteria: string[]): Promise<boolean> {
                this.log("createQueue", LogLevel.trace, {queueName, criteria});
                if(criteria?.length > 0) {
                        this.queues.set(queueName, criteria);
                        return true;
                }
                else {
                        this.log('missing parameters of criteria', LogLevel.error, queueName);
                        return false;
                }
        }

        async deleteQueue(queueName: string): Promise<boolean> {
                this.log("deleteQueue", LogLevel.trace, queueName);
                return this.queues.delete(queueName);
        }

        async addMessageToQueue(queueName: string, msg: Message): Promise<{
                queueName: string,
                groupName: string,
                num: number
        }> {
                this.log("addMessageToQueue", LogLevel.trace, {queueName, msg});
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
                this.raiseEvent('queued', {queueName, groupName, num});
                return {queueName, groupName, num};
        }

        async getListGroupsFromQueue(queueName: string) {
                const fullQueueName = `${PREFIX('queue')}:${queueName}`;
                this.log("getListGroupsFromQueue", LogLevel.trace, queueName);
                return this.repoClient.getAllItemsFromZQ(fullQueueName);
        }

        async getListMessagesFromGroup(groupName: string) {
                this.log("getListMessagesFromGroup", LogLevel.trace, groupName);
                return this.repoClient.getAllFieldsFromHash(groupName);
        }

        async readAllMessageFromQueue(queueName: string) {
                const fullQueueName = `${PREFIX('queue')}:${queueName}`;
                this.log("popupGroupFromQueue", LogLevel.trace, queueName);
                const groupList = await this.repoClient.getAllItemsFromZQ(fullQueueName);
                const allMessages = new Array();
                for (const groupName of groupList) {
                        const msgFromGroup = await this.repoClient.getAllFieldsFromHash(groupName);
                        allMessages.push(msgFromGroup);
                }
                return allMessages;
        }

        async popupGroupFromQueue(queueName: string) {
                const fullQueueName = `${PREFIX('queue')}:${queueName}`;
                this.log("popupGroupFromQueue", LogLevel.trace, queueName);
                // entering critical section queueName
                const groupName = await this.repoClient.popItemFromZQ(fullQueueName, false);
                if(!groupName)
                        return;
                const allMessages = await this.repoClient.getAllFieldsFromHash(groupName?.value);
                await this.repoClient.deleteItem(groupName?.value);
                // end critical section queueName
                return allMessages;
        }

}

export function createIQManager(options:{repoClient: IRepoCommands, ttl?: number, asyncLog?: boolean}): IQManager {
        if(!options?.repoClient)
                throw new Error(`repoClient parameter mandatory`);

        return new IQManager({repoClient: options.repoClient, ttl: options.ttl, asyncLog: options.asyncLog});
}
