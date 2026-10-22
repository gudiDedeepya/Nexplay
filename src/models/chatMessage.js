import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

chatMessageSchema.index({ gameId: 1, createdAt: -1 });

export const chatMessageModel =
  mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
