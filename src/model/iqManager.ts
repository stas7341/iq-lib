import {IRepoCommands} from "../interface/repoCommands";
import {Message} from "service-libs";

export class IQManager {
        protected repoClient: IRepoCommands | undefined;
        constructor(config: {repoClient: IRepoCommands}) {
        }

        async createQueue(queueName: string, criteria: string[]) {
                // subscriber
        }

        async deleteQueue(queueName: string) {

        }

        async addMessageToQueue(queueName: string, msg: Message) {

        }

        async getListGroupsFromQueue(queueName: string) {

        }

        async getListMessagesFromGroup(groupName: string) {

        }

        async popupGroupFromQueue(queueName: string) {

        }

}

