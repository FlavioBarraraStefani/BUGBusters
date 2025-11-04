// --- helper: wrap di testo SVG con ellissi di sicurezza ---
function wrapSvgText(selection, width, opts = {}) {
  const lineHeightEm = opts.lineHeight || 1.1;   // em
  selection.each(function() {
    const text = d3.select(this);
    const full = (text.text() || "").trim();
    if (!full) return;

    const words = full.split(/\s+/).filter(Boolean);
    text.text(null);

    let line = [];
    let lineNumber = 0;
    const x  = text.attr("x")  ?? 0;
    const y  = text.attr("y")  ?? 0;
    const dy = parseFloat(text.attr("dy") ?? 0);

    let tspan = text.append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em");

    for (let i = 0; i < words.length; i++) {
      line.push(words[i]);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(" "));
        line = [words[i]];
        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", (++lineNumber * lineHeightEm + dy) + "em")
          .text(words[i]);
      }
    }

    // Ellissi per parole lunghissime senza spazi
    text.selectAll("tspan").each(function() {
      const span = d3.select(this);
      let s = span.text();
      if (!s) return;
      while (this.getComputedTextLength() > width && s.length > 3) {
        s = s.slice(0, -1);
        span.text(s + "…");
      }
    });
  });
}

function drawStackedBarChart(rawData) {
  (async function () {
    const container       = d3.select("#stacked_bar_chart_container");
    const svgContainer    = container.select("#stacked_bar_chart_svg");
    const legendContainer = container.select("#stacked_bar_chart_legend");
    const tooltip         = container.select("#stacked_bar_chart_tooltip");

    // safety
    if (svgContainer.empty()) return;

    svgContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    // --- Data & helpers ---
    const allKeys = Object.keys(rawData[0]).filter(d => d !== "region_txt");
    const palette_map     = { "Other":"#8c564b", "Unknown":"#2c2c2c" };
    const defaultPalette  = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#17becf","#8c564b","#2ca02c"];
    const color = k => palette_map[k] || defaultPalette[ allKeys.indexOf(k) % defaultPalette.length ];
    const LITERAL_GREY = "#bfbfbf";

    function computeStackedPositions(data, keysOrder) {
      return data.map(row => {
        let cum = 0;
        const out = { region_txt: row.region_txt };
        keysOrder.forEach(k => {
          const v = +row[k] || 0;
          out[k] = { x0: cum, x1: cum + v };
          cum += v;
        });
        return out;
      });
    }

    let activeKey = null;
    let currentStacked = computeStackedPositions(rawData, allKeys);

    // SVG scaffolding (responsive)
    const outerSvg = svgContainer.append("svg").attr("preserveAspectRatio", "xMidYMid meet");
    const gRoot = outerSvg.append("g");

    // Legend (clic per filtrare una categoria)
    const legendSpans = legendContainer.selectAll("span")
      .data(allKeys)
      .enter()
      .append("span")
      .style("display","inline-block")
      .style("margin-right","16px")
      .style("cursor","pointer")
      .style("font-size","14px")
      .html(d=>`<span style="background:${color(d)};width:16px;height:16px;display:inline-block;margin-right:6px;border-radius:2px;vertical-align:middle;"></span>${d}`)
      .on("mouseover", function(event, key){
        const avg = rawData.reduce((s, r) => s + (+r[key]||0), 0) / rawData.length;
        tooltip.style("opacity",1)
          .html(`
            <div style="background:#fff; padding:14px 18px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); border:1px solid #e8e8e8;">
              <div style="display:flex; align-items:center; margin-bottom:6px;">
                <span style="background:${color(key)}; width:12px; height:12px; border-radius:2px; display:inline-block; margin-right:10px;"></span>
                <span style="color:#333; font-size:15px; font-weight:600;">${key}</span>
              </div>
              <div style="color:#000; font-size:24px; font-weight:700;">Media: ${avg.toFixed(1)}%</div>
            </div>
          `)
          .style("left",(event.pageX+10)+"px")
          .style("top",(event.pageY-20)+"px");
      })
      .on("mousemove", function(event){
        tooltip.style("left",(event.pageX+10)+"px").style("top",(event.pageY-20)+"px");
      })
      .on("mouseout", () => tooltip.style("opacity",0))
      .on("click", function(_, key){
        const self = d3.select(this);
        const wasActive = self.classed("active");
        legendContainer.selectAll("span").classed("active", false);

        if (wasActive) {
          activeKey = null;
          currentStacked = computeStackedPositions(rawData, allKeys);
        } else {
          self.classed("active", true);
          activeKey = key;
          currentStacked = rawData.map(row => {
            const idx = allKeys.indexOf(key);
            const order = allKeys.slice(idx).concat(allKeys.slice(0, idx));
            return computeStackedPositions([row], order)[0];
          });
        }
        render();
      });

    function render() {
      // larghezza reale del contenitore della card
      const cnode = container.node();
      const cw = Math.max(320, (cnode.getBoundingClientRect().width || cnode.clientWidth || 800));

      // --- Margine sinistro dinamico in base alla lunghezza label Y
      const longest = d3.max(rawData, d => (d.region_txt || "").length) || 0;
      const charPx  = cw < 576 ? 6.2 : 7.8; // stima px per char
      const minLeft = cw < 576 ? 120 : 180;
      const maxLeft = cw < 576 ? 240 : 300;
      const leftMargin = Math.max(minLeft, Math.min(maxLeft, Math.round(longest * charPx + 28)));

      const margin = { top: 10, right: 16, bottom: 40, left: leftMargin };

      // altezza proporzionale alle righe
      const rowH   = cw < 576 ? 26 : 34;
      const innerH = rowH * rawData.length;
      const innerW = Math.max(240, cw - margin.left - margin.right);

      const width  = innerW + margin.left + margin.right;
      const height = innerH + margin.top + margin.bottom;

      outerSvg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)   // utile per Safari
        .attr("height", height);

      gRoot.attr("transform", `translate(${margin.left},${margin.top})`);
      gRoot.selectAll("*").remove();

      // scale
      const y = d3.scaleBand()
        .domain(rawData.map(d => d.region_txt))
        .range([0, innerH])
        .padding(0.3);

      const x = d3.scaleLinear().domain([0,100]).range([0, innerW]);

      // asse y
      const yAxis = gRoot.append("g").attr("class","y-axis").call(d3.axisLeft(y));

      // WRAP delle etichette Y entro lo spazio disponibile (margin.left - padding)
      const labelBox = Math.max(50, margin.left - 18);
      yAxis.selectAll("text")
        .call(wrapSvgText, labelBox, { lineHeight: 1.15 })
        .each(function(d){ // title per label completa
          const t = d3.select(this);
          t.select("title").remove();
          t.append("title").text(d);
        })
        .style("font-size", cw < 576 ? "12px" : "15px")
        .style("font-weight", "700");

      // asse x
      gRoot.append("g")
        .attr("class","x-axis")
        .attr("transform",`translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d=>d+"%"))
        .selectAll("text")
        .style("font-size", cw < 576 ? "11px" : "14px")
        .style("font-weight", "600");

      // layers & rects
      allKeys.forEach(key => {
        const layer = gRoot.append("g")
          .attr("class","layer")
          .attr("data-key", key)
          .attr("fill", color(key));

        layer.selectAll("rect")
          .data(currentStacked.map(d => ({ region_txt: d.region_txt, ...d[key] })))
          .enter()
          .append("rect")
          .attr("y", d => y(d.region_txt))
          .attr("x", d => x(d.x0))
          .attr("width", d => x(d.x1) - x(d.x0))
          .attr("height", y.bandwidth())
          .on("mouseover", function(event,d){
            gRoot.selectAll("rect")
              .style("fill", r => (r === d) ? color(key) : LITERAL_GREY);

            tooltip.style("opacity",1)
              .html(`
                <div style="background:#fff; padding:16px 20px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.12); border:1px solid #e8e8e8;">
                  <div style="color:#666; font-size:12px; font-weight:500; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">${d.region_txt}</div>
                  <div style="display:flex; align-items:center; margin-bottom:6px;">
                    <span style="background:${color(key)}; width:12px; height:12px; border-radius:2px; display:inline-block; margin-right:10px;"></span>
                    <span style="color:#333; font-size:15px; font-weight:600;">${key}</span>
                  </div>
                  <div style="color:#000; font-size:${cw<576?22:28}px; font-weight:700; letter-spacing:-0.5px;">${(d.x1-d.x0).toFixed(1)}%</div>
                </div>
              `)
              .style("left",(event.pageX+10)+"px")
              .style("top",(event.pageY-20)+"px");
          })
          .on("mousemove", function(event){
            tooltip.style("left",(event.pageX+10)+"px").style("top",(event.pageY-20)+"px");
          })
          .on("mouseout", function() {
            allKeys.forEach(k => {
              gRoot.select(`g[data-key='${k}']`).selectAll("rect")
                .style("fill", color(k));
            });
            tooltip.style("opacity",0);
          });
      });

      // applica filtro colore se attivo
      if (activeKey) {
        allKeys.forEach(k => {
          gRoot.select(`g[data-key='${k}']`).selectAll("rect")
            .style("fill", k === activeKey ? color(k) : LITERAL_GREY);
        });
        legendSpans.classed("active", d => d === activeKey);
      } else {
        legendSpans.classed("active", false);
      }
    }

    // primo render
    render();

    // resize observer sul contenitore della card (più affidabile)
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => render());
      ro.observe(container.node());
    } else {
      window.addEventListener("resize", render);
    }
  })();
}