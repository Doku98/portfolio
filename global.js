console.log("IT’S ALIVE!");

// Helper function: selects all matching elements (like querySelectorAll but returns an array)
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// List of pages to show in the nav
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contract/", title: "Contact" },
  { url: "https://github.com/doku98", title: "GitHub" }
];

// Figure out if we’re running locally or on GitHub Pages, and set base path accordingly
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                // local development
  : "/github.com/Doku98/portfolio/"; // GitHub Pages — replace this with your actual repo name

// Create <nav> element and add it to the top of the page
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through all the pages and create a link for each one
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // If the URL is internal (not starting with http), prefix it with the base path
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  // Create the <a> element
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Add "current" class if this link matches the current page
  a.classList.toggle("current", a.host === location.host && a.pathname === location.pathname);

  // If it's an external link (like GitHub), open it in a new tab
  a.target = a.host !== location.host ? "_blank" : "";

  // Add the link to the nav
  nav.append(a);
}
