import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

registerRoute(
  ({ request, url }) =>
    request.destination === "image" ||
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst()
);

registerRoute(
  ({ request, url }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname.startsWith("/recipes/") ||
    url.pathname === "/index.html" ||
    url.pathname === "/",
  new StaleWhileRevalidate()
);
