import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/supabase/admin";
import { ApiResponse } from "@/app/types/apiResponse";

export async function POST(req: Request) {
    try {
        const { username, organization_display_name } = await req.json();
        const organization_name = organization_display_name.toLowerCase().trim().replace(/\s+/g, "-");

        if (!username || !organization_display_name) {
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: "Username and organization_display_name are required.",
                    status: "error",
                },
                { status: 400 }
            );
        }

        // sanity check for username format (e.g., no spaces, certain length) 
        // only _ and . are allowed special characters, and username must be between 3 and 20 characters
        const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: "Username is not in a valid format. Only letters, numbers, underscores, and periods are allowed. Length must be between 3 and 20 characters.",
                    status: "error",
                },
                { status: 400 }
            );
        }
        const { data, error } = await supabaseAdmin.rpc("is_valid_username", {
            p_username: username,
            p_org_name: organization_name,
        });
        console.log("RPC Result:", data, "RPC Error:", error);
        if (error) {
            console.error("RPC Error:", error);
            return NextResponse.json<ApiResponse<null>>(
                {
                    data: null,
                    message: "Username validation failed.",
                    status: "error",
                },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<boolean>>({
            data: data,
            message: data
                ? "Username is available."
                : "Username already exists in this organization.",
            status: "success",
        });

    } catch (err: any) {
        console.error("Username validation error:", err);
        return NextResponse.json<ApiResponse<null>>(
            {
                data: null,
                message: "Unexpected server error.",
                status: "error",
            },
            { status: 500 }
        );
    }
}
