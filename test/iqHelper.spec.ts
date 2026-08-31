import { PREFIX, getValueByPath, buildGroupName, GUID } from "../src/utils/iqHelper";
import { Message } from "@asmtechno/service-lib";

describe("iqHelper Unit Tests", () => {
    describe("PREFIX", () => {
        it("should format string items with iq: prefix", () => {
            expect(PREFIX("queue")).toBe("iq:queue");
            expect(PREFIX("group")).toBe("iq:group");
        });

        it("should format numeric items with iq: prefix", () => {
            expect(PREFIX(123)).toBe("iq:123");
        });

        it("should handle null and undefined gracefully", () => {
            expect(PREFIX(null as any)).toBe("iq:");
            expect(PREFIX(undefined as any)).toBe("iq:");
            expect(PREFIX()).toBe("iq:");
        });
    });

    describe("getValueByPath", () => {
        const testObj = {
            action: "LOGIN",
            status: "active",
            count: 0,
            enabled: false,
            payload: {
                userId: "user-1234",
                score: 95.5,
                metadata: {
                    ip: "127.0.0.1",
                    device: "mobile"
                },
                nullField: null,
            },
            items: ["apple", "banana"]
        };

        it("should extract top-level properties", () => {
            expect(getValueByPath("action", testObj)).toBe("LOGIN");
            expect(getValueByPath("status", testObj)).toBe("active");
        });

        it("should extract nested properties", () => {
            expect(getValueByPath("payload/userId", testObj)).toBe("user-1234");
            expect(getValueByPath("payload/score", testObj)).toBe("95.5");
            expect(getValueByPath("payload/metadata/ip", testObj)).toBe("127.0.0.1");
        });

        it("should handle falsy values (0, false) correctly", () => {
            expect(getValueByPath("count", testObj)).toBe("0");
            expect(getValueByPath("enabled", testObj)).toBe("false");
        });

        it("should support leading slashes in path", () => {
            expect(getValueByPath("/action", testObj)).toBe("LOGIN");
            expect(getValueByPath("/payload/userId", testObj)).toBe("user-1234");
            expect(getValueByPath("///payload/metadata/ip", testObj)).toBe("127.0.0.1");
        });

        it("should return undefined for non-existent properties", () => {
            expect(getValueByPath("nonExistent", testObj)).toBeUndefined();
            expect(getValueByPath("payload/nonExistent", testObj)).toBeUndefined();
            expect(getValueByPath("payload/metadata/nonExistent", testObj)).toBeUndefined();
        });

        it("should return undefined when intermediate path is missing or null", () => {
            expect(getValueByPath("user/profile/name", testObj)).toBeUndefined();
            expect(getValueByPath("payload/nullField/subField", testObj)).toBeUndefined();
        });

        it("should return undefined when object is null or undefined or primitive", () => {
            expect(getValueByPath("action", null)).toBeUndefined();
            expect(getValueByPath("action", undefined)).toBeUndefined();
            expect(getValueByPath("action", "some-string" as any)).toBeUndefined();
            expect(getValueByPath("action", 123 as any)).toBeUndefined();
        });

        it("should return undefined when target value is an object (not a scalar)", () => {
            expect(getValueByPath("payload", testObj)).toBeUndefined();
            expect(getValueByPath("payload/metadata", testObj)).toBeUndefined();
        });

        it("should throw an Error for invalid or empty path parameter", () => {
            expect(() => getValueByPath("", testObj)).toThrow("Get path failed, bad parameter");
            expect(() => getValueByPath("///", testObj)).toThrow("Get path failed, bad parameter");
            expect(() => getValueByPath(null as any, testObj)).toThrow("Get path failed, bad parameter");
            expect(() => getValueByPath(123 as any, testObj)).toThrow("Get path failed, bad parameter");
        });
    });

    describe("buildGroupName", () => {
        it("should construct group name from single criterion", () => {
            const msg = new Message("USER_LOGIN", { userId: "u1" });
            const groupName = buildGroupName(msg, ["action"]);
            expect(groupName).toBe("iq:group:action:USER_LOGIN");
        });

        it("should construct group name from multiple criteria", () => {
            const msg = new Message("USER_LOGIN", { tenantId: "t123", region: "eu-west" });
            const groupName = buildGroupName(msg, ["action", "payload/tenantId", "payload/region"]);
            expect(groupName).toBe("iq:group:action:USER_LOGIN:payload/tenantId:t123:payload/region:eu-west");
        });

        it("should construct group name when only some criteria match", () => {
            const msg = new Message("USER_LOGIN", { tenantId: "t123" });
            const groupName = buildGroupName(msg, ["action", "payload/tenantId", "payload/missingKey"]);
            expect(groupName).toBe("iq:group:action:USER_LOGIN:payload/tenantId:t123");
        });

        it("should throw error if criteria does not match any fields in the message", () => {
            const msg = new Message("USER_LOGIN", { other: "val" });
            expect(() => buildGroupName(msg, ["payload/nonExistentKey", "payload/anotherMissing"])).toThrow(
                "Message format does not meet criteria"
            );
        });

        it("should throw error for empty or invalid criteria", () => {
            const msg = new Message("USER_LOGIN", { tenantId: "t1" });
            expect(() => buildGroupName(msg, [])).toThrow("Message format does not meet criteria");
            expect(() => buildGroupName(msg, null as any)).toThrow("Message format does not meet criteria");
        });

        it("should throw error for null or invalid message", () => {
            expect(() => buildGroupName(null as any, ["action"])).toThrow("Message format does not meet criteria");
            expect(() => buildGroupName(undefined as any, ["action"])).toThrow("Message format does not meet criteria");
        });
    });

    describe("GUID", () => {
        it("should return a valid UUID v4 string", () => {
            const id = GUID();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuidRegex.test(id)).toBe(true);
        });

        it("should generate unique IDs across multiple invocations", () => {
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(GUID());
            }
            expect(ids.size).toBe(100);
        });
    });
});
