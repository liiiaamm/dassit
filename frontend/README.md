# DassIt client

Next.js 16 (App Router) with plain CSS modules.

| Route | Page |
|-------|------|
| `/login`, `/register` | Email login and sign-up, with the same validation rules as the API |
| `/chat` | Sidebar with your chats and the usage meter |
| `/chat/[id]` | The conversation |
| `/profile` | Edit username, change password, delete account |

All requests go through `src/lib/api.js`. It adds the bearer token, refreshes once on a 401 and retries, and throws `SESSION_EXPIRED` when the refresh token is gone, so pages can redirect to `/login`.

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev    # http://localhost:3000
```
