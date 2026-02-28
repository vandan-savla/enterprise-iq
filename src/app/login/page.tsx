"use client";
import { useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
    const supabase = createClient();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function signIn(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            const { data: userCheck } = await supabase
                .from("user_details")
                .select("is_active")
                .eq("email", email)
                .single();

            if (userCheck && !userCheck.is_active) {
                setError("Account not activated. Please use the link sent to your email or reset your password.");
                return;
            }

            setError(authError.message);
            return;
        }

        router.push("/dashboard");
    }

    const handleForgotPassword = async () => {
        if (!email) return alert("Enter your email first");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=recovery`,
        });
        if (error) alert(error.message);
        else alert("Recovery email sent!");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <form onSubmit={signIn} className="p-8 border rounded w-96">
                <h1 className="text-xl font-bold mb-4">Login</h1>
                <input type="email" placeholder="Email" className="w-full p-2 border mb-2" onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="w-full p-2 border mb-4" onChange={(e) => setPassword(e.target.value)} required />
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <button className="w-full bg-black text-white p-2 mb-2">Login</button>
                <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 underline"
                >
                    Forgot Password
                </button>
            </form>
        </div>
    );
}