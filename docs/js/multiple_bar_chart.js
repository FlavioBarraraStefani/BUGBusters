function drawMultipleBarChart(rawData) {
  (async function () {
    // === Safe selects & guards ===
    const container = d3.select("#multiple_bar_chart_svg");
    const legend = d3.select("#multiple_bar_chart_legend");
    const tooltip = d3.select("#multiple_bar_chart_tooltip");

    // Tooltip transition duration
    const TT_DUR = 180;

    // Tooltip helpers (overlay "volante")
    function showTooltip(event, html) {
      tooltip.interrupt()
        .html(html)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px")
        .transition().duration(TT_DUR)
        .style("opacity", 0.95);
    }
    function moveTooltip(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    }
    function hideTooltip() {
      tooltip.interrupt()
        .transition().duration(TT_DUR)
        .style("opacity", 0);
    }

    if (container.empty()) {
      console.warn("[drawMultipleBarChart] #multiple_bar_chart_svg non trovato.");
      return;
    }

    container.selectAll("*").remove();
    legend.selectAll("*").remove();
    tooltip.style("opacity", 0);

    // === Data prep ===
    const N = 15;
    const data = rawData.slice(0, N).map(d => ({
      gname: d.gname,
      zero_victims: +d.zero_victims || 0,
      one_victim: +d.one_victim || 0,
      two_plus_victims: +d.two_plus_victims || 0,
      total_attacks: +d.total_attacks || (+d.zero_victims + +d.one_victim + +d.two_plus_victims) || 0
    }));

    const series = [
      { key: "zero_victims", label: "0 victims", color: "#009E73" },
      { key: "one_victim", label: "1 victim", color: "#E69F00" },
      { key: "two_plus_victims", label: "2+ victims", color: "#D55E00" }
    ];

    let activeCategory = null;

    // === Dimensions ===
    const node = container.node();
    const rect = node?.getBoundingClientRect();
    const width = Math.max(600, rect?.width || node.clientWidth || node.offsetWidth || 900);
    const margin = { top: 10, right: 24, bottom: 80, left: 70 };
    const height = 460;

    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // === Scales ===
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.gname))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const x1 = d3.scaleBand()
      .domain(series.map(s => s.key))
      .range([0, x0.bandwidth()])
      .padding(0.15);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d3.max(series, s => d[s.key]))]).nice()
      .range([height - margin.bottom, margin.top]);

    // === Axes ===
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0))
      .selectAll("text")
      .attr("transform", "rotate(30)")
      .attr("text-anchor", "start");

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

    // griglia orizzontale
    svg.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(6)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat(() => "")
      )
      .attr("transform", `translate(${margin.left},0)`)
      .selectAll("line")
      .attr("stroke", "#e5e7eb")
      .attr("opacity", 0.6);

    // === Bars ===
    const barsG = svg.append("g").attr("class", "bars");

    const group = barsG.selectAll("g.group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "group")
      .attr("transform", d => `translate(${x0(d.gname)},0)`);

    const bars = group.selectAll("rect.bar")
      .data(d => series.map(s => ({ gname: d.gname, key: s.key, value: d[s.key] })))
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x1(d.key))
      .attr("y", d => y(0))
      .attr("width", x1.bandwidth())
      .attr("height", d => (height - margin.bottom) - y(0))
      .attr("fill", d => series.find(s => s.key === d.key).color)
      .style("pointer-events", "none");

    // Animazione iniziale
    await bars.transition().duration(700)
      .attr("y", d => y(d.value))
      .attr("height", d => (height - margin.bottom) - y(d.value))
      .end();

    bars.style("pointer-events", "auto");

    // === Legend (sotto il grafico, centrata) ===
    const legendWrap = legend
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("gap", "16px")
      .style("flex-wrap", "wrap")
      .style("margin-top", "1.5rem")
      .style("text-align", "center");

    const legendItems = legendWrap.selectAll(".legend-item")
      .data(series)
      .enter()
      .append("div")
      .attr("class", "legend-item")
      .style("display", "inline-flex")
      .style("align-items", "center")
      .style("gap", "8px")
      .style("cursor", "pointer")
      .style("user-select", "none")
      .on("click", (_, s) => {
        activeCategory = (activeCategory === s.key) ? null : s.key;
        update();
      });

    legendItems.append("span")
      .style("display", "inline-block")
      .style("width", "14px")
      .style("height", "14px")
      .style("border-radius", "3px")
      .style("background", d => d.color);

    legendItems.append("span").text(d => d.label);

    const fmt = d3.format(","), gray = "#c7c7c7";

    // helpers per hover in single-view
    function enableSingleHover(sKey, sColor) {
      const gray = "#c7c7c7";
      const fmt = d3.format(",");

      bars
        .style("pointer-events", d => d.key === sKey ? "auto" : "none")
        .on("mouseenter.single", function (event, d) {
          if (d.key !== sKey) return;

          // Dimming: le altre barre della stessa categoria diventano grigie
          bars.attr("fill", b =>
            (b.key === sKey && b.gname !== d.gname) ? gray :
              (b.key === sKey ? sColor : "transparent")
          );

          // Tooltip volante con transizione
          showTooltip(event, `<b>${d.gname}</b><br>${fmt(d.value)} attacks`);
        })
        .on("mousemove.single", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave.single", function () {
          // Ripristina colori e nascondi tooltip con transizione
          bars.attr("fill", b =>
            (b.key === sKey) ? sColor : series.find(s => s.key === b.key).color
          );
          hideTooltip();
        });
    }

    function disableHover() {
      bars
        .style("pointer-events", "none")
        .on(".single", null);
      hideTooltip();
    }

    // === Update ===
    function update() {
      if (activeCategory === null) {
        // GROUPED VIEW
        disableHover();

        y.domain([0, d3.max(data, d => d3.max(series, s => d[s.key]))]).nice();
        svg.select(".y-axis").transition().duration(450)
          .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

        bars.transition().duration(450)
          .attr("x", d => x1(d.key))
          .attr("width", x1.bandwidth())
          .attr("y", d => y(d.value))
          .attr("height", d => (height - margin.bottom) - y(d.value))
          .attr("fill", d => series.find(s => s.key === d.key).color)
          .style("opacity", 1)
          .end()
          .then(() => bars.style("pointer-events", "auto"));

        legendItems.style("opacity", 1).style("font-weight", "500");

      } else {
        // SINGLE CATEGORY VIEW
        const sKey = activeCategory;
        const sColor = series.find(s => s.key === sKey).color;

        // y basata solo sulla categoria attiva
        y.domain([0, d3.max(data, d => d[sKey])]).nice();
        svg.select(".y-axis").transition().duration(450)
          .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

        // Larghezza banda del gruppo e larghezza barra singola
        const bw = x0.bandwidth();
        const singleW = bw * 0.6;
        const centerX = (bw - singleW) / 2; // <— centratura corretta dentro la banda del gruppo

        bars.transition().duration(450)
          // In single view NON usiamo più x1(d.key): centriamo sempre nella banda del gruppo
          .attr("x", () => centerX)
          .attr("width", () => singleW)
          .attr("y", d => y(d.value))
          .attr("height", d => (height - margin.bottom) - y(d.value))
          .attr("fill", sColor)
          .style("opacity", d => (d.key === sKey ? 1 : 0))
          .on("end", function(_, d) {
            // solo la serie attiva è interattiva
            d3.select(this).style("pointer-events", d.key === sKey ? "auto" : "none");
          });

        // Evidenziazione legenda
        legendItems.style("opacity", d => (d.key === sKey ? 1 : 0.4))
                  .style("font-weight", d => (d.key === sKey ? "700" : "500"));
      }
    }
  })();
}