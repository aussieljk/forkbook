---
area: Frontend
title: Manager routes and pages
sources:
  - code/core/src/router/**
  - code/core/src/manager/settings/**
  - code/core/src/manager/components/home/**
  - code/core/src/manager-api/modules/url.ts
  - code/core/src/shared/review/routes.ts
---
Paths are relative to `code/core/src`. Public URLs follow the sidebar tree (`router/story-paths.ts:1`); the manager still uses internal paths and converts with `toUrlPath` / `fromUrlPath`.

| URL | Shows | Declared in |
|---|---|---|
| `/` | start page when `FORKBOOK_ROOT.enabled`, else first story | `manager/components/home/HomePages.tsx:242` |
| `/all` | grid of all stories | `HomePages.tsx:260` |
| `/<group>/<component>/<story>` | story canvas | `router/story-paths.ts` |
| `/<group>/<component>/docs` | docs page | same |
| `/_story/<id>`, `/_docs/<id>` | stories with no tree path (refs, clashes) | same |
| `/settings/about`, `/shortcuts`, `/whats-new` | settings tabs | `manager/settings/index.tsx` |
| `/review/` | review summary from an agent | `shared/review/routes.ts` |
| `?path=/story/<id>` | old Storybook link, replaced | `router/router.tsx` (`Location`) |

- Pages are page addons (`experimental_PAGE`), registered in `manager/index.tsx:69`.
- Query params: `full`, `panel`, `nav`, `shortcuts`, `addonPanel`, `tabs`, `args`, `globals`, `embed`, `freeze=finished` (`manager-api/modules/url.ts:78-323`).
- The preview loads `iframe.html?id=<id>&viewMode=...` (`manager/components/preview/FramesRenderer.tsx:68`).
- `parsePath` (`router/utils.ts:18`) returns `{viewMode, refId, storyId}`.
- What's new shows only when `whatsNewData.status === 'SUCCESS'`. Escape closes settings and returns to `lastTrackedStoryId` (`manager-api/modules/settings.ts:40`).
