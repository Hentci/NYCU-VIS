// 讀取資料並繪製散點圖
d3.csv("./iris.csv").then(function (dataset) {
    // 去除最後一列（若存在）
    dataset = dataset.slice(0, -1);

    // 設定圖表的邊距與尺寸
    const margin = { top: 40, right: 30, bottom: 100, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // 預設 X 和 Y 軸標籤
    let xAxisLabel = "sepal length";
    let yAxisLabel = "sepal width";

    // 初始繪製散點圖
    drawScatterPlot();

    // 繪製散點圖的函數
    function drawScatterPlot() {
        // 清除舊的 SVG 以便重新繪製
        d3.select("#my_dataviz").select("svg").remove();

        // 新增 SVG 元素
        const svg = d3.select("#my_dataviz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // 計算 X 和 Y 軸的最大最小值
        const xExtent = d3.extent(dataset, d => +d[xAxisLabel]);
        const yExtent = d3.extent(dataset, d => +d[yAxisLabel]);

        // 定義 X 軸比例尺
        const xScale = d3.scaleLinear()
            .domain([Math.floor(xExtent[0]), Math.ceil(xExtent[1])])
            .range([0, width]);

        // 定義 Y 軸比例尺
        const yScale = d3.scaleLinear()
            .domain([Math.floor(yExtent[0]), Math.ceil(yExtent[1])])
            .range([height, 0])
            .nice();

        // 繪製 X 軸
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale).tickSize(-height * 1.2).ticks(10))
            .select(".domain").remove();

        // 繪製 Y 軸
        svg.append("g")
            .call(d3.axisLeft(yScale).tickSize(-width * 1.2).ticks(7))
            .select(".domain").remove();

        // 繪製 X 軸標籤
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .attr("text-anchor", "middle")
            .text(xAxisLabel);

        // 繪製 Y 軸標籤
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .text(yAxisLabel);

        // 定義顏色比例尺
        const colorScale = d3.scaleOrdinal()
            .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
            .range(["#ff6f61", "#6b5b95", "#88b04b"]);

        // 新增散點
        svg.append("g")
            .selectAll("circle")
            .data(dataset)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(+d[xAxisLabel]))
            .attr("cy", d => yScale(+d[yAxisLabel]))
            .attr("r", 5)
            .style("fill", d => colorScale(d.class))
            .style("opacity", 0.8);

        // 新增工具提示
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden");

        // 在散點上添加互動
        svg.selectAll("circle")
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible")
                    .text(`${xAxisLabel}: ${d[xAxisLabel]}, ${yAxisLabel}: ${d[yAxisLabel]}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });

        // 新增圖例
        const legend = svg.selectAll(".legend")
            .data(colorScale.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(0,${i * 20})`);

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colorScale);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(d => d);
    }

    // 事件監聽器：當用戶改變 X 或 Y 軸選項時更新圖表
    document.querySelectorAll('input[name="X_axis"], input[name="Y_axis"]').forEach(radioButton => {
        radioButton.addEventListener('change', function () {
            if (this.name === "X_axis") xAxisLabel = this.value;
            if (this.name === "Y_axis") yAxisLabel = this.value;
            drawScatterPlot(); // 更新圖表
        });
    });
});