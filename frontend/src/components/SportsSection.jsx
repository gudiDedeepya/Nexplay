import { useNavigate } from "react-router-dom";

function SportsSection() {

    const navigate = useNavigate();

    const sports = [
        {
            name: "Cricket",
            icon: "🏏",
            description: "Book cricket grounds near you."
        },
        {
            name: "Football",
            icon: "⚽",
            description: "Join football matches nearby."
        },
        {
            name: "Badminton",
            icon: "🏸",
            description: "Smash it like a pro."
        },
        {
            name: "Basketball",
            icon: "🏀",
            description: "Book indoor & outdoor courts."
        },
        {
            name: "Kabaddi",
            icon: "🤼",
            description: "Find players and compete."
        }
    ];

    return (

        <section className="max-w-7xl mx-auto px-8 py-10">

            <div className="flex justify-between items-center mb-8">

                <h2 className="text-3xl font-bold text-white">
                    Popular Sports
                </h2>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">

                {sports.map((sport) => (

                    <div
                        key={sport.name}
                        onClick={() => navigate(`/venues?sport=${sport.name}`)}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-blue-500 hover:-translate-y-2 transition-all duration-300"
                    >

                        <div className="text-5xl mb-5">
                            {sport.icon}
                        </div>

                        <h3 className="text-xl font-bold text-white">
                            {sport.name}
                        </h3>

                        <p className="text-gray-400 mt-3">
                            {sport.description}
                        </p>

                    </div>

                ))}

            </div>

        </section>

    );

}

export default SportsSection;