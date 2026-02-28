import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/dashboard'

    const redirectTo = request.nextUrl.clone()
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')

    if (token_hash && type) {

        const supabase = createServerSupabaseClient()

        // 1. Verify the OTP/Link
        const { data, error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        console.log("OTP verification result:", { data, error });
        if (!error && data.user) {
            // 2. Decide where to send them
            // If it's an invite or recovery, they MUST set a password
            if (type === 'invite' || type === 'recovery') {
                redirectTo.pathname = '/auth/set-password'
                return NextResponse.redirect(redirectTo)
            }

            redirectTo.pathname = next
            return NextResponse.redirect(redirectTo)
        }
        console.error("OTP verification failed:", error);
    }

    // Redirect to error page if token is invalid/expired
    redirectTo.pathname = '/error'
    return NextResponse.redirect(redirectTo)
}