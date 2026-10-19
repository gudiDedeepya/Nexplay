import { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/authContext";
import api from "../services/api";

const apiBaseUrl = import.meta.env.VITE_API_URL || "https://nexplaybackend.onrender.com/api/v1";
const socketUrl = new URL(apiBaseUrl).origin;

function mergeMessages(current, incoming) {
    const messagesById = new Map(current.map((message) => [message._id, message]));
    incoming.forEach((message) => messagesById.set(message._id, message));
    return [...messagesById.values()].sort(
        (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
    );
}

function GameChatModal({ game, onClose }) {
    const { token } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [connected, setConnected] = useState(false);
    const [chatReady, setChatReady] = useState(false);
    const [error, setError] = useState("");
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const socket = io(socketUrl, { auth: { token } });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
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

        socket.on("game:message", ({ message }) => {
            setMessages((current) => mergeMessages(current, [message]));
        });
        socket.on("connect_error", () => {
            setConnected(false);
            setError("Could not connect to chat. Check your connection and try again.");
        });
        socket.on("disconnect", () => {
            setConnected(false);
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

        socketRef.current.emit(
            "game:message",
            { gameId: game._id, content: trimmedContent },
            (result) => {
                if (!result?.ok) {
                    setError(result?.message || "Message could not be sent.");
                    return;
                }

                setContent("");
                setError("");
            }
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-chat-title"
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
            >
                <header className="flex items-center justify-between border-b border-slate-700 p-5">
                    <div>
                        <h2 id="game-chat-title" className="text-xl font-bold text-white">
                            {game.title} chat
                        </h2>
                        <p className="text-sm text-slate-400">
                            {connected ? "Connected" : "Connecting..."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close chat"
                        className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800"
                    >
                        Close
                    </button>
                </header>

                <div className="min-h-64 flex-1 space-y-3 overflow-y-auto p-5">
                    {messages.length === 0 && !error && (
                        <p className="text-center text-slate-400">
                            No messages yet. Start the conversation!
                        </p>
                    )}
                    {messages.map((message) => (
                        <article key={message._id} className="rounded-xl bg-slate-800 p-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="font-semibold text-blue-300">
                                    {message.senderId?.name || "Player"}
                                </span>
                                <time className="text-xs text-slate-500">
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </time>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words text-slate-100">
                                {message.content}
                            </p>
                        </article>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {error && (
                    <p role="alert" className="px-5 pb-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-700 p-4">
                    <input
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={1000}
                        disabled={!chatReady}
                        aria-label="Chat message"
                        placeholder={chatReady ? "Write a message..." : "Connecting to chat..."}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!chatReady || !content.trim()}
                        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </section>
        </div>
    );
}

export default GameChatModal;
