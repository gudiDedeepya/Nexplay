import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {

    const navigate = useNavigate();

    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");

    async function handleLogin(e){

        e.preventDefault();

        try{

            const response=await api.post("/signin",{
                email,
                password
            });

            localStorage.setItem("token",response.data.token);

            navigate("/home");

        }

        catch(error){

            alert(
                error.response?.data?.message ||
                "Login Failed"
            );

        }

    }

    return(

        <div className="min-h-screen bg-slate-900 flex justify-center items-center px-4">

            <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8">

                <h1 className="text-4xl font-bold text-blue-500 text-center">
                    NexPlay
                </h1>

                <p className="text-gray-400 text-center mt-2">
                    Play. Book. Connect.
                </p>

                <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5">

                    <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none"
                    />

                    <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-700 text-white outline-none"
                    />

                    <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold">

                        Login

                    </button>

                </form>

                <p className="text-center text-gray-400 mt-6">

                    Don't have an account?

                    <Link
                    to="/signup"
                    className="text-blue-500 ml-2">

                        Signup

                    </Link>

                </p>

            </div>

        </div>

    );

}

export default Login;