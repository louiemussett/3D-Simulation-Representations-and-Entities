import { validateProtocolMessage } from "../../src/documentary/schemas.js";

export function parseMessage(raw, maximum = 1048576) { if (Buffer.byteLength(raw, "utf8") > maximum) throw new Error("message-too-large"); let message; try { message = JSON.parse(raw); } catch { throw new Error("invalid-json"); } const validation = validateProtocolMessage(message); if (!validation.valid) throw new Error(validation.errors.join(",")); return message; }
export const response = (type, requestId, payload = {}) => ({ schemaVersion: 1, type, requestId, ...payload });
