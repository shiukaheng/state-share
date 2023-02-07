import { z } from "zod";

// Generic message types

export const messageTypeSchema = z.union([
    z.literal("state"),
    z.literal("requestFullState"),
])
export type MessageType = z.infer<typeof messageTypeSchema>;

/**
 * Meta information about a message
 */
export const metaMessageSchema = z.object({
    timestamp: z.number(),
    messageType: messageTypeSchema,
    source: z.array(z.string()), // Allow for multiple updates to be combined by the server (not implemented yet)
    dest: z.union([
        z.array(z.string()),
        z.literal("*")
    ]), // Allow multiple clients to receive the same message
});

export type MessageMeta = z.infer<typeof metaMessageSchema>;

/**
 * Message requesting the full state
 * Could be:
 * - New client joining sending to server -> Server needs to process the message and send the unioned full state message from all clients
 * - Server broadcasting to all clients -> Client needs to process the message and send a full state message
 */
export const requestFullStateMessageSchema = z.object({
    requestFullState: z.literal(true),
});
export type requestFullStateMessage = z.infer<typeof requestFullStateMessageSchema>;

/**
 * Message containing the partial state
 */
export const stateMessageSchema = z.object({
    modified: z.record(z.unknown()).optional(),
    deleted: z.record(z.unknown()).optional(),
});
export type StateMessage = z.infer<typeof stateMessageSchema>;

export type WithMeta<T> = T & MessageMeta;
export type Message<T> = {data: T} & MessageMeta