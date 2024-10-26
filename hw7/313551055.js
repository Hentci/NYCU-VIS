// Data source URL
const DATA_PATH = "../datasets/air-pollution.csv";

// Global state management
let currentData = null;         // Stores raw data from CSV
let currentPollutant = 'SO2';   // Currently selected pollutant
let currentYear = '2017';       // Currently selected year
let currentTooltip = null;      // Current tooltip instance

// Utility: Format date to readable string
const formatDate = date => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});

// Utility: Toggle loading state and chart opacity
const toggleLoading = show => {
    const loading = document.getElementById('loading');
    const chart = document.getElementById('horizon-chart');
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (chart) chart.style.opacity = show ? '0.5' : '1';
};

// Utility: Round number to specified decimal places
const roundTo = (num, decimal) => {
    return Math.round((num + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
};

// Data processing
const aggregateData = (data, pollutant, year) => {
    if (!data || !pollutant || !year) return [];

    try {
        // Filter data for specified year and ensure pollutant values are valid numbers
        const filteredData = data.filter(d => {
            const date = new Date(d["Measurement date"]);
            return date.getFullYear() === parseInt(year) && !isNaN(+d[pollutant]);
        });

        // Group data by date and station, calculate mean values
        const aggregated = d3.rollup(filteredData,
            group => ({
                val: roundTo(d3.mean(group, d => +d[pollutant]), 4)
            }),
            d => d["Measurement date"].split(" ")[0],
            d => d["Station code"]
        );

        // Transform aggregated data into array format for chart
        return Array.from(aggregated)
            .flatMap(([date, stations]) =>
                Array.from(stations).map(([station, values]) => ({
                    ts: new Date(date),
                    series: station,
                    val: values.val
                }))
            )
            .sort((a, b) => a.ts - b.ts);
    } catch (error) {
        console.error('Data aggregation error:', error);
        return [];
    }
};

// Create tooltip container
const createTooltip = () => {
    if (currentTooltip) currentTooltip.remove();
    
    return d3.select('body')
        .append('div')
        .attr('class', 'horizon-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute');
};

// Update tooltip content
const updateTooltipContent = (tooltip, data) => {
    tooltip.html(`
        <div class="tooltip-content">
            <div><strong>Station:</strong> <span>${data.series}</span></div>
            <div><strong>Date:</strong> <span>${formatDate(data.ts)}</span></div>
            <div><strong>Value:</strong> <span>${roundTo(data.val, 4)}</span></div>
        </div>
    `);
};

// Render horizon chart
const renderChart = data => {
    const container = d3.select('#horizon-chart');
    container.html('');

    try {
        if (!data?.length) throw new Error('No data available');

        const chartWidth = Math.min(1600, Math.max(800, window.innerWidth - 80));
        
        // Initialize and render chart
        const chart = HorizonTSChart()
            .data(data)
            .series('series')
            .height(700)
            .width(chartWidth);

        container.call(chart);

        // Add title
        container.insert('div', ':first-child')
            .attr('class', 'chart-title')
            .text(`${currentPollutant} Levels by Station (${currentYear})`);

        // Setup tooltips
        const tooltip = createTooltip();
        
        container.selectAll('.horizon-chart g')
            .on('mouseover', function(event) {
                const series = d3.select(this).datum();
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                
                updateTooltipContent(tooltip, series);
                
                d3.select(this)
                    .style('opacity', 0.7)
                    .style('cursor', 'pointer');

                tooltip
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mousemove', event => {
                tooltip
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                
                d3.select(this).style('opacity', 1);
            });

        return chart;
    } catch (error) {
        console.error('Error rendering chart:', error);
        container.html(`
            <div class="alert alert-danger">
                <h5>Failed to render chart</h5>
                <p>${error.message}</p>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="updateVisualization()">
                    Retry
                </button>
            </div>
        `);
        return null;
    }
};

// Update visualization
const updateVisualization = () => {
    toggleLoading(true);
    try {
        renderChart(aggregateData(currentData, currentPollutant, currentYear));
    } catch (error) {
        console.error('Error updating visualization:', error);
        d3.select('#horizon-chart').html(`
            <div class="alert alert-danger">
                Error updating visualization: ${error.message}
            </div>
        `);
    } finally {
        toggleLoading(false);
    }
};

// Initialize application
const init = async () => {
    try {
        // Setup event listeners
        document.querySelectorAll('input[name="type"]')
            .forEach(radio => radio.addEventListener('change', e => {
                if (e.target.checked) {
                    currentPollutant = e.target.value;
                    updateVisualization();
                }
            }));
        
        document.getElementById('yearSelect')?.addEventListener('change', e => {
            currentYear = e.target.value;
            updateVisualization();
        });

        // Load data and render
        toggleLoading(true);
        currentData = await d3.csv(DATA_PATH);
        updateVisualization();
    } catch (error) {
        console.error('Initialization error:', error);
        d3.select('#horizon-chart').html(`
            <div class="alert alert-danger">
                <h5>Failed to initialize</h5>
                <p>${error.message}</p>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="init()">
                    Retry
                </button>
            </div>
        `);
    } finally {
        toggleLoading(false);
    }
};

// Handle window resize
window.addEventListener('resize', (() => {
    let timeoutId;
    return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(updateVisualization, 250);
    };
})());

// Start the application
document.addEventListener('DOMContentLoaded', init);