# My Agent

A local Jira-ready coding agent dashboard. It accepts a plain-text brief, works in a temporary clone of a GitHub repository, runs its declared checks, pushes a feature branch, and opens a pull request for human review. Jira can be added later as another requirement source.

## Run locally

1. Install Node.js 20 or newer and Git. Corepack is required for pnpm/yarn projects.
2. Copy `.env.example` to `.env.local` and set `GITHUB_TOKEN`.
3. In the app, choose **Continue with ChatGPT** and sign in. Eligible ChatGPT plans can be used without an API key; the app discovers the models available to that account.
4. The GitHub fine-grained token needs access to the selected repository with Contents read/write and Pull requests read/write. It cannot merge pull requests.
5. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`.

Each task offers models available to the signed-in ChatGPT account. Job details show cumulative input, output, and total tokens reported across model calls. Usage and limits are managed by ChatGPT; see https://chatgpt.com/settings/usage.

## Current limits

- Jobs and logs are stored locally in `.data/jobs`.
- Agent file access is limited to the temporary checkout. It cannot read `.env*`, `.git`, or dependency folders, and has no shell tool.
- Dependency installation disables lifecycle scripts. The worker runs only declared `lint`, `typecheck`, `test`, and `build` scripts, when available.
- This is a local preview. Before exposing it to other users or the internet, add authentication, shared persistent storage, and container isolation for repository checks.
- Keep credentials in `.env.local`; never paste them in the task brief or commit them.
