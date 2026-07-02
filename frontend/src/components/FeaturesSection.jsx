import { FaMapMarkerAlt, FaUsers, FaCalendarAlt, FaTrophy } from "react-icons/fa";

function FeaturesSection() {

    const features = [
        {
            icon: <FaMapMarkerAlt />,
            title: "Find Venues",
            description: "Discover and book the best sports venues around you."
        },
        {
            icon: <FaUsers />,
            title: "Join Games",
            description: "Find players and join exciting games instantly."
        },
        {
            icon: <FaCalendarAlt />,
            title: "Easy Booking",
            description: "Book slots quickly and manage your schedule."
        },
        {
            icon: <FaTrophy />,
            title: "Level Up",
            description: "Play more, compete better and improve every day."
        }
    ];

    return (

        <section className="max-w-7xl mx-auto px-8 py-16">

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

                {features.map((feature) => (

                    <div
                        key={feature.title}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-blue-500 transition"
                    >

                        <div className="text-4xl text-blue-500 mb-6">

                            {feature.icon}

                        </div>

                        <h3 className="text-2xl font-semibold text-white">

                            {feature.title}

                        </h3>

                        <p className="text-gray-400 mt-4 leading-7">

                            {feature.description}

                        </p>

                    </div>

                ))}

            </div>

        </section>

    );

}

export default FeaturesSection;