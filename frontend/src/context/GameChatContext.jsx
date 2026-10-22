import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { GameChatContext } from "./gameChatContext";
import api from "../services/api";
import { getUserIdFromToken } from "../utils/jwt";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://nexplaybackend.onrender.com/api/v1";
const socketUrl = new URL(apiBaseUrl).origin;

export function GameChatProvider({ children }) {
  const { token } = useAuth();
  const [socketState, setSocketState] = useState({ token: null, socket: null });
  const [unreadState, setUnreadState] = useState({ token: null, counts: {} });
  const [connectionState, setConnectionState] = useState({
    token: null,
    status: "disconnected"
  });
  const activeGameIdRef = useRef(null);
  const memberGameIdsRef = useRef(new Set());
  const socketRef = useRef(null);
  const userId = getUserIdFromToken(token || "");
  const socket = socketState.token === token ? socketState.socket : null;
  const unreadCounts = useMemo(
    () => unreadState.token === token ? unreadState.counts : {},
    [token, unreadState]
  );
  const connectionStatus = connectionState.token === token
    ? connectionState.status
    : "disconnected";

  const refreshMembership = useCallback(async () => {
    if (!token) return;
    try {
      const [createdGames, joinedGames] = await Promise.all([
        api.get("/games/my-games"),
        api.get("/games/joined-games")
      ]);
      const nextIds = new Set(
        [...createdGames.data.games, ...joinedGames.data.games]
          .filter((game) => game.status !== "Cancelled")
          .map((game) => game._id)
      );
      const chatSocket = socketRef.current;
      if (chatSocket) {
        for (const gameId of memberGameIdsRef.current) {
          if (!nextIds.has(gameId)) chatSocket.emit("game:leave", { gameId });
        }
        for (const gameId of nextIds) {
          if (!memberGameIdsRef.current.has(gameId)) {
            chatSocket.emit("game:join", { gameId });
          }
        }
      }
      memberGameIdsRef.current = nextIds;
    } catch (error) {
      console.error("Could not refresh game chat memberships:", error);
    }
  }, [token]);

  const markRead = useCallback((gameId) => {
    setUnreadState((current) => {
      if (current.token !== token || !current.counts[gameId]) return current;
      const counts = { ...current.counts };
      delete counts[gameId];
      return { token, counts };
    });
  }, [token]);

  const setActiveGameId = useCallback((gameId) => {
    activeGameIdRef.current = gameId;
    if (gameId) markRead(gameId);
  }, [markRead]);

  useEffect(() => {
    if (!token) {
      memberGameIdsRef.current = new Set();
      return undefined;
    }

    let active = true;
    async function connectChat() {
      try {
        const [createdGames, joinedGames] = await Promise.all([
          api.get("/games/my-games"),
          api.get("/games/joined-games")
        ]);
        if (!active) return;

        memberGameIdsRef.current = new Set(
          [...createdGames.data.games, ...joinedGames.data.games]
            .filter((game) => game.status !== "Cancelled")
            .map((game) => game._id)
        );
        const chatSocket = io(socketUrl, { auth: { token } });
        socketRef.current = chatSocket;
        setSocketState({ token, socket: chatSocket });

        chatSocket.on("connect", () => {
          setConnectionState({ token, status: "connected" });
          for (const gameId of memberGameIdsRef.current) {
            chatSocket.emit("game:join", { gameId }, (result) => {
              if (!result?.ok) memberGameIdsRef.current.delete(gameId);
            });
          }
        });

        chatSocket.on("disconnect", () =>
          setConnectionState({ token, status: "reconnecting" })
        );
        chatSocket.on("connect_error", () =>
          setConnectionState({ token, status: "reconnecting" })
        );

        chatSocket.on("game:message", ({ message }) => {
          const gameId = message?.gameId?.toString();
          const senderId = message?.senderId?._id?.toString() || message?.senderId?.toString();
          if (
            gameId &&
            senderId !== userId &&
            activeGameIdRef.current !== gameId
          ) {
            setUnreadState((current) => {
              const counts = current.token === token ? current.counts : {};
              return {
                token,
                counts: { ...counts, [gameId]: (counts[gameId] || 0) + 1 }
              };
            });
          }
        });

        chatSocket.on("game:access-revoked", ({ gameId }) => {
          memberGameIdsRef.current.delete(gameId);
          setUnreadState((current) => {
            if (current.token !== token) return current;
            const counts = { ...current.counts };
            delete counts[gameId];
            return { token, counts };
          });
        });
      } catch (error) {
        if (active) {
          setConnectionState({ token, status: "disconnected" });
          console.error("Could not initialize game chat memberships:", error);
        }
      }
    }

    connectChat();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      memberGameIdsRef.current = new Set();
    };
  }, [token, userId]);

  const value = useMemo(
    () => ({
      socket,
      unreadCounts,
      connectionStatus,
      markRead,
      setActiveGameId,
      refreshMembership
    }),
    [socket, unreadCounts, connectionStatus, markRead, setActiveGameId, refreshMembership]
  );

  return <GameChatContext.Provider value={value}>{children}</GameChatContext.Provider>;
}
