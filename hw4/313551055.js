// Define the path to the data file
const data_path = "../datasets/iris.csv"

// Set up the dimensions and padding for the chart
var size = 270;
var padding = 50;
var topPadding = 70;  // Additional top padding for the legend

// Create linear scales for x and y axes
var x = d3.scaleLinear()
    .range([padding, size - padding / 2]);

var y = d3.scaleLinear()
    .range([size - padding, padding / 2]);

// Create axis generators
var xAxis = d3.axisBottom()
    .scale(x)
    .ticks(6);

var yAxis = d3.axisLeft()
    .scale(y)
    .ticks(6);

// Define color scale for different iris species
const color = d3.scaleOrdinal()
    .domain(["setosa", "versicolor", "virginica"])
    .range(["#FF6347", "#4682B4", "#32CD32"]);

// Define the features to be plotted
const features = ["sepal length", "sepal width", "petal length", "petal width"];

// Function to add axes to each cell
function addAxes(tmp, xScale, yScale, size, padding, p) {
    // Add x-axis
    tmp.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${size - padding})`)
        .call(d3.axisBottom().scale(xScale).ticks(6))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)")
        .style("font-size", "10px");

    // Add y-axis
    tmp.append("g")
        .attr("class", "y axis")
        .attr("transform", `translate(${padding}, 0)`)
        .call(d3.axisLeft().scale(yScale).ticks(6))
        .selectAll("text")
        .style("font-size", "10px");

    // Add x-axis label
    tmp.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", size / 2)
        .attr("y", size - padding / 4)
        .text(p.x)
        .style("font-size", "12px");

    // Add y-axis label
    tmp.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", padding / 4)
        .attr("x", -size / 2)
        .text(p.y)
        .style("font-size", "12px");
}

// Load and process the data
d3.csv(data_path, function (error, data) {
    if (error) throw error;

    // Remove the last data point (assuming it's incomplete or unnecessary)
    data.splice(150, 1);

    // Create an object to store the domain for each trait
    var domainByTrait = {},
        traits = d3.keys(data[0]).filter(function (d) { return d !== "class"; }),
        n = traits.length;

    // Calculate the extent (min and max) for each trait
    traits.forEach(function (trait) {
        domainByTrait[trait] = d3.extent(data, function (d) { return +d[trait]; });
    });

    // Set up the brush
    var brush = d3.brush()
        .on("start", brushstart)
        .on("brush", brushmove)
        .on("end", brushend)
        .extent([[padding, padding], [size - padding / 2, size - padding]]);

    // Create the SVG container
    var svg = d3.select("#my_dataviz").append("svg")
        .attr("width", size * n + padding)
        .attr("height", size * n + padding + topPadding)
        .append("g")
        .attr("transform", "translate(" + padding + "," + (padding / 2 + topPadding) + ")");

    // Create cells for each pair of traits
    var cell = svg.selectAll(".cell")
        .data(cross(traits, traits))
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
        .each(plot);

    // Add brush to each cell
    cell.call(brush);

    // Function to plot either a scatter plot or a histogram in each cell
    function plot(p) {
        var cell = d3.select(this);

        x.domain(domainByTrait[p.x]);
        y.domain(domainByTrait[p.y]);

        if (p.x !== p.y) {
            // Create scatter plot
            var tmp = cell.append('g')
                .attr("transform", `translate(0, 0)`);

            tmp.append("rect")
                .attr("class", "frame")
                .attr("x", padding)
                .attr("y", padding / 2)
                .attr("width", size - padding * 1.5)
                .attr("height", size - padding * 1.5);

            addAxes(tmp, x, y, size, padding, p);

            // Add dots to the scatter plot
            cell.selectAll("circle")
                .data(data)
                .enter().append("circle")
                .attr("cx", function (d) { return x(d[p.x]); })
                .attr("cy", function (d) { return y(d[p.y]); })
                .attr("r", 3)
                .style("fill", function (d) { return color(d.class); })
                .style("fill-opacity", 0.7)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    // Enlarge dot on mouseover
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 5)
                        .style("fill-opacity", 1);

                    // Show tooltip
                    d3.select("#tooltip")
                        .style("opacity", 1)
                        .html(`Class: ${d.class}<br>${p.x}: ${d[p.x]}<br>${p.y}: ${d[p.y]}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    // Restore dot size on mouseout
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 3)
                        .style("fill-opacity", 0.7);

                    // Hide tooltip
                    d3.select("#tooltip").style("opacity", 0);
                });
        } else {
            // Create histogram
            var tmp = cell.append('g')
                .attr("transform", `translate(0, 0)`);

            var x2 = d3.scaleLinear()
                .domain(domainByTrait[p.x])
                .range([padding, size - padding / 2]);

            var histogram = d3.histogram()
                .value(d => +d[p.x])
                .domain(x2.domain())
                .thresholds(x2.ticks(15));

            var bins = histogram(data);

            var y2 = d3.scaleLinear()
                .range([size - padding, padding / 2])
                .domain([0, d3.max(bins, d => d.length)]);

            // Add bars to the histogram
            tmp.selectAll("rect")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", d => x2(d.x0) + 1)
                .attr("transform", d => `translate(0, ${y2(d.length)})`)
                .attr("width", d => x2(d.x1) - x2(d.x0) - 1)
                .attr("height", d => size - padding - y2(d.length))
                .style("fill", "#FFC0CB")
                .attr("stroke", "white");

            tmp.append("rect")
                .attr("class", "frame")
                .attr("x", padding)
                .attr("y", padding / 2)
                .attr("width", size - padding * 1.5)
                .attr("height", size - padding * 1.5);

            addAxes(tmp, x2, y2, size, padding, p);
        }
    }

    // Create legend
    const legendData = [
        { label: "setosa", color: "#FF6347" },
        { label: "versicolor", color: "#4682B4" },
        { label: "virginica", color: "#32CD32" }
    ];

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${size * n - 150}, ${-topPadding})`);

    legendData.forEach(function (d, i) {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
        
        legendRow.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 6)
            .style("fill", d.color);

        legendRow.append("text")
            .attr("x", 12)
            .attr("y", 0)
            .text(d.label)
            .style("font-size", "12px")
            .style("fill", "#000")
            .attr("alignment-baseline", "middle");
    });

    var brushCell;

    // Brush start function
    function brushstart(p) {
        if (brushCell !== this) {
            d3.select(brushCell).call(brush.move, null);
            brushCell = this;
            x.domain(domainByTrait[p.x]);
            y.domain(domainByTrait[p.y]);
        }
    }

    // Brush move function
    function brushmove(p) {
        var e = d3.brushSelection(this);
        svg.selectAll("circle").classed("hidden", function (d) {
            if (!e) {
                return false;
            } else {
                return (
                    e[0][0] > x(+d[p.x]) || x(+d[p.x]) > e[1][0]
                    || e[0][1] > y(+d[p.y]) || y(+d[p.y]) > e[1][1]
                );
            }
        });
    }

    // Brush end function
    function brushend() {
        var e = d3.brushSelection(this);
        if (e === null) svg.selectAll(".hidden").classed("hidden", false);
    }
});

// Helper function to create all possible pairs of traits
function cross(a, b) {
    var c = [], n = a.length, m = b.length, i, j;
    for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
    return c;
}