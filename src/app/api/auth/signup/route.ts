import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/supabase/admin";

export async function POST(req: Request) {
    try {
        const { organization_display_name, first_name, last_name, email, password } = await req.json();

        const organization_name = organization_display_name.toLowerCase().trim().replace(/\s+/g, "-");

        // NEED TO HANDLE DUPES FOR ORG NAME AND USERNAME BETTER, THIS IS JUST A QUICK FIX
        const username = `${first_name.toLowerCase().trim()}-${last_name.toLowerCase().trim()}`;
        //  Create Auth User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
        });

        let authUserId = authUser?.user?.id || null;


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
                // Optional: Resend verification email if they aren't confirmed yet
                if (!existingUser.email_confirmed_at) {
                    await supabaseAdmin.auth.admin.inviteUserByEmail(email);
                }
            } else {
                // If it's a real error (like password too weak), stop here
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        }
        let rpc_payload = {
            p_auth_user_id: authUserId,
            p_org_name: organization_name,
            p_org_display_name: organization_display_name,
            p_email: email,
            p_first_name: first_name,
            p_last_name: last_name,
            p_username: username, // You might want to generate or accept a username as well
        }

        console.log("RPC Payload: ", rpc_payload);
        //  Idempotent DB bootstrap (Ensure your SQL uses INSERT ... ON CONFLICT)
        const { error: dbError } = await supabaseAdmin.rpc(
            "upsert_into_users_data",
            rpc_payload
        );

        if (dbError) {
            console.error("DB Bootstrap Error:", dbError);
            return NextResponse.json({ error: "Database setup failed. Please contact support." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Setup initiated. Please check your email to verify your account.",
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
