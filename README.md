# Research Pal Mobile App

Research Pal is a mobile-first field research notebook for agricultural and experimental workflows. It helps a user manage research projects, fixed physical plots, plot-level notes, quick ideas, and photos captured during field work.

## Current Scope

- One isolated workspace per account.
- No collaboration, RBAC, organizations, or shared workspaces yet.
- Every authenticated user owns their own projects, plots, notes, ideas, and photo references.

Core data flow:

```text
User -> Projects -> Plots -> Notes -> Photos
```

Domain rules:

- `plotIndex` is the fixed physical position of a plot.
- `replication` and `treatment` are editable metadata.
- Plots do not move; only their properties change.

## Architecture

- React Native mobile app.
- Zustand stores in-memory app state.
- Axios handles API requests.
- AsyncStorage persists session/profile fields needed across app restarts.
- The access token is held in Zustand memory.
- The refresh token is persisted and used to restore/rotate the session.
- Account verification stores a short-lived verification token locally and pairs it with the emailed six-digit code.
- Axios retries a failed authenticated request once after a successful refresh.
- If refresh fails, the app clears local auth state.

## Auth Flow

- Login calls `POST /auth/login`.
- The API returns an access token and refresh token.
- The access token is kept in Zustand memory only.
- The refresh token is persisted for session restore.
- On `401`, Axios calls `POST /auth/refresh`, stores the rotated refresh token, updates the in-memory access token, and retries the original request.
- Logout calls `POST /auth/logout` and clears local auth state.

## API Errors

Axios errors are normalized through `src/services/apiError.ts`. Screens should use `showApiErrorAlert` or `getUserFacingErrorMessage` instead of reading `error.response` directly. The parser handles the current API envelope, older response shapes, network failures, timeouts, rate limits, and expired sessions.

## Development

```sh
npm install
npm start
npm run android
```

For iOS:

```sh
bundle install
bundle exec pod install
npm run ios
```

## Verification

```sh
npm run lint
npm test
npm audit
```

Do not run automated package updates during audit review. Report findings first, then decide upgrades separately.
