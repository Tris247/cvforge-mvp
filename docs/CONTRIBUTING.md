# Contributing — CVForge MVP

Thanks for helping improve the CVForge prototype! This page covers basic contribution steps for the local scaffold.

Local dev checklist
1. Open the project folder in VS Code: `code C:\Users\trist\Projects\cvforge-mvp`
2. Copy environment variables: `copy .env.example .env`
3. (Optional) Start local Postgres: `docker compose up -d` (provided in this repo scaffold)
4. Install dependencies: `npm install`
5. Start the dev server: `npm run dev` and visit `http://localhost:3000`.

Standards
- Use TypeScript for new code and add types to shared modules when possible.
- Keep UI components in `components/` and page-level logic in `pages/`.
- Add tests when fixing bugs or adding features.

Pull requests and commits
- Add a short, descriptive commit message and open a PR against `main`.
- Include screenshots and a short description of how to test the change.

Code of conduct
- Be respectful and considerate. This repository is a prototype and used for learning and collaboration.
