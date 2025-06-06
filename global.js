console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contract/", title: "Contact" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/doku98", title: "GitHub" }
  
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/"; 

// === NAVIGATION MENU ===
let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  a.classList.toggle("current", a.host === location.host && a.pathname === location.pathname);
  a.target = a.host !== location.host ? "_blank" : "";

  nav.append(a);
}

// === DARK MODE SWITCHER ===
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

let select = document.querySelector(".color-scheme select");

// Handle user changing the theme
select.addEventListener("input", function (event) {
  let value = event.target.value;
  setColorScheme(value);
  localStorage.colorScheme = value;
});

// Apply stored theme (if it exists)
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

// Utility function to set color-scheme on root element
function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
}




//  CONTACT FORM FIX ===
let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent default behavior

  let data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    // Properly encode values for URL
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  // Build mailto URL
  let mailto = `${form.action}?${params.join("&")}`;

  // Open email client with pre-filled subject and body
  location.href = mailto;
});


export async function fetchJSON(url) {
    try {
      const response = await fetch(url);
      console.log(response); // you can leave this for now if you want
  
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data;
  
    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }
  
  export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = ''; // Clear the container first
  
    for (let project of projects) {
      const article = document.createElement('article');
  
      article.innerHTML = `
        <${headingLevel}>${project.title}</${headingLevel}>
        <img src="${project.image}" alt="${project.title}">
        <div class="project-text">
          <p>${project.description}</p>
          <p class="year">${project.year}</p>
        </div>
      `;
  
      containerElement.appendChild(article);
    }
  }
  

  export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
  }
  
  

