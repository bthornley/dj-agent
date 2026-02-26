'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="auth-page">
            <div className="auth-container">
                <SignIn
                    appearance={{
                        elements: {
                            rootBox: 'auth-root',
                            card: 'auth-card',
                            headerTitle: 'auth-title',
                            headerSubtitle: 'auth-subtitle',
                            formButtonPrimary: 'auth-btn-primary',
                        },
                    }}
                />
            </div>
        </div>
    );
}
