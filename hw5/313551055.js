// 設定圖表尺寸和邊距
const margin = { top: 80, right: 20, bottom: 50, left: 300 };
const width = 1500 - margin.left - margin.right;
const height = 20000 - margin.top - margin.bottom;

// 創建SVG元素
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 1500 20000`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// 設定數據路徑和相關常量
const dataPath = "../datasets/TIMES_WorldUniversityRankings_2024.csv";
const keys = ["scores_teaching", "scores_research", "scores_citations", "scores_industry_income", "scores_international_outlook"];
const color = d3.scaleOrdinal(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]);

// 資料處理函數：過濾和格式化數據
function processData(data) {
    return data.filter(d => d.rank !== "Reporter")
               .map(d => ({
                   name: d.name,
                   scores_overall: +d.scores_overall.split("–")[0],
                   ...keys.reduce((obj, key) => ({ ...obj, [key]: +d[key] }), {})
               }));
}

// 排序函數：根據選擇的指標和順序排序數據
function sortData(data, sortBy, sortOrder) {
    return data.sort((a, b) => sortOrder === "descending" ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
}

// 渲染堆疊條形圖
function renderStackedBarCharts(data) {
    svg.selectAll('*').remove(); // 清除現有的圖表元素

    const stack = d3.stack().keys(keys);
    const stackedData = stack(data);

    // 設定 x 和 y 軸的比例尺
    const xScale = d3.scaleLinear().domain([0, 500]).range([0, width]);
    const yScale = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.2);

    // 繪製網格線
    const gridLine = () => d3.axisBottom().scale(xScale);
    svg.append("g")
       .attr("class", "grid")
       .call(gridLine().tickSize(height).tickFormat("").ticks(8));

    // 創建工具提示
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // 繪製堆疊條形圖
    svg.append("g")
       .selectAll("g")
       .data(stackedData)
       .join("g")
       .attr("fill", d => color(d.key))
       .attr("class", d => d.key.replace("scores_", ""))
       .selectAll("rect")
       .data(d => d)
       .join("rect")
       .attr("x", d => xScale(d[0]))
       .attr("y", d => yScale(d.data.name))
       .attr("height", yScale.bandwidth())
       .transition() // 添加過渡動畫
       .duration(1000) // 過渡時間為1秒
       .attr("width", d => xScale(d[1]) - xScale(d[0]))
       .selection() // 返回選擇以添加事件監聽器
       .on("mouseover", (event, d) => {
           // 處理滑鼠懸停事件，顯示工具提示
           const score = (d[1] - d[0]).toFixed(1);
           const total = d3.sum(keys, key => d.data[key]).toFixed(1);
           tooltip.transition()
               .duration(200)
               .style("opacity", .9);
           tooltip.html(`${d.data.name}<br>${d3.select(event.currentTarget.parentNode).datum().key.replace("scores_", "")}: ${score}<br>Total: ${total}`)
               .style("left", (event.pageX) + "px")
               .style("top", (event.pageY - 28) + "px");
           d3.select(event.currentTarget).style("opacity", 0.5);
       })
       .on("mouseout", (event) => {
           // 處理滑鼠移出事件，隱藏工具提示
           tooltip.transition()
               .duration(500)
               .style("opacity", 0);
           d3.select(event.currentTarget).style("opacity", 1);
       });

    // 設置 x 軸
    svg.append('g')
       .attr("transform", `translate(0, ${height})`)
       .call(d3.axisBottom(xScale).ticks(7).tickSize(0).tickPadding(6).tickFormat(d3.format(".1s")))
       .call(g => g.select(".domain").remove());

    // 設置 y 軸
    svg.append('g')
       .call(d3.axisLeft(yScale).tickSize(0).tickPadding(8));

    // 添加 x 軸標籤
    svg.append("text")
       .attr("class", "chart-label")
       .attr("x", width / 2)
       .attr("y", height + margin.bottom / 2)
       .attr("text-anchor", "middle")
       .text("Score (0~100)");

    // 添加圖表標題
    svg.append("text")
       .attr("class", "chart-title")
       .attr("x", -(margin.left) * 0.8)
       .attr("y", -(margin.top) / 1.5)
       .attr("text-anchor", "start")
       .text("Times World University Rankings 2024");

    // 添加圖例
    const legendData = [
        { color: "#1f77b4", text: "teaching" },
        { color: "#ff7f0e", text: "research" },
        { color: "#2ca02c", text: "citations" },
        { color: "#d62728", text: "industry income" },
        { color: "#9467bd", text: "international outlook" }
    ];

    const legend = svg.selectAll(".legend")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${-(margin.left) * 0.8 + i * 100}, ${-(margin.top / 2)})`);

    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", d => d.color);

    legend.append("text")
        .attr("x", 20)
        .attr("y", 5)
        .attr("dy", ".35em")
        .text(d => d.text);
}

// 主函數
function main() {
    d3.csv(dataPath).then(data => {
        const processedData = processData(data);

        function updateChart() {
            const sortBy = document.querySelector("#sort-by").value;
            const sortOrder = document.querySelector("#sort-order").value;
            const sortedData = sortData(processedData, sortBy, sortOrder);
            renderStackedBarCharts(sortedData);
        }

        // 為兩個選擇框添加事件監聽器
        document.querySelector("#sort-by").addEventListener("change", updateChart);
        document.querySelector("#sort-order").addEventListener("change", updateChart);

        // 初始渲染
        updateChart();
    });
}

// 執行主函數
main();