# Maybe later

Ideas that we decided not to do now. Keep them here so we can come back to them.

## builder-next: Server Components on a real server

Today, builder-next renders Server Components in the browser with mocks. These two options render them on the Next.js server.

1. **Real server render.** Async Server Components render on the Next.js server. The manager sends the args. A change to an arg renders the story again. Data fetching runs the real code unless a story mocks it.
2. **Real server render with mocks.** The same server render, plus mocks for each story: `fetch`, `headers()`, `cookies()` and database modules, through a module-mock layer.

Why not now: the mock layer on the server is a large piece of work. Browser rendering with mocks already covers most stories.
