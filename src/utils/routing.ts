const HASH_ROUTE_PREFIX = '/#';

const isRootPath = (pathname: string): boolean =>
    pathname === '/' || pathname === '' || pathname.endsWith('/index.html');

export const normalizeInitialHashRoute = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    const { pathname, search, hash, origin } = window.location;

    if (hash || isRootPath(pathname)) {
        return;
    }

    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    window.location.replace(`${origin}${HASH_ROUTE_PREFIX}${normalizedPath}${search}`);
};
