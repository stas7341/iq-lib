/*
Use cases:
1. application uses no subscribers
1.1 on IQ creation, manager will call createQueue with criteria
1.2 on queueing message, IQ mng will call group manager to procedure msg.payload+criteria where result be
a new or an existing group that message queued in
1.3 on popup group, IQ mng will fetch all messages and return all of them

2. application uses http subscribers
2.1 on http request subscriber, where subscriber will define the notification transport and criteria
2.2 application will manage subscribers and will start to listen on requested amqp queue
2.3 same as above 1.1
2.4 on message arrives to amqp, application will call IQ mng to add message to queue
2.5.same as 1.2
2.6 on success 2.5, application should notify client according to the subscription
2.7 on http request of popup, same as 1.3 in addition the invokeId(transaction), according for the option
of recovery the application will moved this group to pending queue
2.8 on request of transaction completed the IQ mng will delete permanently all messages in pending group
2.9 scheduler service of application will check all pending group for expiry time
 */

import {amqpService, Message, redisService} from "service-libs";
import {createIQManager} from "../src";
import {
    IRepoCommands,
    MultipleFieldsArguments,
    RepoCommandArgument,
    SingleFieldArguments
} from "../src/interface/repoCommands";

const main = async() => {

    const redis = redisService.getInstance();
    const amqp = amqpService.getInstance();
    await amqp.init({
        username: 'guest', password: 'guest', host: 'localhost', prefetch: 1, options_durable: true, options_noAck: false
    });
    await redis.init({
        user: "default", password: "r3d1s!", host: "127.0.0.1", port: 6379, connect_timeout: 300, enable_offline_queue: false, retry_strategy: true
    });

    const repo = createRepo("redis", redis);

    const iqMng = createIQManager({repoClient: repo});

    await iqMng.createQueue("test", ["/action","/payload/eventId"]);

    await iqMng.addMessageToQueue("test", new Message('test1', {eventId: 12345}));
    await iqMng.addMessageToQueue("test", new Message('test2', {eventId: 12345}));
    await iqMng.addMessageToQueue("test", new Message('test1', {eventId: 12346}));
    await iqMng.addMessageToQueue("test", new Message('test2', {eventId: 12345}));

    const listGroups = await iqMng.getListGroupsFromQueue("test");
    console.log(JSON.stringify(listGroups));
    let listGroupMessages = await iqMng.getListMessagesFromGroup(listGroups[0]);
    console.log(JSON.stringify(listGroupMessages));
    const popupGroup = await iqMng.popupGroupFromQueue("test");
    console.log(JSON.stringify(popupGroup));
    listGroupMessages = await iqMng.getListMessagesFromGroup(listGroups[0]);
    console.log(JSON.stringify(listGroupMessages));

}

function createRepo(type, instance): IRepoCommands {
    class repoRedis implements IRepoCommands {
        async addItem(key: RepoCommandArgument, value: RepoCommandArgument): Promise<boolean> {return instance.addItem(key, value)}
        async getItem(key: RepoCommandArgument): Promise<RepoCommandArgument | null> {return instance.getItem(key)}
        async deleteItem(key: RepoCommandArgument): Promise<boolean> {return instance.deleteItem(key)}
        async searchKeys(pattern: RepoCommandArgument): Promise<RepoCommandArgument[]> {return instance.searchKeys(pattern)}
        async isKeyExist(key: RepoCommandArgument): Promise<boolean> {return instance.isKeyExist(key)}
        async popItemFromZQ(queueName: string, zpopmin?: boolean): Promise<{ score: number, value: RepoCommandArgument } | null> {
            return instance.popItemFromZQ(queueName, zpopmin);
        }
        async getAllItemsFromZQ(queueName: string): Promise<RepoCommandArgument[]> {return instance.getAllItemsFromZQ(queueName)}
        async addItemToZQ(queueName: string, item: RepoCommandArgument | RepoCommandArgument[], priority?: number): Promise<boolean> {
            return instance.addItemToZQ(queueName, item, priority);
        }
        async removeItemFromZQ(queueName: string, item: RepoCommandArgument): Promise<boolean> {return instance.removeItemFromZQ(queueName, item)}
        async getZQLength(queueName: string): Promise<number> {return instance.getZQLength(queueName)}
        async setExpiration(item: RepoCommandArgument, ttl: number, mode?: "NX" | "XX" | "GT" | "LT"): Promise<boolean> {
            return instance.setExpiration(item, ttl, mode);
        }
        async addFieldsToHash(...[key, value, fieldValue]: SingleFieldArguments | MultipleFieldsArguments): Promise<number> {
            return instance.addFieldsToHash(...[key, value, fieldValue]);
        }
        async removeFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument | Array<RepoCommandArgument>): Promise<number> {
            return instance.removeFieldFromHash(key, field);
        }
        async isFieldExistInHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<boolean> {
            return instance.isFieldExistInHash(key,field);
        }
        async getFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<RepoCommandArgument | null> {
            return instance.getFieldFromHash(key, field);
        }
        async getFieldsFromHash(key: RepoCommandArgument, fields: RepoCommandArgument | Array<RepoCommandArgument>): Promise<RepoCommandArgument[]> {
            return instance.getFieldsFromHash(key, fields);
        }
        async getAllFieldsFromHash(key: RepoCommandArgument): Promise<{ [p: string]: RepoCommandArgument}> {
            return instance.getAllFieldsFromHash(key);
        }
        async getFieldNamesFromHash(key: RepoCommandArgument): Promise<RepoCommandArgument[]> {return instance.getFieldNamesFromHash(key)}
        async getNumberOfFieldsInHash(key: RepoCommandArgument): Promise<number> {return instance.getNumberOfFieldsInHash(key)}
    }
    return type === "redis" ? new repoRedis() : {} as IRepoCommands;
}

main().then(res => console.log('started'));

