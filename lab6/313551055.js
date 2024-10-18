// Constants
const MARGIN = { top: 20, right: 30, bottom: 30, left: 60 };
const WIDTH = 800 - MARGIN.left - MARGIN.right;
const HEIGHT = 500 - MARGIN.top - MARGIN.bottom;
const DATA_PATH = "http://vis.lab.djosix.com:2024/data/ma_lga_12345.csv";

// Create SVG
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("viewBox", `0 0 ${WIDTH + MARGIN.left + MARGIN.right} ${HEIGHT + MARGIN.top + MARGIN.bottom}`)
    .append("g")
    .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

// Parse and process data
function processData(rawData) {
    const processedData = rawData.reduce((acc, row) => {
        const date = moment(row.saledate, "DD/MM/YYYY").toDate();
        if (!acc[date]) {
            acc[date] = {
                date,
                "house with 2 bedrooms": 0,
                "house with 3 bedrooms": 0,
                "house with 4 bedrooms": 0,
                "house with 5 bedrooms": 0,
                "unit with 1 bedrooms": 0,
                "unit with 2 bedrooms": 0,
                "unit with 3 bedrooms": 0,
            };
        }
        const key = `${row.type} with ${row.bedrooms} bedrooms`;
        acc[date][key] = +row.MA;
        return acc;
    }, {});

    return Object.values(processedData).sort((a, b) => a.date - b.date);
}

// Main function
function createVisualization(data) {
    const keys = Object.keys(data[0]).filter(k => k !== "date");
    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeSet2); 

    function updateBlocks() {
        const blocksHtml = keys.map(key => 
            `<div class="list-group-item" style="background-color:${color(key)}" data-key="${key}">${key}</div>`
        ).join("");
        document.getElementById('blocks').innerHTML = blocksHtml;
    }

    function render(currentKeys) {
        svg.selectAll('*').remove();
    
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, WIDTH]);
    
        const y = d3.scaleLinear()
            .domain([-4000000, 4000000])
            .range([HEIGHT, 0]);
    
        const stackedData = d3.stack()
            .offset(d3.stackOffsetSilhouette)
            .keys(currentKeys.slice().reverse())
            (data);
    
        const area = d3.area()
            .x(d => x(d.data.date))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]));
    
        // Draw areas
        svg.selectAll("path")
            .data(stackedData)
            .join("path")
            .attr("class", "myArea")
            .attr("fill", d => color(d.key))
            .attr("d", area)
            .attr("data-key", d => d.key);  // Add data-key attribute for easy selection
    
        // Create a vertical line
        const verticalLine = svg.append("line")
            .attr("class", "vertical-line")
            .attr("y1", 0)
            .attr("y2", HEIGHT)
            .style("stroke", "black")
            .style("stroke-width", 1)
            .style("opacity", 0);
    
        // Create an overlay for mouse events
        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("mousemove", mouseMove);
    
        function mouseOver() {
            verticalLine.style("opacity", 1);
            tooltip.style("opacity", 1);
        }
    
        function mouseOut() {
            verticalLine.style("opacity", 0);
            tooltip.style("opacity", 0);
            d3.selectAll(".myArea").style("opacity", 1);
        }
    
        function mouseMove(event) {
            const [mouseX, mouseY] = d3.pointer(event);
            const date = x.invert(mouseX);
            const bisect = d3.bisector(d => d.date).left;
            const index = bisect(data, date);
            const closestData = data[index];
    
            verticalLine.attr("x1", mouseX).attr("x2", mouseX);
    
            // Find the hovered area
            const hoveredArea = stackedData.find(d => {
                const y0 = y(d[index][0]);
                const y1 = y(d[index][1]);
                return mouseY >= Math.min(y0, y1) && mouseY <= Math.max(y0, y1);
            });
    
            let tooltipContent = `Date: ${moment(closestData.date).format('DD/MM/YYYY')}<br>`;
            currentKeys.forEach(key => {
                const price = closestData[key];
                tooltipContent += `${key}: ${typeof price === 'number' ? '$' + price.toLocaleString() : 'N/A'}<br>`;
            });
    
            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
    
            // Highlight the hovered area
            d3.selectAll(".myArea").style("opacity", 0.2);
            if (hoveredArea) {
                d3.select(`path[data-key="${hoveredArea.key}"]`).style("opacity", 1);
            }
        }
    
        // X-axis
        svg.append("g")
            .attr("transform", `translate(0, ${HEIGHT * 0.8})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.utcFormat("%b %Y")))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#b8b8b8"));
    
        // X-axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", WIDTH)
            .attr("y", HEIGHT + 20)
            .text("Date");
    
        // Y-axis
        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `$${d/1000000}M`))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line").attr("stroke", "#b8b8b8"));
    
        // Y-axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -MARGIN.left + 20)
            .attr("x", -MARGIN.top)
            .text("Median Price");
    }
    
    // ... (rest of the code remains the same)
    
    // Tooltip (move this outside of render function)
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
        updateBlocks();
        render(keys);

    new Sortable(document.getElementById('blocks'), {
        animation: 150,
        onEnd: () => {
            const newKeys = Array.from(document.getElementById('blocks').children)
                .map(div => div.getAttribute('data-key'));
            render(newKeys);
        }
    });

    // Add click event to toggle visibility
    document.getElementById('blocks').addEventListener('click', (event) => {
        if (event.target.classList.contains('list-group-item')) {
            event.target.classList.toggle('disabled');
            const newKeys = Array.from(document.getElementById('blocks').children)
                .filter(div => !div.classList.contains('disabled'))
                .map(div => div.getAttribute('data-key'));
            render(newKeys);
        }
    });
}

// Load and process data
d3.csv(DATA_PATH).then(rawData => {
    const processedData = processData(rawData);
    createVisualization(processedData);
});