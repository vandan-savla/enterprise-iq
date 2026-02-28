"use client";
import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function SetPassword() {
    const supabase = createClient();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
            setError("Session not found. Please try again.");
            setLoading(false);
            return;
        }
        console.log("Current session user:", session.user);

        // 1. Identify the user from the returned data
        const userId = session.user?.id;
        console.log("User ID after password update:", userId);
        if (userId) {
            // 2. Manually activate the user in your custom table
            const { data: userData, error: rpcError } = await supabase
                .schema("users_data")
                .rpc("activate_user", { p_user_id: userId });

            if (rpcError) {
                console.error("Manual activation failed:", rpcError);
                setError("Manual activation failed. Please contact support.");
                setLoading(false);
                return;
            }
            else {
                const { data, error: authError } = await supabase.auth.updateUser({
                    password: password
                });
                console.log("Password update result:", { data, authError });
                if (authError) {

                    setError(authError.message);
                    setLoading(false);
                    return;
                }
                router.push("/dashboard");
            }
        }
        setLoading(false);
    };
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <form onSubmit={handleSetPassword} className="p-8 border rounded shadow-md w-96">
                <h1 className="text-xl font-bold mb-4">Finalize Your Account</h1>
                <p className="text-sm text-gray-500 mb-4">Please set a password to activate your account.</p>
                <input
                    type="password"
                    placeholder="New Password"
                    className="w-full p-2 border mb-4"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white p-2 rounded"
                >
                    {loading ? "Saving..." : "Set Password & Login"}
                </button>
            </form>
        </div>
    );
}