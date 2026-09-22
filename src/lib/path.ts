/** Prefix an in-app path with Astro's configured `base` (GitHub Pages project URL). */
export function withBase(path = ""): string {
  let base = import.meta.env.BASE_URL || "/";
  if (!base.endsWith("/")) base += "/";

  if (!path || path === "/") return base;
  if (path.startsWith("?")) return `${base}${path}`;
  return `${base}${path.replace(/^\//, "")}`;
}

export function isHomePath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const home = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") || "/";
  return normalized === home;
}
