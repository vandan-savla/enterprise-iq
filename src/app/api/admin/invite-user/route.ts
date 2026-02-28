import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/supabase/admin";
import { ApiResponse } from "@/app/types/apiResponse";

export async function POST(req: Request) {
    try {
        const {
            email,
            first_name,
            last_name,
            username,
            organization_name,
            organization_display_name,
        } = await req.json();

        if (!email || !first_name || !last_name || !username || !organization_name) {
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: "Missing required fields",
                    status: "error",
                },
                { status: 400 }
            );
        }

        // Send Invite Email
        const { data: inviteData, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=invite`,
            });

        if (inviteError) {
            console.error("Invite error:", inviteError);
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: inviteError.message,
                    status: "error",
                },
                { status: 400 }
            );
        }

        const authUserId = inviteData.user.id;
        console.log("Invited user ID:", authUserId);

        console.log("Invited user email:", inviteData);
        const { error: rpcError } = await supabaseAdmin.rpc(
            "upsert_into_users_data",
            {
                p_auth_user_id: authUserId,
                p_org_name: organization_name,
                p_org_display_name: organization_display_name,
                p_email: email,
                p_first_name: first_name,
                p_last_name: last_name,
                p_username: username,
            }
        );

        if (rpcError) {
            console.error("RPC error:", rpcError);
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: rpcError.message,
                    status: "error",
                },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<{ email: string }>>(
            {
                data: { email },
                message: "Invitation sent successfully",
                status: "success",
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("Invite route error:", err);

        return NextResponse.json<ApiResponse<null>>(
            {
                data: null,
                message: err.message || "Internal server error",
                status: "error",
            },
            { status: 500 }
        );
    }
}
