import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const title = document.querySelector('.projects-title');
title.textContent = `Resume (${projects.length} projects)`;

let selectedIndex = -1;

function renderPieChart(projectsToShow) {
  let rolledData = d3.rollups(
    projectsToShow,
    v => v.length,
    d => d.year
  );

  let data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(data);

  let svg = d3.select('#projects-plot');
  svg.selectAll('path').remove();

  arcData.forEach((d, i) => {
    svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path').attr('class', (_, idx) =>
          selectedIndex === idx ? 'selected' : ''
        );
        d3.select('.legend').selectAll('li').attr('class', (_, idx) =>
          selectedIndex === idx ? 'selected' : ''
        );

        if (selectedIndex === -1) {
          renderProjects(projectsToShow, projectsContainer, 'h2');
        } else {
          let selectedYear = data[selectedIndex].label;
          let filtered = projectsToShow.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }
      });
  });

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', selectedIndex === i ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path').attr('class', (_, idx) =>
          selectedIndex === idx ? 'selected' : ''
        );
        legend.selectAll('li').attr('class', (_, idx) =>
          selectedIndex === idx ? 'selected' : ''
        );

        if (selectedIndex === -1) {
          renderProjects(projectsToShow, projectsContainer, 'h2');
        } else {
          let selectedYear = data[selectedIndex].label;
          let filtered = projectsToShow.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }
      });
  });
}

// --- Search functionality ---
let query = '';
const searchInput = document.querySelector('.searchBar');

searchInput?.addEventListener('input', event => {
  query = event.target.value.toLowerCase();
  let filteredProjects = projects.filter(project => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

// Initial render
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);
