function drawMirrorChart(rawData) {
  const container = d3.select("#mirror_chart_container");
  const svgContainer = container.select("#mirror_chart_svg");
  const legendContainer = container.select("#mirror_chart_legend");
  const tooltip = d3.select("#mirror_chart_tooltip");

  // Configuration
  const palette = { nkill: "#d62728", nwound: "#ff7f0e" };
  let activeKey = null;

  // Parse data
  const data = (rawData || []).map(d => ({
    iyear: +d.iyear,
    nkill: Math.max(0, +d.nkill || 0),
    nwound: Math.max(0, +d.nwound || 0)
  })).filter(d => !isNaN(d.iyear));

  // Setup SVG
  svgContainer.selectAll("*").remove();
  svgContainer.style("overflow", "hidden");
  const svg = svgContainer
    .append("svg")
    .style("display", "block")
    .style("width", "100%")
    .style("height", "auto")
    .style("overflow", "hidden");

  const g = svg.append("g");

  // Setup legend
  const legendData = [
    { key: "nkill", label: "Fatalities", color: palette.nkill },
    { key: "nwound", label: "Injuries", color: palette.nwound }
  ];

  legendContainer.selectAll("*").remove();
  const legendSpans = legendContainer
    .selectAll("span")
    .data(legendData)
    .enter()
    .append("span")
    .style("display", "inline-block")
    .style("margin-right", "18px")
    .style("cursor", "pointer")
    .style("font-size", "16px")
    .style("opacity", "1")
    .style("transition", "opacity 0.3s ease")
    .html(d => `<span style="background:${d.color};width:18px;height:18px;display:inline-block;margin-right:8px;border-radius:2px;vertical-align:middle;"></span>${d.label}`)
    .on("click", function (event, d) {
      activeKey = activeKey === d.key ? null : d.key;
      render();
    });

  function render() {
    const containerNode = container.node();
    const rect = containerNode?.getBoundingClientRect();
    const width = Math.max(600, rect?.width || containerNode.clientWidth || 900);
    const height = 460;
    const margin = { top: 10, right: 24, bottom: 80, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("width", width)
      .attr("height", height);

    g.attr("transform", `translate(${margin.left},${margin.top})`);

    // Keep existing groups
    let killGroup = g.select(".kill-bars");
    let woundGroup = g.select(".wound-bars");
    if (!killGroup.node()) killGroup = g.append("g").attr("class", "kill-bars");
    if (!woundGroup.node()) woundGroup = g.append("g").attr("class", "wound-bars");

    // Clear axes before redrawing
    g.selectAll(".x-axis, .y-axis").remove();

    // Scales
    const maxKill = d3.max(data, d => d.nkill) || 0;
    const maxWound = d3.max(data, d => d.nwound) || 0;

    let yScale, baseline;
    if (activeKey === "nkill") {
      const maxVal = Math.max(maxKill, 50000);
      yScale = d3.scaleLinear().domain([0, maxVal]).range([innerHeight, 0]);
      baseline = innerHeight;
    } else if (activeKey === "nwound") {
      const maxVal = Math.max(maxWound, 50000);
      yScale = d3.scaleLinear().domain([0, maxVal]).range([innerHeight, 0]);
      baseline = innerHeight;
    } else {
      const maxVal = Math.max(maxKill, maxWound, 50000);
      yScale = d3.scaleLinear().domain([-maxVal, maxVal]).range([innerHeight, 0]);
      baseline = yScale(0);
    }

    const years = Array.from(new Set(data.map(d => d.iyear))).sort((a, b) => a - b);
    const step = years.length > 1 ? Math.min(...years.slice(1).map((y, i) => y - years[i]).filter(d => d > 0)) || 1 : 1;
    const xScale = d3.scaleLinear()
      .domain([d3.min(years) - step * 0.5, d3.max(years) + step * 0.5])
      .range([0, innerWidth]);
    const barWidth = Math.max(8, Math.round((innerWidth / years.length) * 0.7));

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(Math.min(10, years.length)).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale).ticks(12).tickFormat(d => d3.format("d")(Math.abs(d)));

    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${innerHeight})`).call(xAxis);
    g.append("g").attr("class", "y-axis").call(yAxis);

    // --- Cursor group and line (create early so handlers can access it) ---
    let cursorG = g.select(".cursor-group");
    let cursorLine;

    if (!cursorG.node()) {
      // Clip path once
      if (g.select("#chart-clip").empty()) {
        g.append("defs").append("clipPath")
          .attr("id", "chart-clip")
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", innerWidth)
          .attr("height", innerHeight);
      }

      cursorG = g.append("g")
        .attr("class", "cursor-group")
        .attr("clip-path", "url(#chart-clip)");

      cursorLine = cursorG.append("line")
        .attr("class", "cursor-line")
        .style("stroke", "#666")
        .style("stroke-width", "1px")
        .style("stroke-dasharray", "4,4")
        .style("opacity", 0)
        .style("pointer-events", "none");
    } else {
      cursorLine = cursorG.select(".cursor-line");
    }

    // Tooltip helpers (access cursorLine)
    function positionTooltip(event, d) {
      tooltip
        .style("left", `${event.clientX + 15}px`)
        .style("top", `${event.clientY + 15}px`);
    }

    function showCursor(barX) {
      cursorLine
        .attr("x1", barX)
        .attr("x2", barX)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("opacity", 0.5);
    }
    function hideCursor() {
      cursorLine.style("opacity", 0);
    }

    // Update legend opacity
    legendSpans.style("opacity", d => (!activeKey || d.key === activeKey ? 1 : 0.3));

    const showKill = !activeKey || activeKey === "nkill";
    const showWound = !activeKey || activeKey === "nwound";

    // ---- FATALITIES ----
    const killBars = killGroup.selectAll("rect").data(showKill ? data : [], d => d.iyear);

    const killEnter = killBars.enter()
      .append("rect")
      .attr("x", d => xScale(d.iyear) - barWidth / 2)
      .attr("width", barWidth)
      .attr("y", baseline)
      .attr("height", 0)
      .style("fill", palette.nkill)
      .style("opacity", 0)
      .on("mouseover", (event, d) => {
        positionTooltip(event, d);
        tooltip.html(`<div style="font-weight:700;margin-bottom:6px;">${d.iyear}</div>
                      <div style="margin-bottom:3px;">Fatalities: <strong>${d.nkill}</strong></div>
                      <div>Injuries: <strong>${d.nwound}</strong></div>`)
          .style("opacity", 1);
        showCursor(xScale(d.iyear));
      })
      .on("mousemove", positionTooltip)
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        hideCursor();
      });

    killEnter.transition().duration(700).ease(d3.easeCubicInOut)
      .style("opacity", 1)
      .attr("y", d => yScale(d.nkill))
      .attr("height", d => Math.abs(yScale(d.nkill) - baseline));

    killBars.transition().duration(700).ease(d3.easeCubicInOut)
      .attr("x", d => xScale(d.iyear) - barWidth / 2)
      .attr("width", barWidth)
      .attr("y", d => yScale(d.nkill))
      .attr("height", d => Math.abs(yScale(d.nkill) - baseline))
      .style("opacity", 1);

    killBars.exit().transition().duration(400).ease(d3.easeCubicOut)
      .style("opacity", 0)
      .on("end", function () { d3.select(this).remove(); });

    // ---- INJURIES ----
    const woundBars = woundGroup.selectAll("rect").data(showWound ? data : [], d => d.iyear);

    const woundEnter = woundBars.enter()
      .append("rect")
      .attr("x", d => xScale(d.iyear) - barWidth / 2)
      .attr("width", barWidth)
      .attr("y", baseline)
      .attr("height", 0)
      .style("fill", palette.nwound)
      .style("opacity", 0)
      .on("mouseover", (event, d) => {
        positionTooltip(event, d);
        tooltip.html(`<div style="font-weight:700;margin-bottom:6px;">${d.iyear}</div>
                      <div style="margin-bottom:3px;">Fatalities: <strong>${d.nkill}</strong></div>
                      <div>Injuries: <strong>${d.nwound}</strong></div>`)
          .style("opacity", 1);
        showCursor(xScale(d.iyear));
      })
      .on("mousemove", positionTooltip)
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        hideCursor();
      });

    woundEnter.transition().duration(700).ease(d3.easeCubicInOut)
      .style("opacity", 1)
      .attr("y", d => activeKey === "nwound" ? yScale(d.nwound) : baseline)
      .attr("height", d => activeKey === "nwound"
        ? Math.abs(yScale(d.nwound) - baseline)
        : Math.abs(yScale(-d.nwound) - baseline));

    woundBars.transition().duration(700).ease(d3.easeCubicInOut)
      .attr("x", d => xScale(d.iyear) - barWidth / 2)
      .attr("width", barWidth)
      .attr("y", d => activeKey === "nwound" ? yScale(d.nwound) : baseline)
      .attr("height", d => activeKey === "nwound"
        ? Math.abs(yScale(d.nwound) - baseline)
        : Math.abs(yScale(-d.nwound) - baseline))
      .style("opacity", 1);

    woundBars.exit().transition().duration(400).ease(d3.easeCubicOut)
      .style("opacity", 0)
      .on("end", function () { d3.select(this).remove(); });

    // Ensure cursor stays on top
    g.select(".cursor-group").raise();
  }

  // Responsive
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => render());
    ro.observe(container.node());
  } else {
    window.addEventListener("resize", render);
  }

  render();
}
