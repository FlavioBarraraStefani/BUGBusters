// heatmap_fixed_cells.js
function drawHeatmapChart(rawData) {
    (async function () {

        const dataObj = rawData;
        const container = d3.select("#heatmap_chart_svg");
        container.selectAll("*").remove();

        // --- Legend selectors ---
        const legendDiv = d3.select("#heatmap_chart_legend");
        legendDiv.selectAll("*").remove();
        legendDiv.append("div").html(`<label>Row order: <select id="row-order">
      <option value="name">Name</option><option value="total">Total</option></select></label>`);
        legendDiv.append("div").html(`<label>Column order: <select id="col-order">
      <option value="name">Name</option><option value="total">Total</option></select></label>`);

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

        const margin = { top: 50, right: 50, bottom: 120, left: 160 };

        // --- Draw function ---
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
            const colorScale = d3.scaleSequential().domain([0, maxVal || 1]).interpolator(d3.interpolateYlOrRd);

            const rowPos = new Map(rowNames.map((r, i) => [r, i]));
            const colPos = new Map(colNames.map((c, i) => [c, i]));

            // --- Cells ---
            const cells = mainMerge.selectAll("rect.cell")
                .data(matrix.flatMap((row, r) => row.map((v, c) => ({ rName: rowNames[r], cName: colNames[c], value: v }))),
                    d => d.rName + "-" + d.cName);

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
                .attr("x", 0).attr("y", 0)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .text(d => d)
                .merge(colLabels)
                .transition().duration(800)
                .attr("transform", (_, i) => `translate(${i * cellWidth + cellWidth / 2}, ${cellHeight * numRows + 18}) rotate(-45)`);
            colLabels.exit().remove();

            // --- Tooltip & dimming ---
            function clearHighlight() {
                mainMerge.selectAll("rect.cell").attr("opacity", 1);
                mainMerge.selectAll("text").attr("opacity", 1);
                tooltip.style("opacity", 0);
            }

            function highlightCell(d, event) {
                const r = d.rName, c = d.cName;
                const rIndex = rowNames.indexOf(r);
                const cIndex = colNames.indexOf(c);
                const val = d.value;
                const rTotal = d3.sum(matrix[rIndex]);
                const cTotal = d3.sum(matrix.map(row => row[cIndex]));

                mainMerge.selectAll("rect.cell").attr("opacity", 0.12);
                mainMerge.selectAll("text").attr("opacity", 0.12);

                mainMerge.selectAll("rect.cell").filter(cd => cd.rName === r || cd.cName === c).attr("opacity", 1);
                mainMerge.selectAll("text.row-label").filter((_, i) => i === rIndex).attr("opacity", 1);
                mainMerge.selectAll("text.col-label").filter((_, i) => i === cIndex).attr("opacity", 1);

                tooltip.style("opacity", 1)
                    .html(`<strong>Value:</strong> ${val}<br>
                 <strong>Row total:</strong> ${rTotal}<br>
                 <strong>Col total:</strong> ${cTotal}`)
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY + 12) + "px");
            }

            mainMerge.selectAll("rect.cell")
                .on("mouseover", (event, d) => highlightCell(d, event))
                .on("mousemove", (event) => tooltip.style("left", (event.pageX + 12) + "px").style("top", (event.pageY + 12) + "px"))
                .on("mouseout", () => clearHighlight());

            clearHighlight();
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
