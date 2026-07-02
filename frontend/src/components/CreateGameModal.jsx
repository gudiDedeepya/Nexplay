import { useState } from "react";
import api from "../services/api";

function CreateGameModal({ booking, onClose, onSuccess }) {

    const [title, setTitle] = useState("");
    const [maxPlayers, setMaxPlayers] = useState("");
    const [skillLevel, setSkillLevel] = useState("Beginner");
    const [description, setDescription] = useState("");

    async function handleCreateGame() {

        if (!title || !maxPlayers) {
            alert("Please fill all required fields");
            return;
        }

        try {

            await api.post("/games", {

                bookingId: booking._id,

                title,

                maxPlayers: Number(maxPlayers),

                skillLevel,

                description

            });

            alert("Game Created Successfully!");

            onSuccess();

            onClose();

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Unable to create game"
            );

        }

    }

    return (

        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">

            <div className="bg-slate-900 rounded-2xl w-full max-w-lg p-8">

                <h2 className="text-3xl font-bold text-white mb-6">

                    Create Community Game

                </h2>

                <input
                    type="text"
                    placeholder="Game Title"
                    value={title}
                    onChange={(e)=>setTitle(e.target.value)}
                    className="w-full mb-4 p-3 rounded-lg bg-slate-800 text-white"
                />

                <input
                    type="number"
                    placeholder="Maximum Players"
                    value={maxPlayers}
                    onChange={(e)=>setMaxPlayers(e.target.value)}
                    className="w-full mb-4 p-3 rounded-lg bg-slate-800 text-white"
                />

                <select
                    value={skillLevel}
                    onChange={(e)=>setSkillLevel(e.target.value)}
                    className="w-full mb-4 p-3 rounded-lg bg-slate-800 text-white"
                >

                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>

                </select>

                <textarea

                    rows="4"

                    placeholder="Description"

                    value={description}

                    onChange={(e)=>setDescription(e.target.value)}

                    className="w-full mb-6 p-3 rounded-lg bg-slate-800 text-white"

                />

                <div className="flex justify-end gap-4">

                    <button

                        onClick={onClose}

                        className="px-5 py-2 rounded-lg bg-gray-600 hover:bg-gray-700"

                    >

                        Cancel

                    </button>

                    <button

                        onClick={handleCreateGame}

                        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"

                    >

                        Create

                    </button>

                </div>

            </div>

        </div>

    );

}

export default CreateGameModal;