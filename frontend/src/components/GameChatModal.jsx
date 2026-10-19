import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useGameChat } from "../hooks/useGameChat";
import api from "../services/api";

const PAGE_SIZE = 40;

function mergeMessages(current, incoming) {
    const messagesById = new Map(current.map((message) => [message._id, message]));
    incoming.forEach((message) => {
        for (const [messageId, existingMessage] of messagesById) {
            if (
                message.clientMessageId &&
                existingMessage.clientMessageId === message.clientMessageId
            ) {
                messagesById.delete(messageId);
            }
        }
        messagesById.set(message._id, message);
    });
    return [...messagesById.values()].sort(
        (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
    );
}

function getUserIdFromToken(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(payload));
        return typeof decoded.userId === "string" ? decoded.userId : "";
    } catch {
        return "";
    }
}

function GameChatModal({ game, onClose }) {
    const { token } = useContext(AuthContext);
    const { socket, connectionStatus, markRead, setActiveGameId } = useGameChat();
    const [messages, setMessages] = useState([]);
    const currentUserId = getUserIdFromToken(token || "");
    const [content, setContent] = useState("");
    const [chatJoined, setChatJoined] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [accessRevoked, setAccessRevoked] = useState(false);
    const [error, setError] = useState("");
    const messagesContainerRef = useRef(null);
    const shouldScrollToBottomRef = useRef(true);
    const preserveScrollRef = useRef(null);
    const initialHistoryLoadedRef = useRef(false);
    const chatReady = chatJoined && Boolean(socket?.connected);

    const loadLatestMessages = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const response = await api.get(`/games/${game._id}/messages`, {
                params: { limit: PAGE_SIZE }
            });
            setMessages((current) => mergeMessages(current, response.data.messages));
            setHasMore(response.data.hasMore);
            setError("");
            if (!initialHistoryLoadedRef.current) {
                shouldScrollToBottomRef.current = true;
                initialHistoryLoadedRef.current = true;
            }
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Could not load chat history."
            );
        } finally {
            setHistoryLoading(false);
        }
    }, [game._id]);

    useEffect(() => {
        setActiveGameId(game._id);
        markRead(game._id);
        return () => setActiveGameId(null);
    }, [game._id, markRead, setActiveGameId]);

    useEffect(() => {
        if (!socket) return undefined;

        let active = true;
        const joinChat = () => {
            setChatJoined(false);
            socket.emit("game:join", { gameId: game._id }, async (result) => {
                if (!active) return;
                if (!result?.ok) {
                    setError(result?.message || "Unable to join this game's chat.");
                    return;
                }
                setChatJoined(true);
                setAccessRevoked(false);
                await loadLatestMessages();
            });
        };
        const handleMessage = ({ message, clientMessageId }) => {
            if (message?.gameId?.toString() !== game._id) return;
            const container = messagesContainerRef.current;
            const nearBottom = !container ||
                container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            shouldScrollToBottomRef.current = nearBottom;
            markRead(game._id);
            setMessages((current) =>
                mergeMessages(current, [{ ...message, clientMessageId }])
            );
        };
        const handleAccessRevoked = ({ gameId }) => {
            if (gameId !== game._id) return;
            setChatJoined(false);
            setAccessRevoked(true);
            setError("You no longer have access to this game's chat.");
        };
        const handleConnectError = () => {
            setChatJoined(false);
            setError("Could not connect to chat. Reconnecting...");
        };
        const handleDisconnect = () => setChatJoined(false);

        socket.on("connect", joinChat);
        socket.on("game:message", handleMessage);
        socket.on("game:access-revoked", handleAccessRevoked);
        socket.on("connect_error", handleConnectError);
        socket.on("disconnect", handleDisconnect);
        if (socket.connected) joinChat();

        return () => {
            active = false;
            socket.off("connect", joinChat);
            socket.off("game:message", handleMessage);
            socket.off("game:access-revoked", handleAccessRevoked);
            socket.off("connect_error", handleConnectError);
            socket.off("disconnect", handleDisconnect);
        };
    }, [game._id, loadLatestMessages, markRead, socket]);

    useLayoutEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (preserveScrollRef.current) {
            const { scrollHeight, scrollTop } = preserveScrollRef.current;
            container.scrollTop = scrollTop + (container.scrollHeight - scrollHeight);
            preserveScrollRef.current = null;
        } else if (shouldScrollToBottomRef.current) {
            container.scrollTop = container.scrollHeight;
            shouldScrollToBottomRef.current = false;
        }
    }, [messages]);

    async function loadOlderMessages() {
        const oldestMessage = messages[0];
        if (!oldestMessage || historyLoading || !hasMore) return;

        const container = messagesContainerRef.current;
        preserveScrollRef.current = container
            ? { scrollHeight: container.scrollHeight, scrollTop: container.scrollTop }
            : null;
        setHistoryLoading(true);
        setError("");
        try {
            const response = await api.get(`/games/${game._id}/messages`, {
                params: { before: oldestMessage._id, limit: PAGE_SIZE }
            });
            setMessages((current) => mergeMessages(current, response.data.messages));
            setHasMore(response.data.hasMore);
        } catch (requestError) {
            preserveScrollRef.current = null;
            setError(
                requestError.response?.data?.message ||
                "Could not load older messages."
            );
        } finally {
            setHistoryLoading(false);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        const trimmedContent = content.trim();
        if (!trimmedContent || !chatReady) return;

        const clientMessageId = crypto.randomUUID();
        const container = messagesContainerRef.current;
        shouldScrollToBottomRef.current = !container ||
            container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        const optimisticMessage = {
            _id: `pending-${clientMessageId}`,
            clientMessageId,
            gameId: game._id,
            senderId: { _id: currentUserId, name: "You" },
            content: trimmedContent,
            createdAt: new Date().toISOString()
        };
        setMessages((current) => mergeMessages(current, [optimisticMessage]));
        setContent("");
        setError("");

        socket.emit(
            "game:message",
            { gameId: game._id, content: trimmedContent, clientMessageId },
            (result) => {
                if (!result?.ok) {
                    setMessages((current) =>
                        current.filter((message) => message.clientMessageId !== clientMessageId)
                    );
                    setError(result?.message || "Message could not be sent.");
                    return;
                }

                if (result.message) {
                    setMessages((current) =>
                        mergeMessages(current, [{ ...result.message, clientMessageId }])
                    );
                }
            }
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-chat-title"
                className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900"
            >
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700 bg-slate-900 px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                            {game.title?.charAt(0).toUpperCase() || "G"}
                        </div>
                        <div className="min-w-0">
                            <h2 id="game-chat-title" className="truncate text-lg font-bold text-white">
                                {game.title}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>{game.sport}</span>
                                <span aria-hidden="true">·</span>
                                <span className={chatReady ? "text-emerald-400" : "text-amber-300"}>
                                    {chatReady ? "Connected" : connectionStatus === "reconnecting" ? "Reconnecting..." : "Connecting..."}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close chat"
                        className="shrink-0 rounded-full px-4 py-2 text-slate-300 hover:bg-slate-800"
                    >
                        Close
                    </button>
                </header>

                <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-950/80 px-3 py-5 sm:px-8">
                    {hasMore && !accessRevoked && (
                        <div className="flex justify-center pb-2">
                            <button
                                type="button"
                                onClick={loadOlderMessages}
                                disabled={historyLoading}
                                className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white disabled:opacity-50"
                            >
                                {historyLoading ? "Loading older messages..." : "Load older messages"}
                            </button>
                        </div>
                    )}
                    {messages.length === 0 && chatReady && !error && (
                        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-center text-sm text-slate-300 shadow">
                            Messages in this game chat are visible to joined players. Start the conversation!
                        </div>
                    )}
                    {messages.map((message) => {
                        const isOwnMessage =
                            (message.senderId?._id || message.senderId)?.toString() === currentUserId;
                        const sentAt = new Date(message.createdAt);

                        return (
                            <div
                                key={message._id}
                                className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}
                            >
                                <article
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 shadow sm:max-w-[70%] ${
                                        isOwnMessage
                                            ? "rounded-br-sm bg-blue-700 text-white"
                                            : "rounded-bl-sm bg-slate-800 text-slate-100"
                                    }`}
                                >
                                    <p className={`mb-1 text-xs font-semibold ${
                                        isOwnMessage ? "text-blue-200" : "text-sky-300"
                                    }`}>
                                        {isOwnMessage ? "You" : message.senderId?.name || "Player"}
                                    </p>
                                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                            {message.content}
                                        </p>
                                        <time
                                            dateTime={sentAt.toISOString()}
                                            title={sentAt.toLocaleString()}
                                            className={`ml-auto whitespace-nowrap text-[10px] ${
                                                isOwnMessage ? "text-blue-200" : "text-slate-400"
                                            }`}
                                        >
                                            {sentAt.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                                            {sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </time>
                                    </div>
                                </article>
                            </div>
                        );
                    })}
                    {messages.length === 0 && historyLoading && (
                        <p role="status" className="pt-8 text-center text-sm text-slate-500">
                            Loading messages...
                        </p>
                    )}
                </div>

                {error && (
                    <p role="alert" className="shrink-0 bg-slate-900 px-5 py-2 text-sm text-red-300">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-3 border-t border-slate-700 bg-slate-900 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                    <input
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={1000}
                        disabled={!chatReady || accessRevoked}
                        aria-label="Chat message"
                        placeholder={accessRevoked ? "You no longer have chat access" : chatReady ? "Write a message..." : "Connecting to chat..."}
                        className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-800 px-5 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!chatReady || accessRevoked || !content.trim()}
                        className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </section>
        </div>
    );
}

export default GameChatModal;
