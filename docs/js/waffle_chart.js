function drawWaffleChart(rawData) {
  (async function() {
    // --- Aggregate smaller categories ---
    const major = rawData.slice(0, 5);
    const othersTotal = rawData.slice(5).reduce((sum, d) => sum + d.value, 0);
    major.push({ name: "Others", value: othersTotal, icon: "icons/others.svg", color: "#9b59b6" });
    major.sort((a, b) => a.value - b.value);

    const data = major;
    const total = d3.sum(data, d => d.value);
    
    //start plot
    const tooltip = d3.select("#waffle_chart_tooltip");
    const chartContainer = d3.select("#waffle_chart_svg");
    const legendContainer = d3.select("#waffle_chart_legend");
    chartContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();

    // --- Adjust grid ---
    const cols = 20, rows = 5, totalCells = cols * rows;
    const containerWidth = chartContainer.node().getBoundingClientRect().width;
    const cellSize = containerWidth / cols ;
    const height = rows * cellSize * 1.1;

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, containerWidth, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- Scale data ---
    const scaledData = [];
    data.forEach(d => d.cells = Math.round((d.value / total) * totalCells));
    data.forEach(d => { for (let i = 0; i < d.cells; i++) scaledData.push({ ...d }); });
    while (scaledData.length > totalCells) scaledData.pop();
    while (scaledData.length < totalCells) scaledData.push(data[data.length - 1]);
    scaledData.forEach((d, i) => { d.col = i % cols; d.row = Math.floor(i / cols); });

    // --- Preload all SVGs and inline them ---
    async function preloadSVGs(urls) {
      const unique = Array.from(new Set(urls));
      const promises = unique.map(url =>
        fetch(url)
          .then(r => r.text())
          .then(svg => ({ url, svg }))
          .catch(() => ({ url, svg: `<svg></svg>` }))
      );
      const results = await Promise.all(promises);
      const cache = new Map(results.map(r => [r.url, r.svg]));
      return url => cache.get(url);
    }

    const getSVG = await preloadSVGs(data.map(d => d.icon));

    const g = svg.append("g")
      .attr("transform", `translate(${cellSize / 2}, ${cellSize / 2})`);

    // --- Draw cells ---
    const cells = g.selectAll("foreignObject")
      .data(scaledData)
      .enter()
      .append("foreignObject")
      .attr("x", d => d.col * cellSize * 1 - cellSize / 2)
      .attr("y", d => d.row * cellSize * 1 - cellSize / 2)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .style("opacity", 0);

    // Add SVG inside <foreignObject> so we can color it
    cells.append("xhtml:div")
      .html(d => getSVG(d.icon))
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("transform", "scale(0.85)")
      .each(function(d) {
        const svgEl = this.querySelector("svg");
        if (svgEl) {
          // 🔹 Remove hardcoded fills and strokes
          svgEl.querySelectorAll('*').forEach(el => {
            el.removeAttribute("fill");
            el.removeAttribute("stroke");
            el.removeAttribute("style");
          });
          svgEl.setAttribute("fill", d.color);
          svgEl.setAttribute("width", "100%");
          svgEl.setAttribute("height", "100%");
        }
      });

    // Fade in
    cells.transition()
      .duration(600)
      .style("opacity", 1);

    // --- Tooltip and dimming ---
cells
  .on("mouseover", (event, d) => {
    const percent = ((d.value / total) * 100).toFixed(1);
    tooltip.transition().duration(150).style("opacity", 0.9);
    tooltip.html(`<b>${d.name}</b><br>${percent}% of total<br>${d.value.toLocaleString()} incidents`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 20) + "px");

    // Dim other cells
    cells.classed("dimmed", x => x.name !== d.name);
  })
  .on("mousemove", event => {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 20) + "px");
  })
  .on("mouseout", () => {
    tooltip.transition().duration(300).style("opacity", 0);
    // Remove dimming
    cells.classed("dimmed", false);
  });


    // --- Legend ---
    const legendItems = legendContainer.selectAll(".legend-item")
      .data(data)
      .enter()
      .append("div")
      .attr("class", "legend-item")
      .each(function (d) {
        const item = d3.select(this);
        item.html(getSVG(d.icon));
        const svgEl = this.querySelector("svg");
        if (svgEl) {
          // 🔹 Same color normalization here
          svgEl.querySelectorAll('*').forEach(el => {
            el.removeAttribute("fill");
            el.removeAttribute("stroke");
            el.removeAttribute("style");
          });
          svgEl.setAttribute("fill", d.color);
          svgEl.setAttribute("width", "18");
          svgEl.setAttribute("height", "18");
          svgEl.style.marginRight = "6px";
          svgEl.style.verticalAlign = "middle";
        }
        item.append("span").text(d.name);

        // --- Tooltip on legend items ---
        item
          .on("mouseover", (event) => {
            const percent = ((d.value / total) * 100).toFixed(1);
            tooltip.transition().duration(150).style("opacity", 0.9);
            tooltip.html(`<b>${d.name}</b><br>${percent}% of total<br>${d.value.toLocaleString()} incidents`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");

            // Dim cells not belonging to this category
            cells.classed("dimmed", x => x.name !== d.name);
          })
          .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", () => {
            tooltip.transition().duration(300).style("opacity", 0);
            cells.classed("dimmed", false);
          });
      });
  })();
}

