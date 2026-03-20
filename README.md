🧠 What is Preppery?
Preppery is a web application that helps students and early-career applicants decide whether they should apply to a job now or fix their resume first.
Instead of blindly applying, users upload a resume and paste a job description to receive a clear, honest readiness analysis that highlights:
* resume–job alignment
* potential screening risks
* missing or weak requirements
* a short, actionable fix plan
Preppery does not guarantee interview outcomes and does not claim access to proprietary ATS systems. It provides best-effort, role-based insights using public hiring patterns and resume–job matching heuristics.

🎯 Problem Preppery Solves
Students often:
* apply without knowing if they’re ready
* don’t understand why they’re being screened out
* waste time on applications that need small fixes first
Existing tools focus on job listings or tracking, not application readiness.
Preppery fills that gap.

🧩 Core Features (MVP)
* Upload resume (PDF, text-based)
* Paste job description
* Generate a Preppery Report with:
    * Readiness status (Ready / Mostly Ready / Needs Prep)
    * Readiness score (estimate)
    * Screening risk (Low / Moderate / High)
    * Missing skills & gaps
    * 10–20 minute fix plan
    * Clear “Apply now vs Fix first” recommendation

🛠 Tech Stack
Frontend & Backend
* Next.js (App Router) — React framework for UI + API routes
Language
* TypeScript
UI
* React
* Tailwind CSS
Authentication
* Clerk (sign up / sign in / session handling)
Payments
* Stripe (subscriptions via Checkout + webhooks)
Database
* PostgreSQL
* Prisma ORM
Editor
* Cursor (AI-assisted development)


⚠️ Disclaimer
Preppery provides estimates based on resume–job alignment and common screening patterns. Results are not guarantees and Preppery is not affiliated with employers.

🚀 Project Status
Preppery is currently in MVP development, focused on:
* correctness
* clarity
* honest user expectations
* fast iteration
