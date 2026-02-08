import { createServerSupabaseClient } from "@/app/utils/supabase/server";

export default async function Dashboard() {
    const supabase = createServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return <p>Not logged in</p>;

    return <div>Welcome, {user.email}!</div>;
}
