// heatmap_fixed_cells.js
function drawHeatmapChart(rawData) {
    (async function () {

        const dataObj = rawData;
        const container = d3.select("#heatmap_chart_svg");
        container.selectAll("*").remove();

        // --- Legend selectors ---
        const legendDiv = d3.select("#heatmap_chart_legend");
        legendDiv.selectAll("*").remove();

        legendDiv.html(`
            <div class="container-fluid">
                <div class="row w-100">
                <!-- Perpetrators -->
                <div class="col-6 col-lg-12 d-flex flex-column align-items-center mb-3 mb-lg-2">
                    <label for="row-order" class="legend-label mb-1">Perpetrators order:</label>
                    <select id="row-order" class="legend-dropdown form-select text-center">
                    <option value="name">Name</option>
                    <option value="total" selected>Total</option>
                    </select>
                </div>

                <!-- Victims -->
                <div class="col-6 col-lg-12 d-flex flex-column align-items-center">
                    <label for="col-order" class="legend-label mb-1">Victims order:</label>
                    <select id="col-order" class="legend-dropdown form-select text-center">
                    <option value="name">Name</option>
                    <option value="total" selected>Total</option>
                    </select>
                </div>
                </div>
            </div>
            `);

        const tooltip = d3.select("#heatmap_chart_tooltip");

        // --- Original row & column names ---
        const rowNamesOriginal = Object.keys(dataObj);
        const colSet = new Set();
        rowNamesOriginal.forEach(r => Object.keys(dataObj[r]).forEach(c => colSet.add(c)));
        const colNamesOriginal = Array.from(colSet);

        let rowNames = rowNamesOriginal.slice();
        let colNames = colNamesOriginal.slice();

        function computeMatrix() {
            return rowNames.map(r => colNames.map(c => +(dataObj[r][c] || 0)));
        }

        let matrix = computeMatrix();
        let rowTotals = matrix.map(r => d3.sum(r));
        let colTotals = colNames.map((_, j) => d3.sum(matrix, row => row[j]));

        const margin = { top: 30, right: 70, bottom: 80, left: 120 };

        function draw() {
            const containerNode = document.getElementById("heatmap_chart_svg");
            const containerWidth = containerNode.clientWidth || 800;
            const containerHeight = containerNode.clientHeight || 500;

            const numRows = rowNames.length;
            const numCols = colNames.length;

            // --- fixed width and height for all cells ---
            const gridWidth = containerWidth - margin.left - margin.right;
            const gridHeight = containerHeight - margin.top - margin.bottom;
            const cellWidth = gridWidth / numCols;
            const cellHeight = gridHeight / numRows;

            const svgWidth = containerWidth;
            const svgHeight = containerHeight;

            const svg = container.selectAll("svg").data([0]);
            const svgEnter = svg.enter().append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight);
            const svgMerge = svgEnter.merge(svg)
                .attr("width", svgWidth)
                .attr("height", svgHeight);

            const main = svgMerge.selectAll("g.main").data([0]);
            const mainEnter = main.enter().append("g")
                .attr("class", "main")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            const mainMerge = mainEnter.merge(main);

            const maxVal = d3.max(matrix.flat());
            const colorScale = d3.scaleSequential()
                .domain([0, maxVal || 1])
                .interpolator(d3.interpolateYlOrRd);

            const rowPos = new Map(rowNames.map((r, i) => [r, i]));
            const colPos = new Map(colNames.map((c, i) => [c, i]));

            // --- Cells ---
            const cells = mainMerge.selectAll("rect.cell")
                .data(
                    matrix.flatMap((row, r) => row.map((v, c) => ({ rName: rowNames[r], cName: colNames[c], value: v }))),
                    d => d.rName + "-" + d.cName
                );

            cells.enter()
                .append("rect")
                .attr("class", "cell")
                .attr("width", cellWidth)
                .attr("height", cellHeight)
                .attr("x", d => colPos.get(d.cName) * cellWidth)
                .attr("y", d => rowPos.get(d.rName) * cellHeight)
                .attr("fill", d => colorScale(d.value))
                .merge(cells)
                .transition().duration(800)
                .attr("x", d => colPos.get(d.cName) * cellWidth)
                .attr("y", d => rowPos.get(d.rName) * cellHeight)
                .attr("width", cellWidth)
                .attr("height", cellHeight)
                .attr("fill", d => colorScale(d.value));

            cells.exit().remove();

            // --- Row labels ---
            const rowLabels = mainMerge.selectAll("text.row-label").data(rowNames, d => d);
            rowLabels.enter()
                .append("text")
                .attr("class", "row-label")
                .attr("x", -8)
                .attr("y", (_, i) => i * cellHeight + cellHeight / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .text(d => d)
                .merge(rowLabels)
                .transition().duration(800)
                .attr("y", (_, i) => i * cellHeight + cellHeight / 2);
            rowLabels.exit().remove();

            // --- Column labels ---
            const colLabels = mainMerge.selectAll("text.col-label").data(colNames, d => d);
            colLabels.enter()
                .append("text")
                .attr("class", "col-label")
                .text(d => d)
                .merge(colLabels)
                .transition().duration(800)
                .attr("x", (_, i) => i * cellWidth + cellWidth / 2)
                .attr("y", cellHeight * numRows + 6)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("transform", (_, i) => {
                    const cx = i * cellWidth + cellWidth / 2;
                    const cy = cellHeight * numRows + 6;
                    return `rotate(-45, ${cx}, ${cy})`;
                });
            colLabels.exit().remove();

            // --- Tooltip & highlight ---
            function clearHighlight() {
                mainMerge.selectAll("rect.cell").attr("opacity", 1);
                mainMerge.selectAll("text").attr("opacity", 1);
                mainMerge.selectAll("text").attr("font-weight", "normal");
                tooltip.style("opacity", 0);
            }

            function highlightCell(d, event) {
                const val = d.value;
                const rTotal = d3.sum(matrix[rowNames.indexOf(d.rName)]);
                const cTotal = d3.sum(matrix.map(row => row[colNames.indexOf(d.cName)]));

                mainMerge.selectAll("rect.cell").attr("opacity", 0.12);
                mainMerge.selectAll("text").attr("opacity", 0.12);

                mainMerge.selectAll("rect.cell")
                    .filter(cd => cd.rName === d.rName || cd.cName === d.cName)
                    .attr("opacity", 1);

                mainMerge.selectAll("text.row-label")
                    .filter(label => label === d.rName)
                    .attr("opacity", 1)
                    .attr("font-weight", "bold");

                mainMerge.selectAll("text.col-label")
                    .filter(label => label === d.cName)
                    .attr("opacity", 1)
                    .attr("font-weight", "bold");

                tooltip.style("opacity", 1)
                    .html(`<strong>Count:</strong> ${val}<br>
                <strong>Total by perpetrators:</strong> ${rTotal}<br>
                <strong>Total by victims:</strong> ${cTotal}`)
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY + 12) + "px");
            }

            mainMerge.selectAll("rect.cell")
                .on("mouseover", (event, d) => highlightCell(d, event))
                .on("mousemove", (event) => tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY + 12) + "px"))
                .on("mouseout", () => clearHighlight());

            clearHighlight();

            // --- Colorbar ---
            const colorbarHeight = gridHeight;
            const colorbarWidth = 16;

            const colorbarScale = d3.scaleLinear()
                .domain(colorScale.domain())
                .range([colorbarHeight, 0]);

            const defs = svgMerge.select("defs").empty() ? svgMerge.append("defs") : svgMerge.select("defs");
            const gradient = defs.selectAll("linearGradient#colorbar-gradient")
                .data([0])
                .join("linearGradient")
                .attr("id", "colorbar-gradient")
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "0%")
                .attr("y2", "0%");

            const n = 10;
            const stops = d3.range(0, n + 1).map(i => i / n);
            gradient.selectAll("stop")
                .data(stops)
                .join("stop")
                .attr("offset", d => `${d * 100}%`)
                .attr("stop-color", d => colorScale(d * maxVal));

            const colorbarGroup = svgMerge.selectAll("g.colorbar").data([0])
                .join("g")
                .attr("class", "colorbar")
                .attr("transform", `translate(${margin.left + gridWidth + 20}, ${margin.top})`);

            colorbarGroup.selectAll("rect").data([0])
                .join("rect")
                .attr("width", colorbarWidth)
                .attr("height", colorbarHeight)
                .style("fill", "url(#colorbar-gradient)")
                .style("stroke", "#ccc")
                .style("stroke-width", "1px");

            // --- remove ticks (no axis drawn) ---
            colorbarGroup.selectAll("g.axis").remove();

        }


        draw();
        window.addEventListener("resize", draw);

        // --- Ordering selectors ---
        d3.select("#row-order").on("change", function () {
            const val = this.value;
            if (val === "name") rowNames = rowNamesOriginal.slice();
            else rowNames = rowNamesOriginal.slice().sort((a, b) => {
                const sumA = d3.sum(colNames.map(c => dataObj[a][c] || 0));
                const sumB = d3.sum(colNames.map(c => dataObj[b][c] || 0));
                return sumB - sumA;
            });
            matrix = computeMatrix();
            rowTotals = matrix.map(r => d3.sum(r));
            draw();
        });

        d3.select("#col-order").on("change", function () {
            const val = this.value;
            if (val === "name") colNames = colNamesOriginal.slice();
            else colNames = colNamesOriginal.slice().sort((a, b) => {
                const sumA = d3.sum(rowNames.map(r => dataObj[r][a] || 0));
                const sumB = d3.sum(rowNames.map(r => dataObj[r][b] || 0));
                return sumB - sumA;
            });
            matrix = computeMatrix();
            colTotals = colNames.map((_, j) => d3.sum(matrix, row => row[j]));
            draw();
        });

    })();
}
