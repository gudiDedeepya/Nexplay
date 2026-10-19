import { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/authContext";
import api from "../services/api";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://nexplaybackend.onrender.com/api/v1";
const socketUrl = new URL(apiBaseUrl).origin;

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
    const [messages, setMessages] = useState([]);
    const currentUserId = getUserIdFromToken(token || "");
    const [content, setContent] = useState("");
    const [chatReady, setChatReady] = useState(false);
    const [error, setError] = useState("");
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const socket = io(socketUrl, { auth: { token } });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("game:join", { gameId: game._id }, async (result) => {
                if (!result?.ok) {
                    setError(result?.message || "Unable to join this game's chat.");
                    return;
                }

                setChatReady(true);
                try {
                    const response = await api.get(`/games/${game._id}/messages`);
                    setMessages((current) => mergeMessages(current, response.data.messages));
                    setError("");
                } catch (requestError) {
                    setError(
                        requestError.response?.data?.message ||
                        "Could not load chat history."
                    );
                }
            });
        });

        socket.on("game:message", ({ message, clientMessageId }) => {
            setMessages((current) =>
                mergeMessages(current, [{ ...message, clientMessageId }])
            );
        });
        socket.on("connect_error", () => {
            setChatReady(false);
            setError("Could not connect to chat. Check your connection and try again.");
        });
        socket.on("disconnect", () => {
            setChatReady(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [game._id, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function handleSubmit(event) {
        event.preventDefault();
        const trimmedContent = content.trim();
        if (!trimmedContent || !chatReady) return;

        const clientMessageId = crypto.randomUUID();
        const optimisticMessage = {
            _id: `pending-${clientMessageId}`,
            clientMessageId,
            senderId: { _id: currentUserId },
            content: trimmedContent,
            createdAt: new Date().toISOString()
        };
        setMessages((current) => mergeMessages(current, [optimisticMessage]));
        setContent("");
        setError("");

        socketRef.current.emit(
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
                            <p className="text-sm text-slate-400">
                                {game.sport}
                            </p>
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

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-950/80 px-3 py-5 sm:px-8">
                    {messages.length === 0 && !error && (
                        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-center text-sm text-slate-300 shadow">
                            Messages in this game chat are visible to joined players. Start the conversation!
                        </div>
                    )}
                    {messages.map((message) => {
                        const isOwnMessage =
                            message.senderId?._id?.toString() === currentUserId;

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
                                    {!isOwnMessage && (
                                        <p className="mb-1 text-xs font-semibold text-sky-300">
                                            {message.senderId?.name || "Player"}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                            {message.content}
                                        </p>
                                        <time className={`ml-auto whitespace-nowrap text-[10px] ${
                                            isOwnMessage ? "text-blue-200" : "text-slate-400"
                                        }`}>
                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </time>
                                    </div>
                                </article>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {error && (
                    <p role="alert" className="shrink-0 bg-slate-900 px-5 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-3 border-t border-slate-700 bg-slate-900 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                    <input
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={1000}
                        disabled={!chatReady}
                        aria-label="Chat message"
                        placeholder={chatReady ? "Write a message..." : "Connecting to chat..."}
                        className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-800 px-5 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!chatReady || !content.trim()}
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
