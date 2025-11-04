function drawBarChart(rawData) {
  (async function () {

    // N rows from rawData
    const N = 10;
    rawData = rawData.slice(0, N);

    // === Setup ===
    const tooltip = d3.select("#bar_chart_tooltip");
    const chartContainer = d3.select("#bar_chart_svg");
    const legendContainer = d3.select("#bar_chart_legend");
    chartContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    // --- Parse data ---
    const data = rawData.map(d => {
      const c1 = +d.attacks_city1_count || 0;
      const c2 = +d.attacks_city2_count || 0;
      const c3 = +d.attacks_city3_count || 0;
      const total = +d.country_attacks_count || 0;
      const others = Math.max(0, total - (c1 + c2 + c3));
      return {
        country: d.country,
        total,
        city1: d.city1 || "Unknown",
        city2: d.city2 || "Unknown",
        city3: d.city3 || "Unknown",
        c1, c2, c3, others
      };
    }).sort((a,b) => d3.descending(a.total, b.total));

    // --- Rocket colormap approximation (per il colore base delle barre) ---
    function interpolateRocket(t) {
      // inverti
      t = 1 - t;
      const stops = [
        "#0c0c0e", "#2a1739", "#5a1f64", "#8f2469",
        "#bf3358", "#e2553e", "#f7892e", "#f8c64f", "#f6f7a2"
      ];
      const scale = d3.scaleLinear()
        .domain(d3.range(0, 1 + 1e-9, 1 / (stops.length - 1)))
        .range(stops);
      const interp = d3.interpolateLab;
      const idx = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
      const t0 = idx / (stops.length - 1);
      const t1 = (idx + 1) / (stops.length - 1);
      const lt = (t - t0) / (t1 - t0);
      return interp(scale(t0), scale(t1))(lt);
    }

    const color = d3.scaleSequential(interpolateRocket)
      .domain([d3.min(data, d => d.total), d3.max(data, d => d.total)]);

    // --- Dimensions ---
    const containerWidth = chartContainer.node().getBoundingClientRect().width;
    const margin = { top: 10, right: 24, bottom: 42, left: 170 };
    const rowH = 40;
    const height = margin.top + margin.bottom + rowH * data.length;

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, containerWidth, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- Scales ---
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total)]).nice()
      .range([margin.left, containerWidth - margin.right]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.country))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    // --- Gridlines ---
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(8)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb");

    // --- Bars (base) ---
    const bars = svg.append("g")
      .attr("class", "bars-group")
      .selectAll(".bar")
      .data(data, d => d.country)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", x(0))
      .attr("y", d => y(d.country))
      .attr("height", y.bandwidth())
      .attr("fill", d => d._color = color(d.total))
      .attr("width", 0)
      .style("pointer-events", "none"); // WAIT: disattiva hover finché anima

    // Animazione iniziale + WAIT fino a fine anim
    await bars.transition().duration(400)
      .attr("width", d => x(d.total) - x(0))
      .end(); // WAIT: blocca finché tutte le barre hanno finito

    // --- Axes ---
    const fmtTick = d3.format(",.0f");
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(fmtTick).tickSizeOuter(0));

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0));

    svg.select(".y-axis").raise();

    // === Stacked pre-disegnato (nessuna animazione) ===

    // palette colorblind-friendly per i segmenti
    const segColor = d3.scaleOrdinal()
      .domain(["city1", "city2", "city3", "others"])
      .range(["#0072B2", "#009E73", "#E69F00", "#999999"]);

    const stackedLayer = svg.append("g")
      .attr("class", "stacked-layer")
      .style("pointer-events", "none"); // non intercetta il mouse

    function getSegments(d) {
      return [
        { key: "city1", label: d.city1, value: d.c1 },
        { key: "city2", label: d.city2, value: d.c2 },
        { key: "city3", label: d.city3, value: d.c3 },
        { key: "others", label: "Others", value: d.others },
      ].filter(s => s.value > 0);
    }

    const stackedGroups = stackedLayer.selectAll(".stacked-group")
      .data(data, d => d.country)
      .enter()
      .append("g")
      .attr("class", "stacked-group")
      .attr("data-country", d => d.country)
      .style("visibility", "hidden"); // nascosto fino all'hover

    stackedGroups.each(function(d) {
      const g = d3.select(this);
      const bw = y.bandwidth();
      const barH = bw; // stessa altezza della barra base
      const yTop = y(d.country);
      const totalW = x(d.total) - x(0); // stessa lunghezza della barra base

      let acc = 0;
      g.selectAll("rect")
        .data(getSegments(d))
        .enter()
        .append("rect")
        .attr("class", "stacked-segment")
        .attr("x", s => {
          const start = x(0) + (totalW * (acc / d.total));
          acc += s.value;
          return start;
        })
        .attr("y", yTop)
        .attr("height", barH)
        .attr("width", s => totalW * (s.value / d.total))
        .attr("fill", s => segColor(s.key));
    });

    // === Interazioni (attivate SOLO ora) ===
    const fmt = d3.format(",");
    const gray = "#c7c7c7";
    const transitionDuration = 100;

    const sw = (c) =>
      `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:6px;vertical-align:middle;"></span>`;

    // WAIT: ora che l'animazione è finita, riattiva hover
    bars.style("pointer-events", "auto");

    bars
      .on("mouseenter", function (event, d) {
        // Tooltip con mini-legend colorata
        tooltip.transition().duration(transitionDuration).style("opacity", 0.9);
        tooltip.html(`
          <div style="font-weight:600;margin-bottom:6px;">${d.country}</div>
          <div style="display:grid;grid-template-columns:auto 1fr auto;gap:4px 8px;align-items:center;">
            ${sw(segColor("city1"))}<span>${d.city1}</span><span>${((d.c1/d.total)*100 || 0).toFixed(1)}% (${fmt(d.c1)})</span>
            ${sw(segColor("city2"))}<span>${d.city2}</span><span>${((d.c2/d.total)*100 || 0).toFixed(1)}% (${fmt(d.c2)})</span>
            ${sw(segColor("city3"))}<span>${d.city3}</span><span>${((d.c3/d.total)*100 || 0).toFixed(1)}% (${fmt(d.c3)})</span>
            ${sw(segColor("others"))}<span>Others</span><span>${((d.others/d.total)*100 || 0).toFixed(1)}% (${fmt(d.others)})</span>
          </div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");

        // Dimming
        bars.transition().duration(transitionDuration)
          .attr("fill", x => x.country === d.country ? x._color : gray);

        // Mostra lo stacked del paese attivo
        stackedGroups.style("visibility", g => g.country === d.country ? "visible" : "hidden");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function () {
        tooltip.transition().duration(transitionDuration).style("opacity", 0);

        bars.transition()
          .attr("fill", d => d._color);

        stackedGroups.style("visibility", "hidden");
      });

  })();

}
