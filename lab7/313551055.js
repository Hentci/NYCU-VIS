// Constants
const DATA_PATH = "http://vis.lab.djosix.com:2024/data/air-pollution.csv";
const POLLUTANT_COLORS = {
    'SO2': ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d'],
    'NO2': ['#eff3ff', '#bdd7e7', '#6baed6', '#2171b5'],
    'O3': ['#edf8e9', '#bae4b3', '#74c476', '#238b45'],
    'CO': ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#6a51a3'],
    'PM10': ['#feedde', '#fdbe85', '#fd8d3c', '#d94701'],
    'PM2.5': ['#f1eef6', '#bdc9e1', '#74a9cf', '#0570b0']
};

// State management
let currentData = null;
let currentPollutant = 'SO2';
let currentYear = '2017';

// Utility functions
const roundTo = (num, decimal) => {
    return Math.round((num + Number.EPSILON) * Math.pow(10, decimal)) / Math.pow(10, decimal);
};

const showLoading = () => {
    const loading = document.getElementById('loading');
    const chart = document.getElementById('horizon-chart');
    if (loading) loading.style.display = 'block';
    if (chart) chart.style.opacity = '0.5';
};

const hideLoading = () => {
    const loading = document.getElementById('loading');
    const chart = document.getElementById('horizon-chart');
    if (loading) loading.style.display = 'none';
    if (chart) chart.style.opacity = '1';
};

// Data processing
const aggregateData = (data, pollutant, year) => {
    const filteredData = data.filter(d => {
        const measurementDate = new Date(d["Measurement date"]);
        return measurementDate.getFullYear() === parseInt(year);
    });
    
    const aggregated = d3.rollup(filteredData,
        group => ({
            val: roundTo(d3.mean(group, d => +d[pollutant]), 4)
        }),
        d => d["Measurement date"].split(" ")[0],
        d => d["Station code"]
    );

    const result = [];
    for (const [date, stations] of aggregated) {
        for (const [station, values] of stations) {
            result.push({
                ts: new Date(date),
                series: station,
                val: values.val
            });
        }
    }

    return result.sort((a, b) => a.ts - b.ts);
};

// Chart rendering
const renderChart = (data) => {
    const container = d3.select('#horizon-chart');
    container.html(''); // Clear previous content

    try {
        // 移除 titleHeight，只使用支援的方法
        const chart = HorizonTSChart()
            .data(data)
            .series('series')
            .height(700)
            .width(Math.min(1600, window.innerWidth - 80));

        // 設置顏色
        if (typeof chart.colors === 'function') {
            chart.colors(POLLUTANT_COLORS[currentPollutant]);
        }

        // 渲染圖表
        container.call(chart);

        // 添加自定義標題
        container.insert('div', ':first-child')
            .attr('class', 'chart-title')
            .style('text-align', 'center')
            .style('font-size', '1.2em')
            .style('margin-bottom', '20px')
            .style('color', '#2c3e50')
            .text(`${currentPollutant} Levels by Station (${currentYear})`);

        // 添加互動效果
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'horizon-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute');

        // 為每個時間序列添加互動
        container.selectAll('.horizon-chart g')
            .on('mouseover', function(event, d) {
                const series = d3.select(this).datum();
                const dateStr = series.ts.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                tooltip.html(`
                    <div>
                        <strong style="color: #2c3e50;">Station:</strong> 
                        <span style="color: #3498db;">${series.series}</span>
                    </div>
                    <div>
                        <strong style="color: #2c3e50;">Date:</strong> 
                        <span>${dateStr}</span>
                    </div>
                    <div>
                        <strong style="color: #2c3e50;">Value:</strong> 
                        <span style="color: #e74c3c;">${series.val.toFixed(4)}</span>
                    </div>
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                
                // 高亮當前序列
                d3.select(this)
                    .style('opacity', 0.7)
                    .style('cursor', 'pointer');
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
                
                // 恢復原始透明度
                d3.select(this)
                    .style('opacity', 1);
            });

        // 清除之前的所有工具提示
        d3.selectAll('.horizon-tooltip').each(function() {
            if (this !== tooltip.node()) {
                d3.select(this).remove();
            }
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

// Event handlers
const handlePollutantChange = (event) => {
    if (event.target.checked) {
        currentPollutant = event.target.value;
        updateVisualization();
    }
};

const handleYearChange = (event) => {
    currentYear = event.target.value;
    updateVisualization();
};

const updateVisualization = () => {
    showLoading();
    try {
        const processedData = aggregateData(currentData, currentPollutant, currentYear);
        renderChart(processedData);
    } catch (error) {
        console.error('Error updating visualization:', error);
        d3.select('#horizon-chart').html(`
            <div class="alert alert-danger">
                Error updating visualization: ${error.message}
            </div>
        `);
    } finally {
        hideLoading();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    document.querySelectorAll('input[name="type"]')
        .forEach(radio => radio.addEventListener('change', handlePollutantChange));
    
    document.getElementById('yearSelect')?.addEventListener('change', handleYearChange);

    // Load data
    showLoading();
    d3.csv(DATA_PATH)
        .then(data => {
            currentData = data;
            updateVisualization();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            d3.select('#horizon-chart').html(`
                <div class="alert alert-danger">
                    Failed to load data: ${error.message}
                </div>
            `);
        })
        .finally(hideLoading);
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateVisualization, 250);
});