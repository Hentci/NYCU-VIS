// 定義 D3.js 的 Sankey 圖表生成器
d3.sankey = function () {
    // 初始化基本變數
    var sankey = {},            // Sankey 物件本身
        nodeWidth = 24,         // 節點寬度
        nodePadding = 8,        // 節點之間的垂直間距
        size = [1, 1],          // 圖表的尺寸 [寬, 高]
        nodes = [],             // 儲存所有節點
        links = [],             // 儲存所有連接
        attributeOrder = [];     // 屬性的順序列表

    // Getter/Setter 方法：設置或獲取節點寬度
    sankey.nodeWidth = function (_) {
        if (!arguments.length) return nodeWidth;  // 如果沒有參數，返回當前值
        nodeWidth = +_;                          // 設置新值（轉換為數字）
        return sankey;                          // 返回 sankey 物件，支持鏈式調用
    };

    // Getter/Setter 方法：設置或獲取節點間距
    sankey.nodePadding = function (_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_;
        return sankey;
    };

    // Getter/Setter 方法：設置或獲取節點列表
    sankey.nodes = function (_) {
        if (!arguments.length) return nodes;
        nodes = _;
        return sankey;
    };

    // Getter/Setter 方法：設置或獲取連接列表
    sankey.links = function (_) {
        if (!arguments.length) return links;
        links = _;
        return sankey;
    };

    // Getter/Setter 方法：設置或獲取圖表尺寸
    sankey.size = function (_) {
        if (!arguments.length) return size;
        size = _;
        return sankey;
    };

    // 計算圖表佈局
    sankey.layout = function (iterations) {
        computeNodeLinks();       // 計算節點間的連接關係
        computeNodeValues();      // 計算節點的值
        computeNodeBreadths();    // 計算節點的水平位置
        computeNodeDepths(iterations);  // 計算節點的垂直位置
        computeLinkDepths();      // 計算連接的垂直位置
        computeColorID();         // 計算顏色 ID
        return sankey;
    };

    // 重新計算連接的位置（用於拖動時更新）
    sankey.relayout = function () {
        computeLinkDepths();
        return sankey;
    };

    // 生成連接路徑的函數
    sankey.link = function () {
        var curvature = 0.5;  // 連接線的曲率

        // 生成 SVG 路徑
        function link(d) {
            var x0 = d.source.x + d.source.dx,  // 起點 x 座標
                x1 = d.target.x,                // 終點 x 座標
                xi = d3.interpolateNumber(x0, x1),  // x 座標插值函數
                x2 = xi(curvature),             // 控制點 1
                x3 = xi(1 - curvature),         // 控制點 2
                y0 = d.source.y + d.sy + d.dy / 2,  // 起點 y 座標
                y1 = d.target.y + d.ty + d.dy / 2;  // 終點 y 座標

            // 返回 SVG 路徑字串
            return 'M' + x0 + ',' + y0 +     // 起點
                   'C' + x2 + ',' + y0 +     // 第一控制點
                   ' ' + x3 + ',' + y1 +     // 第二控制點
                   ' ' + x1 + ',' + y1;      // 終點
        }

        // Getter/Setter 方法：設置或獲取曲率
        link.curvature = function (_) {
            if (!arguments.length) return curvature;
            curvature = +_;
            return link;
        };

        return link;
    };

    // 計算節點間的連接關係
    function computeNodeLinks() {
        // 初始化每個節點的連接數組
        nodes.forEach(function (node) {
            node.sourceLinks = [];  // 從該節點出發的連接
            node.targetLinks = [];  // 到達該節點的連接
        });

        // 建立節點之間的連接關係
        links.forEach(function (link) {
            var source = link.source,
                target = link.target;
            // 如果 source/target 是索引號，將其轉換為實際的節點對象
            if (typeof source === 'number')
                source = link.source = nodes[link.source];
            if (typeof target === 'number')
                target = link.target = nodes[link.target];
            // 將連接添加到相應節點的連接列表中
            source.sourceLinks.push(link);  // 添加到源節點的出連接列表
            target.targetLinks.push(link);  // 添加到目標節點的入連接列表
        });
    }

    // 計算每個節點的值（大小）
    function computeNodeValues() {
        nodes.forEach(function (node) {
            // 取出連接和入連接值的最大值作為節點值
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),  // 出連接值總和
                d3.sum(node.targetLinks, value)   // 入連接值總和
            );
        });
    }

    // 計算節點的水平位置（breadth）
    function computeNodeBreadths() {
        // 定義屬性的順序
        attributeOrder = [
            'buying',
            'maintenance',
            'doors',
            'persons',
            'luggage boot',
            'safety',
        ];

        // 遍歷每個屬性
        attributeOrder.forEach(function (attribute, i) {
            // 找出屬於當前屬性的所有節點
            var nodesForAttribute = nodes.filter(
                function (node) {
                    return node.name.startsWith(attribute);
                }
            );

            // 設置這些節點的水平位置
            nodesForAttribute.forEach(function (node) {
                node.x = i;                 // 設置 x 座標
                node.dx = nodeWidth;        // 設置節點寬度
            });
        });

        // 將終點節點移到最右側
        moveSinksRight(attributeOrder.length);

        // 根據圖表寬度縮放節點的水平位置
        scaleNodeBreadths(
            (size[0] - nodeWidth) /
            (attributeOrder.length - 1)
        );
    }

    // 將源節點（沒有入連接的節點）向右移動
    function moveSourcesRight() {
        nodes.forEach(function (node) {
            if (!node.targetLinks.length) {  // 如果是源節點
                node.x = d3.min(node.sourceLinks, function (d) {
                    return d.target.x;
                }) - 1;
            }
        });
    }

    // 將終點節點（沒有出連接的節點）移到最右側
    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            if (!node.sourceLinks.length) {  // 如果是終點節點
                node.x = x - 1;
            }
        });
    }

    // 縮放節點的水平位置以適應圖表寬度
    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            node.x *= kx;  // 應用縮放係數
        });
    }

    // 計算節點的垂直位置
    function computeNodeDepths(iterations) {
        // 按 x 座標將節點分組
        var nodesByBreadth = d3
            .nest()
            .key(function (d) {
                return d.x;
            })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) {
                return d.values;
            });

        // 執行迭代優化過程
        initializeNodeDepth();       // 初始化垂直位置
        resolveCollisions();         // 解決節點重疊
        for (
            var alpha = 1;           // 鬆弛因子
            iterations > 0;
            --iterations
        ) {
            relaxRightToLeft((alpha *= 0.99));  // 從右到左調整
            resolveCollisions();                // 解決重疊
            relaxLeftToRight(alpha);            // 從左到右調整
            resolveCollisions();                // 再次解決重疊
        }

        function initializeNodeDepth() {
            var ky = d3.min(
                nodesByBreadth,
                function (nodes) {
                    return (
                        (size[1] -
                            (nodes.length - 1) * nodePadding) /
                        d3.sum(nodes, value)
                    );
                }
            );

            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node, i) {
                    node.y = i;
                    node.dy = node.value * ky;
                });
            });

            links.forEach(function (link) {
                link.dy = link.value * ky;
            });
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (
                nodes,
                breadth
            ) {
                nodes.forEach(function (node) {
                    if (node.targetLinks.length) {
                        var y =
                            d3.sum(
                                node.targetLinks,
                                weightedSource
                            ) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedSource(link) {
                return center(link.source) * link.value;
            }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth
                .slice()
                .reverse()
                .forEach(function (nodes) {
                    nodes.forEach(function (node) {
                        if (node.sourceLinks.length) {
                            var y =
                                d3.sum(
                                    node.sourceLinks,
                                    weightedTarget
                                ) /
                                d3.sum(node.sourceLinks, value);
                            node.y +=
                                (y - center(node)) * alpha;
                        }
                    });
                });

            function weightedTarget(link) {
                return center(link.target) * link.value;
            }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node,
                    dy,
                    y0 = 0,
                    n = nodes.length,
                    i;

                // Push any overlapping nodes down.
                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy;
                    y0 = node.y + node.dy + nodePadding;
                }

                // If the bottommost node goes outside the bounds, push it back up.
                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;

                    // Push any overlapping nodes back up.
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy =
                            node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) {
            return a.y - b.y;
        }
    }

    function computeLinkDepths() {
        nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);
        });
        nodes.forEach(function (node) {
            var sy = 0,
                ty = 0;
            node.sourceLinks.forEach(function (link) {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach(function (link) {
                link.ty = ty;
                ty += link.dy;
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }
    }

    function computeColorID() {
        attributeOrder.forEach(function (attribute) {
            var nodesForAttribute = nodes.filter(
                function (node) {
                    return node.name.startsWith(attribute);
                }
            );

            // Sort nodes based on their y values
            nodesForAttribute.sort((a, b) => a.y - b.y);
            nodesForAttribute.forEach((node, index) => {
                node.cid = index;
            });
        });
    }

    function center(node) {
        return node.y + node.dy / 2;
    }

    function value(link) {
        return link.value;
    }

    return sankey;
};

(function (d3$1) {
    'use strict';

    // Store original positions and references
    let originalNodePositions = [];
    let currentSvg = null;
    let currentGraph = null;

    const svg = d3$1.select('#sankey-diagram');
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const margin = {
        top: 50,
        right: 50,
        bottom: 150,
        left: 50,
    };

    const diagramWidth = width - margin.left - margin.right;
    const diagramHeight = height - margin.top - margin.bottom;

    const sankey = d3.sankey()
        .nodeWidth(10)
        .nodePadding(2)
        .size([diagramWidth, diagramHeight]);

    const path = sankey.link();

    const colorScales = {
        "buying": ['hsl(0, 100%, 80%)', 'hsl(0, 100%, 70%)', 'hsl(0, 100%, 60%)', 'hsl(0, 100%, 50%)'],
        "maintenance": ['hsl(30, 100%, 80%)', 'hsl(30, 100%, 70%)', 'hsl(30, 100%, 60%)', 'hsl(30, 100%, 50%)'],
        "doors": ['hsl(60, 100%, 80%)', 'hsl(60, 100%, 70%)', 'hsl(60, 100%, 60%)', 'hsl(60, 100%, 50%)'],
        "persons": ['hsl(120, 100%, 70%)', 'hsl(120, 100%, 60%)', 'hsl(120, 100%, 50%)'],
        'luggage boot': ['hsl(180, 100%, 70%)', 'hsl(180, 100%, 60%)', 'hsl(180, 100%, 50%)'],
        "safety": ['hsl(240, 100%, 70%)', 'hsl(240, 100%, 60%)', 'hsl(240, 100%, 50%)'],
    };

    function dragmove(d) {
        d3.select(this).attr(
            'transform',
            `translate(${margin.left + d.x},${margin.top + (d.y = Math.max(0, Math.min(diagramHeight, d3.event.y)))})`
        );
        sankey.relayout();
        svg.selectAll('.link').attr('d', path);
    }

    function resetView() {
        if (!currentGraph || originalNodePositions.length === 0) return;

        svg.selectAll('.node')
            .transition()
            .duration(750)
            .attr('transform', d => {
                const originalPos = originalNodePositions.find(pos => pos.name === d.name);
                if (originalPos) {
                    d.y = originalPos.y;
                    return `translate(${margin.left + d.x},${margin.top + d.y})`;
                }
                return `translate(${margin.left + d.x},${margin.top + d.y})`;
            });

        svg.selectAll('.link')
            .transition()
            .duration(750)
            .attr('d', path);
    }

    const render = (graph) => {


        const tooltip = d3.select("body").append("div").attr("class", "tooltip");

        svg.selectAll('*').remove();
        
        currentGraph = graph;
        
        var nodeMap = {};
        graph.nodes.forEach(function(x) {
            nodeMap[x.name] = x;
        });
        
        graph.links = graph.links.map(function(x) {
            return {
                source: nodeMap[x.source],
                target: nodeMap[x.target],
                value: x.value,
            };
        });

        sankey.nodes(graph.nodes)
            .links(graph.links)
            .layout(32);

        originalNodePositions = graph.nodes.map(node => ({
            name: node.name,
            y: node.y
        }));

        const linkGroups = {};
        graph.links.forEach((link) => {
            const key = link.source.name + '-' + link.target.name;
            if (!linkGroups[key]) {
                linkGroups[key] = [];
            }
            linkGroups[key].push(link);
        });

        const link = svg.append('g')
        .selectAll('.link')
        .data(graph.links)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', path)
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .style('stroke-width', d => Math.max(1, d.dy))
        .sort((a, b) => b.dy - a.dy)
        // 在這裡加入以下的滑鼠事件處理程式
        .on('mouseover', function(d) {
            // 計算總流量
            const totalSourceFlow = d3.sum(d.source.sourceLinks, l => l.value);
            const totalTargetFlow = d3.sum(d.target.targetLinks, l => l.value);
            
            // 計算比例
            const sourceRatio = (d.value / totalSourceFlow * 100).toFixed(1);
            const targetRatio = (d.value / totalTargetFlow * 100).toFixed(1);

            // 更新 tooltip 內容
            tooltip.html(`
                <div class="tooltip-content">
                    <div class="tooltip-row">
                        <span class="tooltip-label">From:</span>
                        <span class="tooltip-value">${d.source.name.split('-')[1]}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">To:</span>
                        <span class="tooltip-value">${d.target.name.split('-')[1]}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">Count:</span>
                        <span class="tooltip-value">${d.value}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">Source Ratio:</span>
                        <span class="tooltip-value">${sourceRatio}%</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">Target Ratio:</span>
                        <span class="tooltip-value">${targetRatio}%</span>
                    </div>
                </div>
            `);

            // 設定 tooltip 位置
            const [mouseX, mouseY] = d3.mouse(document.body);
            tooltip
                .style('left', `${mouseX + 10}px`)
                .style('top', `${mouseY - 10}px`)
                .style('opacity', 1);

            // 突顯當前連接
            d3.select(this)
                .style('stroke-opacity', 0.5);
        })
        .on('mousemove', function() {
            // 更新 tooltip 位置
            const [mouseX, mouseY] = d3.mouse(document.body);
            tooltip
                .style('left', `${mouseX + 10}px`)
                .style('top', `${mouseY - 10}px`);
        })
        .on('mouseout', function() {
            // 隱藏 tooltip
            tooltip
                .style('opacity', 0);

            // 恢復連接原本的樣式
            d3.select(this)
                .style('stroke-opacity', 0.2);
        });

        const node = svg.append('g')
            .selectAll('.node')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => 
                `translate(${margin.left + d.x},${margin.top + d.y})`
            )
            .call(
                d3.drag()
                    .subject(d => d)
                    .on('start', function() { 
                        this.parentNode.appendChild(this); 
                    })
                    .on('drag', dragmove)
            );

        node.append('rect')
            .attr('height', d => d.dy)
            .attr('width', sankey.nodeWidth())
            .style('fill', d => {
                const colorScale = colorScales[d.name.split('-')[0]];
                return (d.color = colorScale[d.cid]);
            })
            .style('stroke', d => d3.rgb(d.color).darker(2));

        node.append('text')
            .attr('x', -6)
            .attr('y', d => d.dy / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .attr('transform', null)
            .text(d => d.name.split('-')[1])
            .filter(d => d.x < width / 2)
            .attr('x', 6 + sankey.nodeWidth())
            .attr('text-anchor', 'start');

        svg.selectAll('.attribute-title')
            .data(graph.nodes.filter(d => d.cid === 0))
            .enter()
            .append('text')
            .attr('class', 'attribute-title')
            .attr('x', d => margin.left + d.x)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .text(d => d.name.split('-')[0]);

        
            // 定義圖例配置
            const legendConfig = {
                columns: 2,  // 分成兩列
                columnWidth: 150,  // 每列寬度
                verticalSpacing: 25,  // 垂直間距
                itemHeight: 18,  // 每個項目高度
                leftPadding: -350  // 向左移動的距離
            };

            // 修改 legendGroup 的位置
            const legendGroup = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${width}, 80)`);

            // 添加圖例標題
            legendGroup.append('text')
                .attr('class', 'legend-title')
                .attr('x', legendConfig.columnWidth / 2)  // 置中標題
                .attr('y', -20)
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text('Attributes Legend');

            // 為每個屬性創建圖例項
            Object.entries(colorScales).forEach(([attribute, colors], index) => {
                // 計算列和行位置
                const column = Math.floor(index / 3);  // 每3個屬性換一列
                const row = index % 3;  // 在當前列中的位置

                const attributeGroup = legendGroup.append('g')
                    .attr('transform', `translate(${column * legendConfig.columnWidth}, ${row * (colors.length + 1) * legendConfig.verticalSpacing})`);

                // 添加屬性名稱
                attributeGroup.append('text')
                    .attr('x', 0)
                    .attr('y', 0)
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .text(attribute);

                // 為每個顏色值創建圖例項
                colors.forEach((color, colorIndex) => {
                    const legendItem = attributeGroup.append('g')
                        .attr('transform', `translate(0, ${(colorIndex + 1) * legendConfig.itemHeight})`);

                    // 添加顏色方塊
                    legendItem.append('rect')
                        .attr('width', 15)
                        .attr('height', 15)
                        .attr('rx', 2)
                        .style('fill', color);

                    // 找到對應的節點來獲取實際值
                    const node = graph.nodes.find(n => 
                        n.name.startsWith(attribute) && n.cid === colorIndex
                    );
                    
                    // 添加文字標籤
                    legendItem.append('text')
                        .attr('x', 25)
                        .attr('y', 12)
                        .style('font-size', '12px')
                        .text(node ? node.name.split('-')[1] : `Value ${colorIndex + 1}`);
                });
            });

        d3.select('#resetBtn').on('click', resetView);

        return () => {
            tooltip.remove();
        };
    };

    d3$1.text("http://vis.lab.djosix.com:2024/data/car.data").then(function (r) {
        const loadedData = 'buying,maintenance,doors,persons,luggage boot,safety\n' + r;
        const data = d3.csvParse(loadedData);
        const transformedData = transformData(data);
        render(transformedData);
    });

    function transformData(data) {
        const nodesById = {};
        const linksMap = {};
        const columns = data.columns;

        data.forEach(row => {
            for (let i = 0; i < columns.length - 1; i++) {
                const source = columns[i] + '-' + row[columns[i]];
                const target = columns[i + 1] + '-' + row[columns[i + 1]];

                if (target === '' || target === '-') break;

                const linkKey = source + '->' + target;
                if (!linksMap[linkKey]) {
                    linksMap[linkKey] = {
                        source: source,
                        target: target,
                        value: 0
                    };
                }
                linksMap[linkKey].value += 1;
                nodesById[source] = true;
                nodesById[target] = true;
            }
        });

        return {
            nodes: Object.keys(nodesById).map(id => ({
                name: id,
                label: id.substr(0, 20)
            })),
            links: Object.values(linksMap)
        };
    }

}(d3));