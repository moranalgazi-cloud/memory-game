import { FALLBACK_ICE_SERVERS } from "./ice-servers.js";

/**
 * @typedef {{
 *   onOpen: () => void;
 *   onClose: () => void;
 *   onMessage: (data: string) => void;
 *   onError?: (err: Error) => void;
 * }} DataChannelHandlers
 */

/**
 * @param {boolean} isHost
 * @param {DataChannelHandlers} handlers
 * @param {RTCIceServer[]} [iceServers]
 */
export function createGameConnection(isHost, handlers, iceServers = FALLBACK_ICE_SERVERS) {
  const pc = new RTCPeerConnection({ iceServers });
  /** @type {RTCDataChannel | null} */
  let dc = null;

  /**
   * @param {RTCDataChannel} channel
   */
  function wireChannel(channel) {
    dc = channel;
    channel.binaryType = "arraybuffer";
    channel.onopen = () => handlers.onOpen();
    channel.onclose = () => handlers.onClose();
    channel.onerror = () => handlers.onError?.(new Error("Data channel error"));
    channel.onmessage = (ev) => {
      const text = typeof ev.data === "string" ? ev.data : "";
      if (text) handlers.onMessage(text);
    };
  }

  if (isHost) {
    wireChannel(pc.createDataChannel("game", { ordered: true }));
  } else {
    pc.ondatachannel = (ev) => wireChannel(ev.channel);
  }

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      handlers.onClose();
    }
  };

  return {
    pc,
    /**
     * @param {string} text
     */
    send(text) {
      if (dc?.readyState === "open") dc.send(text);
    },
    /** @returns {Promise<RTCSessionDescriptionInit>} */
    async createOffer() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    },
    /**
     * @param {RTCSessionDescriptionInit} offer
     * @returns {Promise<RTCSessionDescriptionInit>}
     */
    async acceptOffer(offer) {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    /**
     * @param {RTCSessionDescriptionInit} answer
     */
    async acceptAnswer(answer) {
      await pc.setRemoteDescription(answer);
    },
    /**
     * @param {RTCIceCandidateInit} candidate
     */
    async addIce(candidate) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore late candidates */
      }
    },
    close() {
      try {
        dc?.close();
        pc.close();
      } catch {
        /* ignore */
      }
    },
  };
}
