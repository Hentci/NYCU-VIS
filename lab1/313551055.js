// 讀取資料並執行
d3.csv("http://vis.lab.djosix.com:2024/data/iris.csv").then(function(data) {
    data = data.slice(0, -1)

    // 設定圖表的邊界與尺寸
    var margin = { top: 20, right: 20, bottom: 90, left: 50 },
        width = 520 - margin.left - margin.right,
        height = 560 - margin.top - margin.bottom;

    let x_label = "sepal length"
    let y_label = "sepal width"

    // 初始繪製散點圖
    scatter();

    function scatter() {
        // 清除舊的 svg
        d3.select("#my_dataviz").select('svg').remove()

        // 新增 svg
        var svg = d3.select("#my_dataviz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // 設定 X 和 Y 軸的最大最小值，使用 D3 的 max 與 min 來取得
        let x_max = d3.max(data, d => +d[x_label]);
        let x_min = d3.min(data, d => +d[x_label]);
        let y_max = d3.max(data, d => +d[y_label]);
        let y_min = d3.min(data, d => +d[y_label]);

        // 建立 X 軸
        var x = d3.scaleLinear()
            .domain([Math.floor(x_min), Math.ceil(x_max)])
            .range([0, width]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(-height * 1.3).ticks(10))
            .select(".domain").remove();

        // 建立 Y 軸
        var y = d3.scaleLinear()
            .domain([Math.floor(y_min), Math.ceil(y_max)])
            .range([height, 0])
            .nice();

        svg.append("g")
            .call(d3.axisLeft(y).tickSize(-width * 1.3).ticks(7))
            .select(".domain").remove();

        // 設定 X 軸與 Y 軸標籤
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.top + 20)
            .text(x_label);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text(y_label);

        // 設定顏色
        var color = d3.scaleOrdinal()
            .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
            .range(["#ff6f61", "#6b5b95", "#88b04b"]); 

        // 新增圖例
        var legends = ["setosa", "versicolor", "virginica"];
        legends.forEach((legend, i) => {
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2 + i * 100 - 100)
                .attr("y", height + margin.top + 50)
                .text(legend)
                .style("fill", color(legend));
        });

        // 新增散點
        svg.append('g')
            .selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(+d[x_label]))
            .attr("cy", d => y(+d[y_label]))
            .attr("r", 5)
            .style("fill", d => color(d["class"]));

        // 新增工具提示（Tooltip）
        var tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "lightgray")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("visibility", "hidden");

        svg.selectAll("circle")
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible").text(`${x_label}: ${d[x_label]}, ${y_label}: ${d[y_label]}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });
    }

    // 事件監聽
    document.querySelectorAll('input[name="X_axis"], input[name="Y_axis"]').forEach(radioButton => {
        radioButton.addEventListener('change', function () {
            if (this.name === "X_axis") x_label = this.value;
            if (this.name === "Y_axis") y_label = this.value;
            scatter();  // 只更新散點圖
        });
    });
});