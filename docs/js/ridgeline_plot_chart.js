function drawRidgePlotChart(rawData, SMOOTH_WINDOW = 5) {
  const container = d3.select("#dist_ridgeline_svg");
  const legend    = d3.select("#dist_ridgeline_legend");
  const tooltip   = d3.select("#dist_ridgeline_tooltip");
  if (container.empty()) return;

  // Stato: "continuous" | "discrete"
  let mode = "continuous";

  // helper numerico
  const toNum = v => {
    const n = +v;
    return Number.isFinite(n) ? n : 0;
  };

  // media mobile simmetrica; se window<=1 -> nessuno smoothing
  function movingAverage(values, window = 5) {
    if (window <= 1) return values.slice();
    const half = Math.floor(window / 2);
    return values.map((v, i) => {
      const start = Math.max(0, i - half);
      const end   = Math.min(values.length, i + half + 1);
      const slice = values.slice(start, end).filter(Number.isFinite);
      return slice.length ? d3.mean(slice) : 0;
    });
  }

  // --------- UI: Toggle nel legend container ----------
  function buildToggle() {
    legend.selectAll("*").remove();

    const wrap = legend
      .append("div")
      .style("display", "inline-flex")
      .style("gap", "8px")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("flex-wrap", "wrap");

    const mkBtn = (label, value) => {
      const btn = wrap.append("button")
        .attr("type", "button")
        .attr("aria-pressed", mode === value ? "true" : "false")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccd1d6")
        .style("border-radius", "8px")
        .style("background", mode === value ? "#111827" : "#fff")
        .style("color", mode === value ? "#fff" : "#111827")
        .style("font-size", "0.9rem")
        .style("cursor", "pointer")
        .text(label)
        .on("click", () => {
          if (mode !== value) {
            mode = value;
            buildToggle(); // aggiorna stile pulsanti
            render();      // ridisegna
          }
        });
      btn.on("mouseover", () => btn.style("filter", "brightness(0.98)"))
         .on("mouseout",  () => btn.style("filter", "none"));
    };

    mkBtn("Continuous", "continuous");
    mkBtn("Discrete",   "discrete");
  }

  function render() {
    container.selectAll("*").remove();
    tooltip.style("opacity", 0);

    // --- data prep (sanitization + clamp) ---
    const data = rawData
      .map(d => ({
        region: d.region,
        year: toNum(d.year),
        count: toNum(d.count),
        norm: Math.max(0, Math.min(1, toNum(d.norm))) // usa NORM (non MA5)
      }))
      .filter(d => Number.isFinite(d.year));

    if (!data.length) return;

    // --- Ordine per anno del picco (poi valore desc, poi alfabetico) ---
    const peakInfo = d3.rollups(
      rawData.map(d => ({
        region: d.region,
        year: toNum(d.year),
        val: Number.isFinite(+d.count_ma5) ? toNum(d.count_ma5) : toNum(d.count)
      })),
      v => {
        const vv = v.filter(x => Number.isFinite(x.year));
        const peakValue = d3.max(vv, d => d.val ?? 0);
        const peakYear  = d3.min(vv.filter(d => (d.val ?? 0) === peakValue), d => d.year);
        return { peakYear, peakValue };
      },
      d => d.region
    ).filter(d => Number.isFinite(d[1].peakYear));

    const regionOrder = (peakInfo.length
      ? peakInfo.sort((a, b) =>
          (a[1].peakYear - b[1].peakYear) ||
          d3.descending(a[1].peakValue, b[1].peakValue) ||
          d3.ascending(a[0], b[0])
        ).map(d => d[0])
      : Array.from(new Set(data.map(d => d.region))).sort(d3.ascending)
    );

    // --- responsive dims ---
    const node   = container.node();
    const width  = Math.max(360, node.getBoundingClientRect()?.width || node.clientWidth || 900);
    const rowH   = width < 576 ? 34 : 46;
    const top    = 24, right = 20, bottom = 52;

    // Misura larghezza massima etichette
    const tempSvg = d3.select(document.body)
      .append("svg").attr("width", 0).attr("height", 0)
      .style("position", "absolute").style("visibility", "hidden");
    const tempG = tempSvg.append("g").attr("font-size", width < 576 ? 12 : 14);
    const labelWidths = regionOrder.map(r => {
      const t = tempG.append("text").text(r);
      const w = t.node().getBBox().width; t.remove(); return w;
    });
    tempSvg.remove();

    const maxLabelWidth = Math.max(60, ...labelWidths);
    const left   = Math.min(Math.max(120, maxLabelWidth + 35), Math.round(width * 0.5));
    const height = top + bottom + rowH * regionOrder.length;

    // --- svg ---
    const svg = container.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- scales ---
    const years = d3.extent(data, d => d.year);
    if (!Number.isFinite(years[0]) || !Number.isFinite(years[1])) return;

    const x       = d3.scaleLinear().domain(years).range([left, width - right]);
    const y       = d3.scaleLinear().domain([0, 1]).range([rowH, 0]); // norm ∈ [0,1]
    const yRegion = d3.scaleBand().domain(regionOrder).range([top, height - bottom]).padding(0.35);

    // --- axes ---
    const xTicks = width < 576 ? 5 : 10;
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - bottom + 8})`)
      .call(d3.axisBottom(x).ticks(xTicks).tickFormat(d3.format("d")))
      .selectAll("text").style("font-size", width < 576 ? "0.8rem" : "0.95rem");

    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${left - 8},0)`)
      .call(d3.axisLeft(yRegion).tickSize(0))
      .selectAll("text")
      .style("font-size", width < 576 ? "0.8rem" : "0.95rem")
      .style("text-anchor", "end")
      .attr("x", -10);

    // --- clipPath ---
    const clipId = "ridgeclip-" + Math.random().toString(36).slice(2);
    svg.append("defs").append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", left).attr("y", top)
      .attr("width", width - left - right)
      .attr("height", height - top - bottom);

    // === Stili ===
    const FILL         = "rgba(255, 112, 117, 1)";
    const STROKE       = "#374151";
    const FILL_OPACITY = 0.9;
    const BAR_GAP      = 0.08; // spaziatura tra barrette (in frazione di step annuale)

    // --- gruppi per regione, sorted & smoothed ---
    const grouped = d3.groups(data, d => d.region)
      .map(([region, rows]) => {
        const sorted = rows
          .filter(r => Number.isFinite(r.year) && Number.isFinite(r.norm))
          .sort((a, b) => d3.ascending(a.year, b.year));
        // smoothing dinamico: se mode=discrete => window=0
        const w = mode === "continuous" ? SMOOTH_WINDOW : 0;
        const smoothed = movingAverage(sorted.map(r => r.norm), w);
        sorted.forEach((r, i) => (r.smoothed = smoothed[i]));
        return [region, sorted];
      })
      .filter(([, rows]) => rows.length >= 2);

    // ordine top→bottom per il disegno (righe in basso sopra)
    grouped.sort((a, b) => d3.ascending(yRegion(a[0]), yRegion(b[0])));

    const layer = svg.append("g").attr("clip-path", `url(#${clipId})`);

    if (mode === "continuous") {
      // ---- CONTINUOUS: area smussata ----
      const area = d3.area()
        .x(d => x(d.year))
        .y0(y(0))
        .y1(d => y(d.smoothed))
        .curve(d3.curveCatmullRom.alpha(0.6));

      layer.selectAll("path.ridge")
        .data(grouped)
        .enter()
        .append("path")
        .attr("class", "ridge")
        .attr("fill", FILL)
        .attr("fill-opacity", FILL_OPACITY)
        .attr("stroke", STROKE)
        .attr("stroke-width", 0.4)
        .attr("d", ([, rows]) => area(rows))
        .attr("transform", ([region]) => `translate(0, ${yRegion(region)})`)
        .style("opacity", 0)
        .transition().duration(600)
        .style("opacity", 1);

      // tooltip + highlight
      const fmt = d3.format(",");
      layer.selectAll("path.ridge")
        .on("mousemove", function (event, d) {
          const [, rows] = d;
          if (!rows || !rows.length) return;
          const [mx] = d3.pointer(event, this);
          const yr = Math.round(x.invert(mx));
          const row = rows.find(v => v.year === yr);
          if (!row) return;

          tooltip.transition().duration(120).style("opacity", 0.95);
          tooltip.html(`
            <div style="padding:8px 10px; font-size:13px;">
              <div style="font-weight:600;">${row.region}</div>
              <div><b>${yr}</b> — ${fmt(row.count)} attacks</div>
            </div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top",  (event.pageY - 20) + "px");

          layer.selectAll("path.ridge")
            .style("opacity", ([reg]) => reg === row.region ? 1 : 0.25);
        })
        .on("mouseleave", function () {
          tooltip.transition().duration(200).style("opacity", 0);
          layer.selectAll("path.ridge").style("opacity", 1);
        });

    } else {
      // ---- DISCRETE: barrette annuali per regione ----
      // calcola lo step medio tra anni (può esserci qualche buco)
      const allYears = Array.from(new Set(data.map(d => d.year))).sort(d3.ascending);
      const avgStep  = d3.mean(d3.pairs(allYears).map(([a, b]) => b - a)) || 1;

      grouped.forEach(([region, rows]) => {
        const g = layer.append("g")
          .attr("class", "ridge-bars")
          .attr("transform", `translate(0, ${yRegion(region)})`);

        // base Y (linea zero) per riferimento visivo (opzionale)
        g.append("line")
          .attr("x1", x(allYears[0])) // esteso su tutta l’area utile
          .attr("x2", x(allYears[allYears.length - 1]))
          .attr("y1", y(0))
          .attr("y2", y(0))
          .attr("stroke", "#e5e7eb");

        // larghezza barra: proporzione dello step annuale, con gap
        const stepPx = Math.max(1, x(allYears[0] + avgStep) - x(allYears[0]));
        const barW   = Math.max(1, stepPx * (1 - BAR_GAP));

        const rects = g.selectAll("rect")
          .data(rows)
          .enter()
          .append("rect")
          .attr("x", d => x(d.year) - barW / 2)
          .attr("y", y(0))
          .attr("width", barW)
          .attr("height", 0)
          .attr("fill", FILL)
          .attr("fill-opacity", FILL_OPACITY)
          .attr("stroke", STROKE)
          .attr("stroke-width", 0.4);

        rects.transition().duration(600)
          .attr("y", d => y(d.smoothed))  // in discrete: smoothed==norm (window=0)
          .attr("height", d => y(0) - y(d.smoothed));

        // tooltip + highlight per barre
        const fmt = d3.format(",");
        rects
          .on("mousemove", function (event, d) {
            tooltip.transition().duration(120).style("opacity", 0.95);
            tooltip.html(`
              <div style="padding:8px 10px; font-size:13px;">
                <div style="font-weight:600;">${d.region}</div>
                <div><b>${d.year}</b> — ${fmt(d.count)} attacks</div>
              </div>
            `)
              .style("left", (event.pageX + 10) + "px")
              .style("top",  (event.pageY - 20) + "px");

            layer.selectAll(".ridge-bars rect")
              .style("opacity", r => (r.region === d.region ? 1 : 0.25));
          })
          .on("mouseleave", function () {
            tooltip.transition().duration(200).style("opacity", 0);
            layer.selectAll(".ridge-bars rect").style("opacity", 1);
          });
      });
    }
  }

  // costruisci toggle e disegna
  buildToggle();
  render();

  // responsive redraw
  const host = d3.select("#dist_ridgeline_chart");
  if (!host.empty()) {
    const ro = new ResizeObserver(() => {
      clearTimeout(drawRidgePlotChart._t);
      drawRidgePlotChart._t = setTimeout(() => {
        // ricostruisci i toggle (per lo stile attivo) e ridisegna
        buildToggle();
        render();
      }, 150);
    });
    ro.observe(host.node());
  }
}