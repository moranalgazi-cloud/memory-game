import { getSupabaseClient } from "../cloud-sync.js";

/**
 * @typedef {{
 *   onSignal: (payload: { from: string; type: string; data?: unknown }) => void;
 *   onStatus?: (status: string) => void;
 * }} SignalingHandlers
 */

/**
 * @param {string} roomId
 * @param {string} playerId
 * @param {SignalingHandlers} handlers
 */
export function createSignalingChannel(roomId, playerId, handlers) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const channel = supabase.channel(`memory-room:${roomId}`, {
    config: { broadcast: { ack: false, self: false } },
  });

  channel
    .on("broadcast", { event: "signal" }, (msg) => {
      const payload = msg.payload;
      if (!payload || typeof payload !== "object") return;
      const from = /** @type {{ from?: string }} */ (payload).from;
      if (!from || from === playerId) return;
      handlers.onSignal(/** @type {{ from: string; type: string; data?: unknown }} */ (payload));
    })
    .subscribe((status) => {
      handlers.onStatus?.(status);
    });

  return {
    /**
     * @param {string} type
     * @param {unknown} [data]
     */
    send(type, data) {
      channel.send({
        type: "broadcast",
        event: "signal",
        payload: { from: playerId, type, data },
      });
    },
    /** @returns {Promise<void>} */
    async close() {
      await supabase.removeChannel(channel);
    },
  };
}
