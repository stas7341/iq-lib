import { Message } from "@asmtechno/service-lib";
import { randomUUID } from "node:crypto";

export const PREFIX = (item?: string | number | null): string => {
    if (item === null || item === undefined) {
        return 'iq:';
    }
    return `iq:${item.toString()}`;
};

export const getValueByPath = (key: string, val: any): string | undefined => {
    if (typeof key !== 'string') {
        throw new Error('Get path failed, bad parameter');
    }

    const trimmedKey = key.replace(/^\/+/, '');
    if (trimmedKey.length === 0) {
        throw new Error('Get path failed, bad parameter');
    }

    const keys = trimmedKey.split('/');
    let current: any = val;

    for (const k of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
        }
        if (!(k in current) || current[k] === undefined) {
            return undefined;
        }
        current = current[k];
    }

    if (current === null || current === undefined || typeof current === 'object') {
        return undefined;
    }

    return current.toString();
};

export const buildGroupName = (message: Message, criteria: string[]): string => {
    if (!message || typeof message !== 'object') {
        throw new Error('Message format does not meet criteria');
    }
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        throw new Error('Message format does not meet criteria');
    }

    let groupName = '';
    for (const path of criteria) {
        if (!path || typeof path !== 'string') {
            continue;
        }
        const valueByPath = getValueByPath(path, message);
        if (valueByPath !== undefined && valueByPath !== null && valueByPath !== '') {
            groupName += `:${path}:${valueByPath}`;
        }
    }

    if (groupName.length <= 1) {
        throw new Error('Message format does not meet criteria');
    }

    return `${PREFIX('group')}${groupName}`;
};

export const GUID = (): string => {
    if (typeof randomUUID === 'function') {
        return randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
