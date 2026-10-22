import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../services/api";
import Navbar from "../components/Navbar";
import VenueCard from "../components/VenueCard";
import PaginationControls from "../components/PaginationControls";
import { filterVenuesByPrice } from "../utils/filterVenues";

function filtersFromParams(params) {
    return {
        search: params.get("search") || "",
        sport: params.get("sport") || "",
        minPrice: params.get("minPrice") || "",
        maxPrice: params.get("maxPrice") || ""
    };
}

function Venues() {
    const [venues, setVenues] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const paramsKey = searchParams.toString();
    const [requestState, setRequestState] = useState({
        key: null,
        status: "loading",
        error: ""
    });
    const [filterError, setFilterError] = useState("");
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let active = true;

        async function loadVenues() {
            try {
                const response = await api.get("/venues", {
                    params: {
                        ...filtersFromParams(new URLSearchParams(paramsKey)),
                        page: new URLSearchParams(paramsKey).get("page") || 1
                    }
                });
                if (active) {
                    setVenues(response.data.venues);
                    setPagination(response.data.pagination);
                    setRequestState({ key: paramsKey, status: "loaded", error: "" });
                }
            } catch (error) {
                if (active) {
                    setRequestState({
                        key: paramsKey,
                        status: "error",
                        error: error.response?.data?.message ||
                            "Unable to load venues. Check your connection and try again."
                    });
                }
            }
        }

        loadVenues();
        return () => {
            active = false;
        };
    }, [paramsKey, retryCount]);

    function applyFilters(event) {
        event.preventDefault();
        const params = new URLSearchParams();
        const values = new FormData(event.currentTarget);
        const minPriceText = String(values.get("minPrice") || "").trim();
        const maxPriceText = String(values.get("maxPrice") || "").trim();
        const minPrice = minPriceText === "" ? null : Number(minPriceText);
        const maxPrice = maxPriceText === "" ? null : Number(maxPriceText);

        if (
            (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) ||
            (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0))
        ) {
            setFilterError("Prices must be valid non-negative numbers.");
            return;
        }
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            setFilterError("Minimum price cannot be greater than maximum price.");
            return;
        }
        setFilterError("");
        for (const [key, value] of values.entries()) {
            const text = String(value).trim();
            if (text) params.set(key, text);
        }
        setSearchParams(params);
    }

    function clearFilters() {
        setFilterError("");
        setSearchParams({});
    }

    function changePage(page) {
        const params = new URLSearchParams(searchParams);
        if (page === 1) params.delete("page");
        else params.set("page", String(page));
        setSearchParams(params);
    }

    const loading = requestState.key !== paramsKey || requestState.status === "loading";
    const filters = filtersFromParams(searchParams);
    const filteredVenues = filterVenuesByPrice(
        venues,
        filters.minPrice,
        filters.maxPrice,
        filters.search
    );

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                <h1 className="text-4xl font-bold text-white">Available Venues</h1>
                <p className="mt-3 text-gray-400">
                    Search by venue name or location, or filter by sport and price.
                </p>

                <form
                    key={paramsKey}
                    onSubmit={applyFilters}
                    className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <label className="text-sm font-medium text-slate-300">
                        Search name or location
                        <input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="e.g. Riverside or Tirupati"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                        />
                    </label>
                    <label className="text-sm font-medium text-slate-300">
                        Sport
                        <select
                            name="sport"
                            defaultValue={filters.sport}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">All sports</option>
                            {["Cricket", "Football", "Badminton", "Basketball", "Kabaddi", "Tennis", "Volleyball"].map((sport) => (
                                <option key={sport} value={sport}>{sport}</option>
                            ))}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium text-slate-300">
                            Minimum price / hour
                            <input
                                name="minPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={filters.minPrice}
                                placeholder="Any"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500"
                            />
                        </label>
                        <label className="text-sm font-medium text-slate-300">
                            Maximum price / hour
                            <input
                                name="maxPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={filters.maxPrice}
                                placeholder="Any"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-500"
                            />
                        </label>
                    </div>
                    <div className="flex items-end gap-3">
                        <button
                            type="submit"
                            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                        >
                            Apply filters
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
                        >
                            Clear
                        </button>
                    </div>
                </form>

                {filterError && (
                    <p role="alert" className="mt-4 text-sm text-red-300">{filterError}</p>
                )}

                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div role="status" className="col-span-full py-12 text-center text-xl text-gray-400">
                            Loading venues...
                        </div>
                    ) : requestState.status === "error" ? (
                        <div className="col-span-full py-12 text-center">
                            <p role="alert" className="text-lg text-red-400">{requestState.error}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequestState({ key: paramsKey, status: "loading", error: "" });
                                    setRetryCount((count) => count + 1);
                                }}
                                className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                            >
                                Try again
                            </button>
                        </div>
                    ) : filteredVenues.length ? (
                        filteredVenues.map((venue) => <VenueCard key={venue._id} venue={venue} />)
                    ) : (
                        <div className="col-span-full py-12 text-center text-xl text-gray-400">
                            No venues match those filters.
                        </div>
                    )}
                </div>
                {!loading && requestState.status !== "error" && (
                    <PaginationControls pagination={pagination} onPageChange={changePage} />
                )}
            </main>
        </div>
    );
}

export default Venues;
