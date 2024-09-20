// 讀取資料並繪製平行座標圖
d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv").then(function (dataset) {
    // 去除最後一列（若存在）
    dataset = dataset.slice(0, -1);

    // 調整圖表的邊距與尺寸，增加寬敞度
    const margin = { top: 40, right: 50, bottom: 100, left: 60 };
    const width = 1000 - margin.left - margin.right;  // 增加寬度
    const height = 600 - margin.top - margin.bottom;

    // 設定顏色比例尺，用於區分花的種類
    const colorScale = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#ff6f61", "#6b5b95", "#88b04b"]);

    // 建立SVG元素
    const svg = d3.select("#my_dataviz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 選取數據中的屬性（不包括類別）
    const dimensions = Object.keys(dataset[0]).filter(d => d !== 'class');

    // 為每個屬性建立比例尺
    const yScales = {};
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(dataset, d => +d[dim]))
            .range([height, 0]);
    });

    // X 軸為屬性順序
    const xScale = d3.scalePoint()
        .domain(dimensions)
        .range([0, width])
        .padding(0.5);  // 增加間距

    // 繪製平行線（多線條）以表示每一個樣本
    function path(d) {
        return d3.line()(dimensions.map(p => [xScale(p), yScales[p](+d[p])]));
    }

    // 新增線條，並且以花類別上色
    var lines = svg.selectAll("myPath")
        .data(dataset)
        .enter().append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => colorScale(d.class))
        .style("opacity", 0.7)
        .attr("stroke-width", 1.5);

    // 新增軸並且使之可拖動
    const axis = svg.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xScale(d)})`)
        .each(function (d) { d3.select(this).call(d3.axisLeft(yScales[d])); })
        .call(d3.drag()
            .on("start", function (event, d) {
                d3.select(this).raise().classed("active", true);
            })
            .on("drag", function (event, d) {
                // 根據滑鼠的X位置更新軸的位置
                const draggingDim = xScale.domain().indexOf(d);
                const newX = Math.max(0, Math.min(width, event.x));
                const closestDim = Math.round((newX / width) * (dimensions.length - 1));

                // 更新視覺效果：拉伸/壓扁
                const stretchFactor = Math.abs((event.x - xScale(d)) / 100);  // 拉伸因子
                lines
                    .style("opacity", 0.7 - stretchFactor * 0.5)  // 改變透明度
                    .attr("stroke-width", 1.5 + stretchFactor * 3);  // 改變線條寬度

                if (draggingDim !== closestDim) {
                    // 重新排列維度順序
                    dimensions.splice(draggingDim, 1);
                    dimensions.splice(closestDim, 0, d);

                    // 更新X軸的排序
                    xScale.domain(dimensions);

                    // 更新軸的位置和路徑
                    axis.attr("transform", d => `translate(${xScale(d)})`);
                    svg.selectAll("path").attr("d", path);
                }
            })
            .on("end", function (event, d) {
                d3.select(this).classed("active", false);
                // 恢復正常的透明度和線條寬度
                lines.style("opacity", 0.7).attr("stroke-width", 1.5);
            })
        );

    // 新增軸標籤，並且標註可拖動，並且將顏色設為黑色
    svg.selectAll(".axis")
        .append("text")
        .attr("class", "drag-label") // 加上可拖動的標籤樣式
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black");  // 標籤顏色為黑色

    // 新增圖例來標註類別
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
});