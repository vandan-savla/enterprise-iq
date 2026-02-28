import { createServerSupabaseClient } from "@/app/utils/supabase/server";

export default async function Dashboard() {
    const supabase = createServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    console.log("User data:", user);
    if (!user?.email_confirmed_at) {
        return <p>Please confirm your email address to access the dashboard.</p>;
    }
    if (!user) return <p>Not logged in</p>;

    return <div>Welcome, {user.email}!</div>;
}
