'use client';

import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  remaining: number;
}

export default function PricingModal({ isOpen, onClose, remaining }: PricingModalProps) {
  const { isSignedIn } = useUser();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Free Limit Reached
            </h2>
            <p className="text-gray-600 mb-6">
              You've used your {remaining === 0 ? '2 free analyses' : `${remaining} remaining free analysis${remaining === 1 ? '' : 'es'}`}. 
              Sign up to continue analyzing resumes and get unlimited access.
            </p>

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 mb-6 border-2 border-indigo-200">
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                Pro
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                $9<span className="text-lg text-gray-600">/month</span>
              </div>
              <ul className="text-left mt-4 space-y-2 text-gray-700">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited resume analyses
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Detailed alignment reports
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Actionable fix plans
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
              </ul>
            </div>

            {/* Sign Up / Sign In Buttons */}
            {!isSignedIn ? (
              <div className="space-y-3">
                <SignUpButton mode="modal">
                  <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    Sign Up to Continue
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="w-full text-indigo-600 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    Already have an account? Sign In
                  </button>
                </SignInButton>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600 mb-4">
                  You're signed in! Subscribe to continue analyzing.
                </p>
                <button
                  onClick={() => {
                    // TODO: Redirect to Stripe checkout
                    window.location.href = '/account?subscribe=true';
                  }}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Subscribe Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

