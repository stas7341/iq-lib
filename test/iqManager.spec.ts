import { createIQManager, IQManager } from "../src/model/iqManager";
import { IRepoCommands, RepoCommandArgument } from "../src/interface/repoCommands";
import { Message, LogLevel } from "@asmtechno/service-lib";

class MockRepoClient implements IRepoCommands {
    public hashes: Map<string, Map<string, string>> = new Map();
    public zqueues: Map<string, Map<string, number>> = new Map();
    public expirations: Map<string, number> = new Map();

    async addItem(key: RepoCommandArgument, value: RepoCommandArgument): Promise<boolean> {
        return true;
    }
    async getItem(key: RepoCommandArgument): Promise<RepoCommandArgument | null> {
        return null;
    }
    async deleteItem(key: RepoCommandArgument): Promise<boolean> {
        const k = key.toString();
        this.hashes.delete(k);
        return true;
    }
    async searchKeys(pattern: RepoCommandArgument): Promise<RepoCommandArgument[]> {
        return [];
    }
    async isKeyExist(key: RepoCommandArgument): Promise<boolean> {
        return this.hashes.has(key.toString()) || this.zqueues.has(key.toString());
    }
    async popItemFromZQ(queueName: string, zpopmin?: boolean): Promise<{ score: number; value: RepoCommandArgument } | null> {
        const queue = this.zqueues.get(queueName);
        if (!queue || queue.size === 0) {
            return null;
        }
        let selectedKey: string | null = null;
        let selectedScore: number = zpopmin ? Infinity : -Infinity;

        for (const [k, score] of queue.entries()) {
            if (zpopmin) {
                if (score < selectedScore) {
                    selectedScore = score;
                    selectedKey = k;
                }
            } else {
                if (score > selectedScore) {
                    selectedScore = score;
                    selectedKey = k;
                }
            }
        }

        if (selectedKey !== null) {
            queue.delete(selectedKey);
            return { score: selectedScore, value: selectedKey };
        }
        return null;
    }
    async getAllItemsFromZQ(queueName: string): Promise<RepoCommandArgument[]> {
        const queue = this.zqueues.get(queueName);
        if (!queue) return [];
        return Array.from(queue.keys());
    }
    async addItemToZQ(queueName: string, item: RepoCommandArgument | RepoCommandArgument[], priority?: number): Promise<boolean> {
        if (!this.zqueues.has(queueName)) {
            this.zqueues.set(queueName, new Map());
        }
        const queue = this.zqueues.get(queueName)!;
        const key = Array.isArray(item) ? item[0].toString() : item.toString();
        queue.set(key, priority ?? 1);
        return true;
    }
    async removeItemFromZQ(queueName: string, item: RepoCommandArgument): Promise<boolean> {
        const queue = this.zqueues.get(queueName);
        if (!queue) return false;
        return queue.delete(item.toString());
    }
    async getZQLength(queueName: string): Promise<number> {
        return this.zqueues.get(queueName)?.size ?? 0;
    }
    async setExpiration(item: RepoCommandArgument, ttl: number, mode?: "NX" | "XX" | "GT" | "LT"): Promise<boolean> {
        this.expirations.set(item.toString(), ttl);
        return true;
    }
    async addFieldsToHash(...args: any[]): Promise<number> {
        const key = args[0].toString();
        const field = args[1].toString();
        const value = args[2].toString();
        if (!this.hashes.has(key)) {
            this.hashes.set(key, new Map());
        }
        this.hashes.get(key)!.set(field, value);
        return 1;
    }
    async removeFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument | Array<RepoCommandArgument>): Promise<number> {
        const map = this.hashes.get(key.toString());
        if (!map) return 0;
        const f = Array.isArray(field) ? field[0].toString() : field.toString();
        return map.delete(f) ? 1 : 0;
    }
    async isFieldExistInHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<boolean> {
        return this.hashes.get(key.toString())?.has(field.toString()) ?? false;
    }
    async getFieldFromHash(key: RepoCommandArgument, field: RepoCommandArgument): Promise<RepoCommandArgument | null> {
        return this.hashes.get(key.toString())?.get(field.toString()) ?? null;
    }
    async getFieldsFromHash(key: RepoCommandArgument, fields: RepoCommandArgument | Array<RepoCommandArgument>): Promise<RepoCommandArgument[]> {
        const map = this.hashes.get(key.toString());
        if (!map) return [];
        const fList = Array.isArray(fields) ? fields : [fields];
        return fList.map((f) => map.get(f.toString()) || "");
    }
    async getAllFieldsFromHash(key: RepoCommandArgument): Promise<{ [p: string]: RepoCommandArgument }> {
        const map = this.hashes.get(key.toString());
        if (!map) return {};
        const result: { [p: string]: RepoCommandArgument } = {};
        for (const [k, v] of map.entries()) {
            result[k] = v;
        }
        return result;
    }
    async getFieldNamesFromHash(key: RepoCommandArgument): Promise<RepoCommandArgument[]> {
        const map = this.hashes.get(key.toString());
        if (!map) return [];
        return Array.from(map.keys());
    }
    async getNumberOfFieldsInHash(key: RepoCommandArgument): Promise<number> {
        return this.hashes.get(key.toString())?.size ?? 0;
    }
}

describe("IQManager Unit Tests", () => {
    let mockRepo: MockRepoClient;

    beforeEach(() => {
        mockRepo = new MockRepoClient();
    });

    describe("Initialization and Factory", () => {
        it("should throw error if repoClient is missing", () => {
            expect(() => createIQManager({} as any)).toThrow("repoClient parameter mandatory");
            expect(() => createIQManager(null as any)).toThrow("repoClient parameter mandatory");
        });

        it("should initialize correctly with default options", () => {
            const manager = createIQManager({ repoClient: mockRepo });
            expect(manager).toBeInstanceOf(IQManager);
        });

        it("should correctly respect asyncLog=false without coercion", (done) => {
            const manager = createIQManager({ repoClient: mockRepo, asyncLog: false });
            let loggedSync = false;

            manager.on("log", (text, level, metadata) => {
                loggedSync = true;
                expect(text).toBe("createQueue");
                expect(level).toBe(LogLevel.trace);
            });

            manager.createQueue("test-q", ["action"]);
            expect(loggedSync).toBe(true);
            done();
        });

        it("should support asyncLog=true", (done) => {
            const manager = createIQManager({ repoClient: mockRepo, asyncLog: true });
            let loggedSync = false;

            manager.on("log", (text) => {
                expect(text).toBe("createQueue");
                done();
            });

            manager.createQueue("test-q", ["action"]);
            expect(loggedSync).toBe(false);
        });
    });

    describe("Queue Management", () => {
        let manager: IQManager;

        beforeEach(() => {
            manager = createIQManager({ repoClient: mockRepo, asyncLog: false });
        });

        it("should create queue with valid criteria", async () => {
            const result = await manager.createQueue("orders", ["action", "payload/city"]);
            expect(result).toBe(true);
        });

        it("should fail to create queue with missing or empty criteria", async () => {
            const result1 = await manager.createQueue("orders", []);
            expect(result1).toBe(false);

            const result2 = await manager.createQueue("orders", null as any);
            expect(result2).toBe(false);
        });

        it("should fail to create queue with empty queueName", async () => {
            const result = await manager.createQueue("", ["action"]);
            expect(result).toBe(false);
        });

        it("should delete existing queue", async () => {
            await manager.createQueue("orders", ["action"]);
            const deleteResult = await manager.deleteQueue("orders");
            expect(deleteResult).toBe(true);

            const deleteNonExistent = await manager.deleteQueue("orders");
            expect(deleteNonExistent).toBe(false);
        });
    });

    describe("Message Enqueuing & Grouping", () => {
        let manager: IQManager;

        beforeEach(() => {
            manager = createIQManager({ repoClient: mockRepo, asyncLog: false, ttl: 1800 });
        });

        it("should add message and increase priority based on group size", async () => {
            await manager.createQueue("orders", ["action", "payload/region"]);

            const msg1 = new Message("ORDER_DISPATCH", { region: "north", orderId: "1" });
            const msg2 = new Message("ORDER_DISPATCH", { region: "north", orderId: "2" });
            const msg3 = new Message("ORDER_DISPATCH", { region: "south", orderId: "3" });

            const eventPromise = new Promise<{ queueName: string; groupName: string; num: number }>((resolve) => {
                manager.once("queued", resolve);
            });

            const res1 = await manager.addMessageToQueue("orders", msg1);
            expect(res1.queueName).toBe("orders");
            expect(res1.groupName).toBe("iq:group:action:ORDER_DISPATCH:payload/region:north");
            expect(res1.num).toBe(1);

            const eventData = await eventPromise;
            expect(eventData).toEqual(res1);

            // Adding second message to same group
            const res2 = await manager.addMessageToQueue("orders", msg2);
            expect(res2.groupName).toBe("iq:group:action:ORDER_DISPATCH:payload/region:north");
            expect(res2.num).toBe(2);

            // Adding message to different group
            const res3 = await manager.addMessageToQueue("orders", msg3);
            expect(res3.groupName).toBe("iq:group:action:ORDER_DISPATCH:payload/region:south");
            expect(res3.num).toBe(1);

            // Verify TTL set on hash and zqueue
            expect(mockRepo.expirations.get(res1.groupName)).toBe(1800);
            expect(mockRepo.expirations.get("iq:queue:orders")).toBe(1800);
        });

        it("should throw error if message does not match queue criteria", async () => {
            await manager.createQueue("orders", ["payload/nonExistentKey"]);
            const msg = new Message("ORDER_DISPATCH", { region: "north" });

            await expect(manager.addMessageToQueue("orders", msg)).rejects.toThrow(
                "Message format does not meet criteria"
            );
        });
    });

    describe("Reading and Popping Messages", () => {
        let manager: IQManager;

        beforeEach(async () => {
            manager = createIQManager({ repoClient: mockRepo, asyncLog: false });
            await manager.createQueue("tasks", ["action", "payload/priority"]);

            const msg1 = new Message("PROCESS", { priority: "high", taskId: "T1" });
            const msg2 = new Message("PROCESS", { priority: "high", taskId: "T2" });
            const msg3 = new Message("PROCESS", { priority: "low", taskId: "T3" });

            await manager.addMessageToQueue("tasks", msg1);
            await manager.addMessageToQueue("tasks", msg2);
            await manager.addMessageToQueue("tasks", msg3);
        });

        it("should list all groups in queue", async () => {
            const groups = await manager.getListGroupsFromQueue("tasks");
            expect(groups).toHaveLength(2);
            expect(groups).toContain("iq:group:action:PROCESS:payload/priority:high");
            expect(groups).toContain("iq:group:action:PROCESS:payload/priority:low");
        });

        it("should get all messages from specific group", async () => {
            const highGroup = "iq:group:action:PROCESS:payload/priority:high";
            const messages = await manager.getListMessagesFromGroup(highGroup);
            const msgKeys = Object.keys(messages);
            expect(msgKeys).toHaveLength(2);
        });

        it("should read all messages across all groups in queue", async () => {
            const allMessages = await manager.readAllMessageFromQueue("tasks");
            expect(allMessages).toHaveLength(2);
        });

        it("should popup highest priority group first (group with highest message count)", async () => {
            // High group has 2 messages, low group has 1. High group should pop first (ZPOPMAX / score 2).
            const poppedGroup = await manager.popupGroupFromQueue("tasks");
            expect(poppedGroup).toBeDefined();
            const messageList = Object.values(poppedGroup!);
            expect(messageList).toHaveLength(2);

            // The group should now be deleted from repo
            const highGroup = "iq:group:action:PROCESS:payload/priority:high";
            expect(mockRepo.hashes.has(highGroup)).toBe(false);

            // Popping next group
            const nextPopped = await manager.popupGroupFromQueue("tasks");
            expect(nextPopped).toBeDefined();
            expect(Object.values(nextPopped!)).toHaveLength(1);

            // Queue is now empty
            const emptyPopped = await manager.popupGroupFromQueue("tasks");
            expect(emptyPopped).toBeUndefined();
        });

        it("popupGroupFromQueue2 should return groupName and messages", async () => {
            const result = await manager.popupGroupFromQueue2("tasks");
            expect(result).toBeDefined();
            expect(result?.groupName).toBe("iq:group:action:PROCESS:payload/priority:high");
            expect(Object.keys(result!.allMessages)).toHaveLength(2);
        });

        it("popupGroupFromQueue2 should return undefined when queue is empty", async () => {
            await manager.popupGroupFromQueue2("tasks");
            await manager.popupGroupFromQueue2("tasks");
            const result = await manager.popupGroupFromQueue2("tasks");
            expect(result).toBeUndefined();
        });
    });
});
