'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="auth-page">
            <div className="auth-container">
                <SignUp
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
