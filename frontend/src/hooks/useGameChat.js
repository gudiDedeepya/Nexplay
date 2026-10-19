import { useContext } from "react";
import { GameChatContext } from "../context/gameChatContext";

export function useGameChat() {
  const context = useContext(GameChatContext);
  if (!context) {
    throw new Error("useGameChat must be used inside a GameChatProvider");
  }
  return context;
}
