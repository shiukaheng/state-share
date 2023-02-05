import { cloneDeep, isEqual, merge } from 'lodash';
import { JSONObject, JSONValue } from './State';

// TODO: Fix types!!!

type Primitive<U> = string | number | boolean | null | Array<U>;

// RecursiveNull - makes all properties of an object null recursively, 
// except for array properties, which will be replaced by one null element
export type RecursiveNull<T> =
    // If T is a primitive, return null
    T extends Primitive<infer U> ? null :
    // If T is an object, make all properties null recursively
    T extends object ? { [K in keyof T]: RecursiveNull<T[K]> } :
    // If T is anything else, remove it
    never;

// RecursivePartial - makes all properties of the type optional recursively
export type RecursivePartial<T> =
    // If T is a primitive, make it optional
    T extends Primitive<infer U> ? T | undefined :
    // If T is an object, make all properties optional recursively or allow it to be undefined
    T extends object ? { [K in keyof T]?: RecursivePartial<T[K]> } | undefined :
    // If T is anything else, remove it
    never;

// DiffResult - the result of a diff operation showing whats modified (including new properties), and whats deleted
export type DiffResult<T extends JSONValue, U extends JSONValue> = {
    // Allow modified to be a union of the two types, since we can add new properties
    modified?: RecursivePartial<T & U>; // This only does intersection on the top level, but its a limitation of typescript
    deleted?: RecursivePartial<RecursiveNull<T>>;
};

type ValueType = 'primitive' | 'object' | 'undefined';

function valueType(value: any): ValueType {
    if (Array.isArray(value) || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return 'primitive';
    }
    if (typeof value === 'object') {
        return 'object';
    }
    if (value === undefined) {
        return 'undefined';
    }
    throw new Error(`Unknown value type: ${value}`);
}

function primitiveEqual(a: JSONValue, b: JSONValue): boolean {
    // If array, use lodash isEqual
    if (Array.isArray(a) && Array.isArray(b)) {
        return isEqual(a, b);
    } else {
        // Else, use strict equality
        return a === b;
    }
}

export function diff<T extends JSONValue, U extends JSONValue>(oldValue: T, newValue: U): DiffResult<T, U> {
    const oldValueType = valueType(oldValue);
    const newValueType = valueType(newValue);
    let modified: RecursivePartial<T & U> | undefined;
    let deleted: RecursivePartial<RecursiveNull<T>> | undefined;
    // 9 possible cases
    // Undefined vs rest (3 cases)
    if (oldValueType === "undefined") {
        if (newValueType === "undefined") {
            // undefined - throw error, should never happen
            throw new Error("Comparing undefined with undefined. Should not happen!")
        } else {
            // else - return modified because we added a new property
            modified = newValue as RecursivePartial<T & U>;
        }
    } else if (newValueType === "undefined") {
        // rest vs undefined (2 cases, since undefined vs undefined is handled above), return deleted
        deleted = null as RecursivePartial<RecursiveNull<T>>;
    } else {
        if (oldValueType !== newValueType) {
            // If types are different (2 cases), return modified
            modified = newValue as RecursivePartial<T & U>;
        } else {
            if (oldValueType === "primitive") {
                if (!primitiveEqual(oldValue, newValue)) {
                    // If primitive and not equal, return modified
                    modified = newValue as RecursivePartial<T & U>;
                }
            } else {
                // Else (object), recurse and merge results
                // Union the keys of the two objects
                const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
                for (const key of keys) {
                    // @ts-ignore - creating new property
                    const oldSubValue = oldValue[key as string];
                    // @ts-ignore - creating new property
                    const newSubValue = newValue[key as string];
                    // Recurse
                    const subDiff = diff(oldSubValue, newSubValue);
                    // Merge the results
                    if (subDiff.modified !== undefined) {
                        // If there are any modified properties, add them to the modified object
                        // If modifiedObject is undefined, set it to an empty object
                        if (modified === undefined) {
                            modified = {} as RecursivePartial<T & U>;
                        }
                        // Add the modified property to the modified object
                        (modified as any)[key] = subDiff.modified as RecursivePartial<T & U>;
                    }
                    if (subDiff.deleted !== undefined) {
                        // If there are any deleted properties, add them to the deleted object
                        // If deletedObject is undefined, set it to an empty object
                        if (deleted === undefined) {
                            deleted = {} as RecursivePartial<RecursiveNull<T>>;
                        }
                        // Add the deleted property to the deleted object
                        (deleted as any)[key] = subDiff.deleted as RecursivePartial<RecursiveNull<T>>;
                    }
                }
            }
        }
    }
    return { modified, deleted };
}

export function mergeDiff<T extends JSONValue, U extends JSONValue>(oldValue: T, diff: DiffResult<T, U>): any {
    // Merge the "modified" object into the state
    const modified = merge(oldValue, diff.modified);
    // Delete the "deleted" properties from the state
    const deleted = recursiveDelete(modified, diff.deleted);
}

function recursiveDelete<T extends JSONValue>(oldValue: T, deleteObject: RecursivePartial<RecursiveNull<T>>): RecursivePartial<T> {
    // Get the type of the old value
    // const oldValueType = valueType(oldValue);
    const deleteObjectType = valueType(deleteObject);
    if (deleteObjectType === "undefined") {
        // If deleteObject is undefined, return the old value
        return oldValue as RecursivePartial<T>;
    } else if (deleteObjectType === "primitive") {
        // If deleteObject is primitive, it implies that it is null and we should delete the old value, so return undefined
        return undefined as RecursivePartial<T>;
    } else {
        // Else, deleteObject is an object, so we need to recurse
        const result: RecursivePartial<T> = {} as RecursivePartial<T>;
        for (const key of Object.keys(deleteObject as object)) {
            (result as any)[key] = recursiveDelete((oldValue as any)[key], (deleteObject as any)[key]);
        }
        return result;
    }
}

// // Recursively delete in state using delete object
// function deleteInPlace<T extends JSONObject>(state: T, deleteObject: RecursivePartial<RecursiveNull<T>>) {
//     for (const key of Object.keys(deleteObject)) {
//         const value = deleteObject[key];
//         if (value === null) {
//             // @ts-ignore - we are sure that the key exists in the state
//             delete state[key];
//         } else {
//             // @ts-ignore - we are sure that the key exists in the state
//             deleteInPlace(state[key] as JSONObject, value);
//         }
//     }
// }

// // merge - takes an object and a diff to recreate the new object
// export function mergeDiffInPlace<T extends JSONObject>(state: T, diff: DiffResult<T>) {
//     // Merge the "modified" object into the state
//     Object.assign(state, diff.modified);
//     // Delete the "deleted" properties from the state
//     deleteInPlace(state, diff.deleted);
// }

// export function mergeDiff<T extends JSONObject>(state: T, diff: DiffResult<T>): JSONObject {
//     // Deep clone the state
//     const newState = cloneDeep(state);
//     // Merge the diff into the new state
//     mergeDiffInPlace(newState, diff);
//     return newState;
// }