// 調整圖表大小，放大1.5倍
const margin = { top: 80, right: 100, bottom: 150, left: 150 },
    width = 900 - margin.left - margin.right,  // 放大寬度
    height = 900 - margin.top - margin.bottom;  // 放大高度

// 路徑和功能變數
const data_path = "http://vis.lab.djosix.com:2024/data/abalone.data";
const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];

// 主要程式入口
d3.text(data_path).then(processData);

function processData(data) {
    const dataBySex = { male: [], female: [], infant: [] };
    const rows = data.split("\n");

    rows.forEach(row => {
        const cols = row.split(",");
        const values = cols.slice(1, 9).map(Number);

        if (cols[0] === "M") dataBySex.male.push(values);
        else if (cols[0] === "F") dataBySex.female.push(values);
        else if (cols[0] === "I") dataBySex.infant.push(values);
    });

    // 計算相關矩陣
    const cm_M = calculateCorrelationMatrix(dataBySex.male);
    const cm_F = calculateCorrelationMatrix(dataBySex.female);
    const cm_I = calculateCorrelationMatrix(dataBySex.infant);

    renderHeatmap(cm_M);  // 預設顯示男性資料

    // 綁定性別選擇的事件
    d3.selectAll('input[name="sex"]').on("change", function () {
        const selectedData = this.value === "male" ? cm_M : this.value === "female" ? cm_F : cm_I;
        renderHeatmap(selectedData);
    });
}

// 計算相關矩陣
function calculateCorrelationMatrix(data) {
    const matrix = math.transpose(data);
    const correlationData = [];

    features.forEach((xFeature, i) => {
        features.forEach((yFeature, j) => {
            correlationData.push({
                x: xFeature,
                y: yFeature,
                value: math.corr(matrix[i], matrix[j]),
            });
        });
    });

    return correlationData;
}

// 渲染熱圖和垂直 color bar
function renderHeatmap(cm) {
    d3.select("#cm").select("svg").remove();

    const x = d3.scaleBand().range([0, width]).domain(features).padding(0.05);
    const y = d3.scaleBand().range([0, height]).domain(features).padding(0.05);

    // 調整顏色插值，藍色對應正相關，紅色對應負相關 (1 到 -1)
    const colorScale = d3.scaleLinear()
        .domain([-1, 0, 1])  // 確保-1為紅色，1為藍色
        .range(["#d73027", "#ffffff", "#4575b4"]);  // 使用更明顯的藍到紅過渡

    const svg = d3.select("#cm").append("svg")
        .attr("width", width + margin.left + margin.right + 60)  // 調整空間放置 color bar
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#cm")
        .append("div")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #000")
        .style("padding", "5px")
        .style("visibility", "hidden");

    svg.selectAll()
        .data(cm)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x))
        .attr("y", d => y(d.y))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d.value))
        .style("stroke-width", 1)
        .style("stroke", "white")
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`Correlation between <b>${d.x}</b> and <b>${d.y}</b>: <br/><b>${d.value.toFixed(2)}</b>`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);

            d3.select(this).style("stroke", "black");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
            d3.select(this).style("stroke", "white");
        });

    // 加入 x 軸標籤，旋轉45度
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // 加入 y 軸標籤
    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    // 垂直 color bar 放置於右側
    const colorBarHeight = height * 0.7;
    const colorBarWidth = 15;

    const colorBar = svg.append("g")
        .attr("class", "colorbar")
        .attr("transform", `translate(${width + 40}, ${height * 0.15})`);  // color bar 右側的位置調整

    // 定義垂直漸變條的比例
    const colorBarScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range([colorBarHeight, 0]);

    // 建立 color bar
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // 顏色範圍，從紅色到藍色
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#d73027");  // 紅色 (負相關)

    linearGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#ffffff");  // 白色 (無相關)

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#4575b4");  // 藍色 (正相關)

    colorBar.append("rect")
        .attr("width", colorBarWidth)
        .attr("height", colorBarHeight)
        .style("fill", "url(#linear-gradient)");

    colorBar.append("g")
        .attr("transform", `translate(${colorBarWidth + 5}, 0)`)
        .call(d3.axisRight(colorBarScale).ticks(5));  // color bar 的刻度
}