import type { ComponentProps, ReactElement, ReactNode } from 'react';
import React, { useCallback, useEffect } from 'react';

import { global } from '../shared/global.ts';

import * as R from 'react-router-dom';

import { NAVIGATE_URL } from '@aussieljk/forkbook/internal/core-events';
import { addons } from '@aussieljk/forkbook/manager-api';
import type { LinkProps, NavigateOptions, RenderData } from './types.ts';
import { fromUrlPath, toUrlPath } from './story-paths.ts';
import { getMatch, parsePath, queryFromLocation, stringifyQuery } from './utils.ts';

const { document } = global;

interface MatchingData {
  match: null | { path: string };
}

interface LocationProps {
  children: (renderData: RenderData) => any;
}

interface MatchPropsStartsWith {
  path: string;
  startsWith: boolean;
  children: (matchingData: MatchingData) => ReactNode;
}
interface MatchPropsDefault {
  path: RegExp;
  startsWith: false;
  children: (matchingData: MatchingData) => ReactNode;
}

interface RoutePropsStartsWith {
  path: string;
  startsWith?: boolean;
  children: ReactNode;
}
interface RoutePropsDefault {
  path: RegExp;
  startsWith?: false;
  children: ReactNode;
}

/**
 * The path where Forkbook is hosted, without a trailing slash (`''` at the root). The page sets a
 * `<base>` element when it is opened at a deep path, so `document.baseURI` is the Forkbook root.
 */
export const getBasename = (): string => {
  try {
    return new URL('.', document.baseURI).pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
};

/**
 * Changes an internal navigation target (`/story/<id>&args=a:1#hash`) to a URL relative to the
 * Forkbook root (`/example/button/primary?args=a:1#hash`).
 */
export const toRouterUrl = (target: string): string => {
  // Callers add the query after the hash (`/docs/<id>#heading&args=a:1`), so read the query parts
  // from both sides of the hash.
  const [beforeHash, afterHash] = target.split(/#(.*)/s);
  const [path, ...queryParts] = beforeHash.split('&');
  const [hash, ...hashQueryParts] = afterHash === undefined ? [] : afterHash.split('&');
  const query = [...queryParts, ...hashQueryParts].join('&');
  return `${toUrlPath(path || '/')}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
};

export const useNavigate = () => {
  const navigate = R.useNavigate();

  return useCallback((to: R.To | number, { plain, ...options } = {} as NavigateOptions) => {
    if (typeof to === 'string' && to.startsWith('#')) {
      // In-page navigation. Go through the router (instead of mutating document.location.hash)
      // so the location change is observable by the manager state, e.g. for "last viewed"
      // tracking in the sidebar.
      return navigate(`${document.location.search}${to === '#' ? '' : to}`, options);
    }
    if (typeof to === 'string') {
      const target = plain ? to : toRouterUrl(to);
      const [url, hash] = target.split('#');
      const current = `${document.location.pathname}${document.location.search}`;
      const isSamePage = plain
        ? url === document.location.search
        : `${getBasename()}${url}` === current;

      // When navigating to an anchor on the same page, e.g. via searching a sub-headline, the
      // preview does not re-render, so nothing scrolls to the anchor. Emitting NAVIGATE_URL makes
      // the preview scroll, and the manager's NAVIGATE_URL handler performs the actual `#hash`
      // navigation through the in-page branch above.
      if (isSamePage && hash) {
        addons.getChannel().emit(NAVIGATE_URL, `#${hash}`);

        return undefined;
      }

      return navigate(target, options);
    }
    if (typeof to === 'number') {
      return navigate(to);
    }

    return undefined;
  }, []);
};

/** A component that will navigate to a new location/path when clicked */
export const Link = ({ to, children, ...rest }: LinkProps) => (
  <R.Link to={toRouterUrl(to)} {...rest}>
    {children}
  </R.Link>
);
Link.displayName = 'QueryLink';

/**
 * A render-prop component where children is called with a location and will be called whenever it
 * changes
 */
export const Location = ({ children }: LocationProps) => {
  const location = R.useLocation();
  const navigate = R.useNavigate();
  const { path: legacyPath, singleStory, ...otherQuery } = queryFromLocation(location);
  const path = legacyPath || fromUrlPath(location.pathname);
  const { viewMode, storyId, refId } = parsePath(path);

  // Old URLs keep the story in the `path` query parameter (`/?path=/story/<id>`). Replace them
  // with the new URL, which keeps the story in the URL path.
  useEffect(() => {
    if (legacyPath) {
      navigate(`${toUrlPath(legacyPath)}${stringifyQuery(otherQuery)}${location.hash}`, {
        replace: true,
      });
    }
  }, [legacyPath]);

  return (
    <>
      {children({
        path: path || '/',
        location,
        viewMode,
        storyId,
        refId,
        singleStory: singleStory === 'true',
      })}
    </>
  );
};
Location.displayName = 'QueryLocation';

/**
 * A render-prop component for rendering when a certain path is hit. It's immensely similar to
 * `Location` but it receives an addition data property: `match`. match has a truthy value when the
 * path is hit.
 */
function Match(props: MatchPropsStartsWith): ReactElement;
function Match(props: MatchPropsDefault): ReactElement;
function Match({
  children,
  path: targetPath,
  startsWith = false,
}: MatchPropsStartsWith | MatchPropsDefault) {
  return (
    <Location>
      {({ path: urlPath, ...rest }) =>
        children({
          match: getMatch(urlPath, targetPath, startsWith),
          ...rest,
        })
      }
    </Location>
  );
}
Match.displayName = 'QueryMatch';

/** A component to conditionally render children based on matching a target path */
function Route(props: RoutePropsDefault): ReactElement;
function Route(props: RoutePropsStartsWith): ReactElement;
function Route(input: RoutePropsDefault | RoutePropsStartsWith) {
  const { children, ...rest } = input;
  if (rest.startsWith === undefined) {
    rest.startsWith = false;
  }

  const matchProps = rest as Omit<ComponentProps<typeof Match>, 'children'>;

  return <Match {...matchProps}>{({ match }) => (match ? children : null)}</Match>;
}
Route.displayName = 'Route';

export { Match, Route };

export const LocationProvider: typeof R.BrowserRouter = (props) =>
  R.BrowserRouter({ basename: getBasename() || undefined, ...props });
export const BaseLocationProvider: typeof R.Router = (...args) => R.Router(...args);
export const MemoryRouter: typeof R.MemoryRouter = (...args) => R.MemoryRouter(...args);
