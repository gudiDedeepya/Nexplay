import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState({ status: "loading", message: "" });

  useEffect(() => {
    let active = true;

    if (!token) return undefined;

    api.post("/verify-email", { token })
      .then(({ data }) => {
        if (active) setState({ status: "success", message: data.message });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            message: error.response?.data?.message || "Unable to verify this email. Please try again."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const result = token
    ? state
    : { status: "error", message: "This verification link is invalid or expired." };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white">
      <section className="w-full max-w-md rounded-xl bg-slate-800 p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-blue-400">Verify your email</h1>
        {result.status === "loading" ? (
          <p role="status" className="mt-4 text-slate-300">Verifying your link...</p>
        ) : (
          <>
            <p role={result.status === "error" ? "alert" : "status"} className={`mt-4 ${result.status === "error" ? "text-red-300" : "text-slate-300"}`}>
              {result.message}
            </p>
            <Link to="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500">
              Go to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

export default VerifyEmail;
