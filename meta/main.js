import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    const groupedCommits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/vis-society/lab-7/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                writable: false,
                configurable: false,
                enumerable: false
            });

            return ret;
        });

    
    return groupedCommits.sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
    const stats = {
        'Commits': commits.length,
        'Files': new Set(data.map(d => d.file)).size,
        'Total <abbr title="Lines of code">LOC</abbr>': data.length,
        'Longest Line': d3.max(data, d => d.length),
        'Max Lines': d3.max(commits, d => d.totalLines),
    };

    const container = d3.select('#stats');

    // Add title
    container.append('h2')
        .attr('class', 'stats-title')
        .text('Summary');

    // Create bordered container
    const dl = container.append('div')
        .attr('class', 'stats');

    // Add each stat
    for (const [label, value] of Object.entries(stats)) {
        const item = dl.append('div')
            .attr('class', 'stat-item');

        item.append('dt').html(label);
        item.append('dd').text(value);
    }
}

function renderScatterPlot(data, commits) {
    const commitsSorted = d3.sort(commits, (d) => -d.totalLines);

    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const [minLines, maxLines] = d3.extent(commitsSorted, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 30]); 

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commitsSorted, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Create axes and dots
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Create Dots
    const dots = svg.append('g').attr('class', 'dots');

    // Create gridlines
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Add x axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis') // new line to mark the g tag
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis') // just for consistency
        .call(yAxis);

    // Add dots
    dots
        .selectAll('circle')
        .data(commitsSorted, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function renderTooltipContent(commit) {
    if (Object.keys(commit).length === 0) return;

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time-tt');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    link.href = commit.url;
    link.textContent = commit.id;

    if (commit.datetime instanceof Date && !isNaN(commit.datetime)) {
        date.textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
        time.textContent = commit.datetime.toLocaleTimeString('en', { timeStyle: 'short' });
    } else {
        date.textContent = '';
        time.textContent = '';
    }

    author.textContent = commit.author || '';
    lines.textContent = commit.totalLines ?? '';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svgSelection) {
    const brush = d3.brush()
        .extent([[0, 0], [1000, 600]]) // match your SVG size
        .on('start brush end', brushed);

    svgSelection.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Raise dots and anything after overlay
    svgSelection.selectAll('.dots, .overlay ~ *').raise();
}

function renderSelectionCount(selection) {
    const selected = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    document.querySelector('#selection-count').textContent =
        `${selected.length || 'No'} commits selected`;

    return selected;
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type,
    );

    // Update DOM with breakdown
    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle')
        .classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
    if (!selection) return false;

    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').select('svg');

    xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const xAxis = d3.axisBottom(xScale);

    // CHANGE: we should clear out the existing xAxis and then create a new one.
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function updateFileDisplay(filteredCommits) {
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = d3
        .groups(lines, (d) => d.file)
        .map(([name, lines]) => {
            return { name, lines };
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    let filesContainer = d3
        .select('#files')
        .selectAll('div')
        .data(files, (d) => d.name)
        .join(
            // This code only runs when the div is initially rendered
            (enter) =>
                enter.append('div').call((div) => {
                    div.append('dt').append('code');
                    div.append('dd');
                }),
        );

    // This code updates the div info
    filesContainer.select('dt > code').text((d) => d.name);

    filesContainer
        .select('dd')
        .selectAll('div')
        .data((d) => d.lines)
        .join('div')
        .attr('class', 'loc')
        .attr('style', (d) => `--color: ${colors(d.type)}`);
}

let data = await loadData();
let commits = processCommits(data);
let filteredCommits = commits;


let commitProgress = 100;

let timeScale = d3
    .scaleTime()
    .domain([
        d3.min(commits, (d) => d.datetime),
        d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);


function onTimeSliderChange() {
    const slider = document.getElementById('commit-progress');
    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);
    document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString();
    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
}

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
createBrushSelector(d3.select('svg'));

// Set up event listener and initialize on load
const slider = document.getElementById('commit-progress');
slider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange(); // initialize display

d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
        (d, i) => `
		On ${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short',
        })},
		I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
            }</a>.
		I edited ${d.totalLines} lines across ${d3.rollups(
                d.lines,
                (D) => D.length,
                (d) => d.file,
            ).length
            } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
);

function onStepEnter(response) {
    const commit = response.element.__data__; 
    const currentTime = commit.datetime;

    filteredCommits = commits.filter(d => d.datetime <= currentTime);
    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);
}

const scroller = scrollama();
scroller
    .setup({
        container: '#scrolly-1',
        step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);