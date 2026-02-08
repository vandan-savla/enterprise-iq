"use client";
import { useState } from "react";
import { createClient } from "@/app//utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Login() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function signIn(e: React.FormEvent) {
        e.preventDefault();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) return console.error(error.message);
        router.push("/dashboard");
    }

    return (
        <form onSubmit={signIn}>
            <h1>Login</h1>
            <input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <input
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type="submit">Login</button>
        </form>
    );
}
