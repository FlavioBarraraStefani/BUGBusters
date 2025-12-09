function drawNetworkChart(rawData) {
  (async function () {

    const tooltip = d3.select("#sankey_chart_tooltip");
    const chartContainer = d3.select("#network_chart_svg");
    const legendContainer = d3.select("#network_chart_legend");

    chartContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    if (!Array.isArray(rawData) || !rawData.length) {
      console.warn("[drawNetworkChart] empty data");
      return;
    }

    // --- parse & filtra "unknown" ---
    let nodes = rawData
      .map(d => ({
        id: d.id,
        label: d.label,
        level: +d.level,
        parent: d.parent,
        total: +d.total || 0
      }))
      .filter(n => {
        if (!n.label) return false;
        const l = String(n.label).toLowerCase();
        return !l.includes("unknown");
      });

    const root  = nodes.find(n => n.level === 0);
    const types = nodes.filter(n => n.level === 1);
    const subs  = nodes.filter(n => n.level === 2);

    if (!root) {
      console.error("[drawNetworkChart] root node (level 0) not found");
      return;
    }

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // link root→type e type→subtype
    const links = [];
    nodes.forEach(n => {
      if (n.parent && nodeById.has(n.parent)) {
        links.push({ source: n.parent, target: n.id });
      }
    });

    // mappa type → figli subtype
    const childrenByType = d3.group(subs, d => d.parent);

    // === dimensioni ===
    const containerWidth = chartContainer.node().getBoundingClientRect().width || 800;
    const width  = containerWidth;
    const height = 520;

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    const cx = width / 2;
    const cy = height / 2 - 50;

    const minDim = Math.min(width, height);
    const innerRadius = minDim * 0.15; // weapon type
    const outerRadius = minDim * 0.32; // primo anello subtype
    const ringStep    = 42;            // distanza tra anelli multipli di subtypes
    const maxPerRing  = 5;             // max subtypes per anello per singolo type

    // === scala raggio nodi ===
    const totals = nodes.map(n => n.total).filter(v => v > 0);
    const maxTotal = d3.max(totals) || 1;

    const radiusLog = d3.scaleSqrt()
      .domain([1, maxTotal])
      .range([4, 20]);

    const radiusFixed = () => 7;
    let useLogSize = true;

    function nodeRadius(n) {
      if (!useLogSize) return radiusFixed();
      const v = Math.max(1, n.total);
      return radiusLog(v);
    }

    // === layout radiale gerarchico =========================
    // Root al centro
    root.x = cx;
    root.y = cy;
    root.angle = 0;

    // 1) assegna settori ai weapon type
    const nTypes = Math.max(1, types.length);
    const sectorSize    = (2 * Math.PI) / nTypes;
    const sectorPadding = sectorSize * 0.25; // 25% di spazio vuoto tra settori

    types.forEach((t, i) => {
      const sectorStart = i * sectorSize + sectorPadding / 2;
      const sectorEnd   = (i + 1) * sectorSize - sectorPadding / 2;
      const midAngle    = (sectorStart + sectorEnd) / 2;

      t.sectorStart = sectorStart;
      t.sectorEnd   = sectorEnd;
      t.angle       = midAngle;
      t.x = cx + innerRadius * Math.cos(midAngle);
      t.y = cy + innerRadius * Math.sin(midAngle);
    });

    // 2) subtypes: ogni type riempie "il proprio arco", con eventuali anelli multipli
    types.forEach(t => {
      const childs = childrenByType.get(t.id) || [];
      if (!childs.length) return;

      const m = childs.length;
      const fullSpan = t.sectorEnd - t.sectorStart;

      // posizioni angolari globali per tutti i figli (come se fossero su un solo anello)
      childs.sort((a, b) => d3.descending(a.total, b.total)); // facoltativo: più grossi per primi

      childs.forEach((c, idx) => {
        // a quale anello appartiene questo figlio?
        const ringIdx = Math.floor(idx / maxPerRing);
        const indexInRing = idx % maxPerRing;

        c.ringIdx = ringIdx;

        // quanti nodi in questo anello?
        const startIndexForRing = ringIdx * maxPerRing;
        const endIndexForRing   = Math.min(startIndexForRing + maxPerRing, m);
        const countThisRing     = endIndexForRing - startIndexForRing;

        // posizione angolare nel settore del padre
        const k = indexInRing + 1;
        const angle = t.sectorStart + fullSpan * (k / (countThisRing + 1));

        c.angle = angle;

        // raggio di questo anello
        const r = outerRadius + ringIdx * ringStep;

        c.x = cx + r * Math.cos(angle);
        c.y = cy + r * Math.sin(angle);
        c.ringRadius = r;
      });
    });

    // === disegno link ===
    const linkG = svg.append("g").attr("class", "links");

    const linkSel = linkG.selectAll("line.link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => nodeById.get(d.source).x)
      .attr("y1", d => nodeById.get(d.source).y)
      .attr("x2", d => nodeById.get(d.target).x)
      .attr("y2", d => nodeById.get(d.target).y);

    // === nodi ===
    const nodeG = svg.append("g").attr("class", "nodes");

    const circles = nodeG.selectAll("circle.node-circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", d => `node-circle level-${d.level}` + (d.level === 0 ? " root" : ""))
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 0);

    await circles
      .transition().duration(450)
      .attr("r", d => nodeRadius(d))
      .end();

    // === label: tutti i weapon type + solo top-K subtypes ===
    const typeLabels = types;

    const NUM_TOP_SUBTYPES = 30;
    const topSubtypes = subs
      .slice()
      .sort((a, b) => d3.descending(a.total, b.total))
      .slice(0, NUM_TOP_SUBTYPES);

    const labelNodes = typeLabels.concat(topSubtypes);

    // label: appena fuori dal raggio del nodo, non sopra il pallino
    nodeG.selectAll("text.node-label")
      .data(labelNodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("x", d => {
        const baseR =
          d.level === 1 ? innerRadius :
          (d.ringRadius != null ? d.ringRadius : outerRadius);
        const labelR = baseR + 18; // distanza extra dal centro
        return cx + labelR * Math.cos(d.angle);
      })
      .attr("y", d => {
        const baseR =
          d.level === 1 ? innerRadius :
          (d.ringRadius != null ? d.ringRadius : outerRadius);
        const labelR = baseR + 18;
        return cy + labelR * Math.sin(d.angle);
      })
      .attr("text-anchor", d => Math.cos(d.angle) >= 0 ? "start" : "end")
      .attr("dominant-baseline", "middle")
      .text(d => d.label);

    // === interazioni ===
    const fmt = d3.format(",.0f");

    circles
      .on("mouseenter", function (event, d) {
        const relatedIds = new Set([d.id]);
        links.forEach(l => {
          if (l.source === d.id) relatedIds.add(l.target);
          if (l.target === d.id) relatedIds.add(l.source);
        });

        circles.classed("dimmed", n => !relatedIds.has(n.id));
        linkSel.classed("dimmed", l => !(relatedIds.has(l.source) && relatedIds.has(l.target)));

        d3.select(this).raise().transition().duration(120)
          .attr("stroke-width", 2)
          .attr("fill-opacity", 1);

        tooltip.transition().duration(100).style("opacity", 0.95);
        tooltip.html(`
          <div style="padding:6px 8px; font-size:13px;">
            <div style="font-weight:600; margin-bottom:3px;">${d.label}</div>
            <div><b>Level:</b> ${
              d.level === 0 ? "Root (all attacks)"
                : (d.level === 1 ? "Weapon type" : "Weapon subtype")
            }</div>
            <div><b>Attacks:</b> ${fmt(d.total)}</div>
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
        tooltip.transition().duration(180).style("opacity", 0);
        circles.classed("dimmed", false)
          .transition().duration(150)
          .attr("stroke-width", 1)
          .attr("fill-opacity", d => d.level === 0 ? 1 : 0.9);
        linkSel.classed("dimmed", false);
      });

    // === legenda + toggle size ===
    const legendDiv = legendContainer
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("gap", "8px")
      .style("margin-top", "10px");

    const levelItems = [
      { level: 0, label: "All attacks (root)" },
      { level: 1, label: "Weapon type" },
      { level: 2, label: "Weapon subtype (top ones labelled)" }
    ];

    levelItems.forEach(item => {
      const d = legendDiv.append("div")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("gap", "6px")
        .style("font-size", "12px");

      d.append("span")
        .style("width", "10px")
        .style("height", "10px")
        .style("border-radius", "50%")
        .style("display", "inline-block")
        .style("background",
          item.level === 0 ? "#111827" :
          item.level === 1 ? "#1d4ed8" : "#f97316"
        );

      d.append("span").text(item.label);
    });

    const sizeToggle = legendDiv.append("div")
      .attr("class", "size-toggle");

    sizeToggle.append("span").text("Node size:");

    const btnFixed = sizeToggle.append("button")
      .text("Fixed")
      .classed("active", !useLogSize);

    const btnScaled = sizeToggle.append("button")
      .text("By attacks")
      .classed("active", useLogSize);

    function applySizeMode() {
      btnFixed.classed("active", !useLogSize);
      btnScaled.classed("active", useLogSize);
      circles.transition().duration(300)
        .attr("r", d => nodeRadius(d));
    }

    btnFixed.on("click", () => {
      useLogSize = false;
      applySizeMode();
    });

    btnScaled.on("click", () => {
      useLogSize = true;
      applySizeMode();
    });

  })();
}
