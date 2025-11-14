function drawConnectedScatter(rawData) {
  (async function () {

    // === Setup ===
    const tooltip = d3.select("#nyt_scatter_tooltip");
    const chartContainer = d3.select("#nyt_scatter_svg");
    chartContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    if (!Array.isArray(rawData) || !rawData.length) {
      console.warn("[drawConnectedScatter] empty data");
      return;
    }

    // --- Parse data ---
    const data = rawData
      .map(d => ({
        year: +d.year,
        attacks: +d.attacks,
        victims: +d.victims,
        is_key: !!d.is_key,
        label: d.label || "",
        note: d.note || "",
        dx: +d.dx || 0,
        dy: +d.dy || -15
      }))
      .filter(d => Number.isFinite(d.year) && Number.isFinite(d.attacks) && Number.isFinite(d.victims))
      .sort((a, b) => d3.ascending(a.year, b.year));

    // --- Dimensions ---
    const containerWidth = chartContainer.node().getBoundingClientRect().width || 900;
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const height = 480;

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, containerWidth, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- Scales ---
    const xPad = 0.05;
    const yPad = 0.05;

    const xExtent = d3.extent(data, d => d.victims);
    const yExtent = d3.extent(data, d => d.attacks);

    const xRange = xExtent[1] - xExtent[0];
    const yRange = yExtent[1] - yExtent[0];

    const x = d3.scaleLinear()
      .domain([0,90000])
      .nice()
      .range([margin.left, containerWidth - margin.right]);

    const y = d3.scaleLinear()
      .domain([0,18000])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // --- Grid ---
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb");

    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3.axisLeft(y)
          .ticks(8)
          .tickSize(-(containerWidth - margin.left - margin.right))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb");

    // --- Axes ---
    const fmt = d3.format(",.0f");

    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickFormat(d => fmt(d))
      );

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(
        d3.axisLeft(y)
          .ticks(8)
          .tickFormat(d => fmt(d))
      );

    // Axis labels / hints
    svg.append("text")
      .attr("class", "axis-hint")
      .attr("x", (margin.left + (containerWidth - margin.right)) / 2)
      .attr("y", height - margin.bottom + 40)
      .attr("text-anchor", "middle")
      .text("More victims →");

    svg.append("text")
      .attr("class", "axis-hint")
      .attr("x", margin.left - 40)
      .attr("y", (margin.top + (height - margin.bottom)) / 2)
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90, ${margin.left - 40}, ${(margin.top + (height - margin.bottom)) / 2})`)
      .text("↑ More attacks");

    // --- Line generator (smooth) ---
    const line = d3.line()
      .x(d => x(d.victims))
      .y(d => y(d.attacks))
      .curve(d3.curveCatmullRom.alpha(0.6));

    // Main line
    svg.append("path")
      .datum(data)
      .attr("class", "main-line")
      .attr("d", line);

    // --- Points ---
    const rScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([3.5, 5]);

    const nodes = svg.append("g")
      .selectAll(".year-node")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "year-node")
      .attr("cx", d => x(d.victims))
      .attr("cy", d => y(d.attacks))
      .attr("r", d => rScale(d.year));

    // --- Marker for callout arrows ---
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow-head")
      .attr("viewBox", "0 0 6 6")
      .attr("refX", 5)
      .attr("refY", 3)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L6,3 L0,6 Z")
      .attr("fill", "#9ca3af");

    // --- Annotations for key years ---
    const keyData = data.filter(d => d.is_key);

    const annotations = svg.append("g").attr("class", "annotations");

    const anno = annotations.selectAll(".annotation")
      .data(keyData)
      .enter()
      .append("g")
      .attr("class", "annotation");

    anno.append("line")
      .attr("class", "annotation-line")
      .attr("x1", d => x(d.victims))
      .attr("y1", d => y(d.attacks))
      .attr("x2", d => x(d.victims) + d.dx)
      .attr("y2", d => y(d.attacks) + d.dy)
      .attr("marker-end", "url(#arrow-head)");

    anno.append("text")
      .attr("class", "annotation-text")
      .attr("x", d => x(d.victims) + d.dx + 4)
      .attr("y", d => y(d.attacks) + d.dy)
      .attr("dy", "-0.2em")
      .each(function (d) {
        const el = d3.select(this);
        const lines = (d.note || "").split(/\n/);
        // first line bold with year
        el.append("tspan")
          .attr("x", x(d.victims) + d.dx + 4)
          .attr("dy", "0")
          .style("font-weight", "600")
          .text(d.label || d.year);

        lines.forEach((ln, i) => {
          el.append("tspan")
            .attr("x", x(d.victims) + d.dx + 4)
            .attr("dy", i === 0 ? "1.1em" : "1.1em")
            .text(ln);
        });
      });

    // --- Year labels for key points (near the point) ---
    svg.append("g")
      .selectAll(".year-label")
      .data(keyData)
      .enter()
      .append("text")
      .attr("class", "year-label")
      .attr("x", d => x(d.victims) + 6)
      .attr("y", d => y(d.attacks) - 6)
      .text(d => d.year);

    // --- Tooltip interazioni ---
    nodes
      .on("mouseenter", function (event, d) {
        // dimming degli altri punti
        nodes.classed("dimmed", n => n.year !== d.year);

        tooltip.transition().duration(120).style("opacity", 0.95);
        tooltip.html(`
          <div style="padding:6px 8px;">
            <div style="font-weight:600; margin-bottom:2px;">Year ${d.year}</div>
            <div><b>Victims:</b> ${fmt(d.victims)}</div>
            <div><b>Attacks:</b> ${fmt(d.attacks)}</div>
          </div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function () {
        nodes.classed("dimmed", false);
        tooltip.transition().duration(200).style("opacity", 0);
      });

  })();
}