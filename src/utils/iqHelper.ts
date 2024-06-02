import {Message} from "service-libs";

export const buildGroupName = (message: Message, criteria: string []): string => {
    let groupName = 'group';
    for (const path of criteria) {
        const valueByPath = getValueByPath(path, message);
        if (valueByPath?.length && valueByPath?.toLowerCase() !== '[object object]') {
            groupName += `:${path}:${valueByPath}`;
        }
    }
    if(groupName.length === String('group').length)
        throw new Error(`Message format does not meet criteria`)
    return groupName;
}

export const getValueByPath = (key: string, val: object): any => {
    const keys = key.replace(/^\/+/, '').split('/');
    if (keys.length === 0)
        throw ('Get path failed, bad parameter');

    for (const k of keys) {
        if (val[k] === undefined) {
            return val.toString();
        }
        val = val[k];
    }
    return val.toString();
}

export const GUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}
