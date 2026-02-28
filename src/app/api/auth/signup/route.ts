import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/supabase/admin";
import { createServerSupabaseClient } from "@/app/utils/supabase/server";
import { ApiResponse } from "@/app/types/apiResponse";

export async function POST(req: Request) {
    const supabase = createServerSupabaseClient();
    try {
        const { organization_display_name, first_name, last_name, email, password, username } = await req.json();

        const organization_name = organization_display_name.toLowerCase().trim().replace(/\s+/g, "-");

        const usernameValidation = await supabaseAdmin.rpc("is_valid_username", {
            p_username: username,
            p_org_name: organization_name,
        });
        const { data: userDetails, error: userDetailsError } = await supabaseAdmin.from("user_details").select("id").eq("email", email).single();

        console.log("User Details :", userDetails, "User Details Error:", userDetailsError);
        if (!usernameValidation.data && !userDetails) {
            return NextResponse.json<ApiResponse<null>>({
                data: null,
                message: "Username already exists in this organization. Please choose a different username.",
                status: "error",
            }, { status: 400 });
        }


        const { data: authUser, error: authError } = await supabaseAdmin.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify`,
            },
        });
        let authUserId = authUser?.user?.id || null;

        console.log("Sign Up Data:", authUser, "Sign Up Error:", authError);

        // Handle "User Already Exists" (Auth error 422 or similar)
        if (authError) {
            // If user exists, we need to fetch their ID to try and re-run the DB bootstrap

            //  =========== NOTE =================

            // NEED TO MAKE IT SCALABLE, THIS IS NOT SCALABLE SINCE WE ARE QUERING ALL USERS AND THEN FINDING THE USER IN THE LIST.

            const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = list?.users.find(u => u.email === email);

            // ========== END NOTE ===============

            if (existingUser) {
                console.warn("User already exists. Attempting idempotent setup for:", email);
                authUserId = existingUser.id;
                // Resend verification email if they aren't confirmed yet
                if (!existingUser.email_confirmed_at) {
                    await supabase.auth.signUp({
                        email,
                        password,

                    });
                }
            } else {
                // If it's a real error (like password too weak), stop here
                // return NextResponse<>.json({ error: authError.message }, { status: 400 });
                return NextResponse.json<ApiResponse<null>>({
                    data: null,
                    message: authError.message,
                    status: "error",
                }, { status: 400 });

            }
        }
        let rpc_payload = {
            p_auth_user_id: authUserId,
            p_org_name: organization_name,
            p_org_display_name: organization_display_name,
            p_email: email,
            p_first_name: first_name,
            p_last_name: last_name,
            p_username: username.toLowerCase(),
        }

        console.log("RPC Payload: ", rpc_payload);
        //  Idempotent DB bootstrap (Ensure your SQL uses INSERT ... ON CONFLICT)
        const { error: dbError } = await supabaseAdmin.rpc(
            "upsert_into_users_data",
            rpc_payload
        );

        if (dbError) {
            console.error("DB Bootstrap Error:", dbError);
            // return NextResponse.json({ error: "Database setup failed. Please contact support." }, { status: 500 });
            return NextResponse.json<ApiResponse<null>>({
                data: null,
                message: "Database setup failed. Please contact support.",
                status: "error",
            }, { status: 500 });
        }

        if (!authError) {

            return NextResponse.json<ApiResponse<string>>({
                data: authUser.user?.email || null,
                message: "Setup initiated. Please check your email to verify your account.",
                status: "success"
            });
        }
        return NextResponse.json<ApiResponse<string>>({
            data: null,
            message: authError.message,
            status: "error"
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
