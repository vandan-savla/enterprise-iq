'use client'
import { useEffect } from 'react'

interface ErrorPageProps {
    error: Error
    reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    // log the error to the console or an error‑reporting service
    // useEffect(() => {
    //     console.error('Unhandled error in route:', error)
    // }, [error])

    return (
        <html>
            <head>
                <title>Unexpected error</title>
            </head>
            <body>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center',
                    }}
                >
                    <h1>Something went wrong</h1>
                    <p>{'An unexpected error has occurred.'}</p>
                    <button
                        onClick={() => reset()}
                        style={{
                            marginTop: 20,
                            padding: '8px 16px',
                            fontSize: 16,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}