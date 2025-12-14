function drawNetworkChart(rawData) {
  (async function () {

    const tooltip = d3.select("#sankey_chart_tooltip");
    let currentHoveredNode = null;
    const chartContainer = d3.select("#network_chart_svg");
    const legendContainer = d3.select("#network_chart_legend");
    
    let controlsContainer = d3.select("#network_chart_controls");
    if (controlsContainer.empty()) {
      controlsContainer = d3.select(chartContainer.node().parentNode)
        .insert("div", "#network_chart_svg")
        .attr("id", "network_chart_controls");
    }

    chartContainer.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    controlsContainer.selectAll("*").remove();
    tooltip.style("opacity", 0);

    if (!Array.isArray(rawData) || !rawData.length) {
      console.warn("[drawNetworkChart] empty data");
      return;
    }

    // --- 1. Aggregazione Dati ---
    const hasYear = rawData.length > 0 && "year" in rawData[0];
    let nodesMap = new Map();
    let yearsSet = new Set();

    rawData.forEach(d => {
      if (!d.label || String(d.label).toLowerCase().includes("unknown")) return;

      const id = d.id;
      const count = +d.total || 0;
      const yr = d.year ? +d.year : null;

      if (yr) yearsSet.add(yr);

      if (!nodesMap.has(id)) {
        nodesMap.set(id, {
          id: d.id,
          label: d.label,
          level: +d.level,
          parent: d.parent,
          grandTotal: 0,      
          currentTotal: 0,    
          yearlyData: []      
        });
      }

      const node = nodesMap.get(id);
      node.grandTotal += count;
      node.currentTotal += count; 
      if (yr) {
        node.yearlyData.push({ year: yr, count: count });
      }
    });

    let nodes = Array.from(nodesMap.values());
    
    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];

    const root  = nodes.find(n => n.level === 0);
    const types = nodes.filter(n => n.level === 1);
    const subs  = nodes.filter(n => n.level === 2);

    if (!root) {
      console.error("[drawNetworkChart] root node not found");
      return;
    }

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // --- 2. Link ---
    const links = [];
    nodes.forEach(n => {
      if (n.parent && nodeById.has(n.parent)) {
        links.push({ source: n.parent, target: n.id });
      }
    });

    const childrenByType = d3.group(subs, d => d.parent);

    // --- 3. Setup SVG ---
    const containerWidth = chartContainer.node().getBoundingClientRect().width || 800;
    
    // Altezza 600px (Compatta)
    const height = 450; 
    const width  = Math.max(containerWidth, 800);

    const svg = chartContainer.append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    const cx = width / 2;
    const cy = height / 2.5;

    // --- 4. Parametri Layout (Ridimensionati per rientrare) ---
    const minDim = Math.min(width, height);
    
    // Riduco i raggi per essere sicuro che nessun pallino esca (padding di sicurezza)
    // Prima outerRadius era 0.35 * 600 = 210. Ora 0.30 * 600 = 180.
    // Questo libera circa 30-40px per lato.
    const innerRadius = minDim * 0.15; 
    const outerRadius = minDim * 0.35; 
    const ringStep    = 45;            // Ridotto step (era 50)
    const maxPerRing  = 7;             

    // --- 5. Scala Dimensioni ---
    const maxTotal = d3.max(nodes, n => n.grandTotal) || 1;

    // Mantengo i pallini visibili (max 30px)
    const radiusLog = d3.scaleSqrt()
      .domain([0, maxTotal])
      .range([3, 35]); 

    const radiusFixed = () => 8;
    let useLogSize = true;

    function nodeRadius(n) {
      if (!useLogSize) return radiusFixed();
      return radiusLog(Math.max(0, n.currentTotal));
    }

    // --- 6. Calcolo Coordinate ---
    root.x = cx;
    root.y = cy;
    root.angle = 0;

    const nTypes = Math.max(1, types.length);
    const sectorSize    = (2 * Math.PI) / nTypes;
    const sectorPadding = sectorSize * 0.15; 

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

    types.forEach(t => {
      const childs = childrenByType.get(t.id) || [];
      if (!childs.length) return;

      childs.sort((a, b) => d3.descending(a.grandTotal, b.grandTotal));

      const m = childs.length;
      const fullSpan = t.sectorEnd - t.sectorStart;

      childs.forEach((c, idx) => {
        const ringIdx = Math.floor(idx / maxPerRing);
        const indexInRing = idx % maxPerRing;
        c.ringIdx = ringIdx;

        const startIndexForRing = ringIdx * maxPerRing;
        const endIndexForRing   = Math.min(startIndexForRing + maxPerRing, m);
        const countThisRing     = endIndexForRing - startIndexForRing;

        const k = indexInRing + 1;
        const angle = t.sectorStart + fullSpan * (k / (countThisRing + 1));

        c.angle = angle;
        const r = outerRadius + ringIdx * ringStep;

        c.x = cx + r * Math.cos(angle);
        c.y = cy + r * Math.sin(angle);
      });
    });

    // --- 7. Disegno ---
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

    const nodeG = svg.append("g").attr("class", "nodes");
    // Sorting: grandi sotto, piccoli sopra
    nodes.sort((a, b) => d3.descending(a.grandTotal, b.grandTotal));

    const circles = nodeG.selectAll("circle.node-circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", d => `node-circle level-${d.level}` + (d.level === 0 ? " root" : ""))
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 0); 

    const fmt = d3.format(",.0f");

    // --- 8. Timeline ---
    let currentYear = hasYear ? minYear : null;
    let isPlaying = false;
    let timer = null;

    function updateToYear(year) {
      currentYear = year;
      nodes.forEach(n => {
        if (!hasYear) {
          n.currentTotal = n.grandTotal; 
        } else {
          const sum = n.yearlyData
            .filter(d => d.year <= year)
            .reduce((acc, curr) => acc + curr.count, 0);
          n.currentTotal = sum;
        }
      });
      
      circles.transition().duration(400)
        .attr("r", d => nodeRadius(d));

      if (hasYear) {
        d3.select("#year-display-val").text(year);
        d3.select("#year-slider-input").property("value", year);
      }

      if (currentHoveredNode) {
        const levelLabel = currentHoveredNode.level === 0 ? "Root" 
                         : currentHoveredNode.level === 1 ? "Weapon type" 
                         : "Weapon subtype";
        const countVal = currentHoveredNode.currentTotal; 
        const yearLabel = hasYear ? ` (up to ${currentYear})` : "";
        tooltip.html(`
          <div style="padding: 8px 12px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #fff;">
              ${currentHoveredNode.label}
            </div>
            <div style="margin-bottom: 3px; font-size: 13px;">
              <span style="font-weight: 600; color: #d1d5db;">Level:</span> 
              <span style="color: #f3f4f6;">${levelLabel}</span>
            </div>
            <div style="font-size: 13px;">
              <span style="font-weight: 600; color: #d1d5db;">Attacks${yearLabel}:</span> 
              <span style="color: #f3f4f6;">${fmt(countVal)}</span>
            </div>
          </div>
        `);
      }
    }

    updateToYear(hasYear ? maxYear : 0);

    if (hasYear && years.length > 1) {
      const row = controlsContainer.append("div").attr("class", "timeline-row");

      const playBtn = row.append("button")
        .attr("class", "play-btn")
        .text("Play");

      const slider = row.append("input")
        .attr("type", "range")
        .attr("class", "year-slider")
        .attr("id", "year-slider-input")
        .attr("min", minYear)
        .attr("max", maxYear)
        .attr("step", 1)
        .attr("value", maxYear)
        .on("input", function() {
          stopAnimation();
          updateToYear(+this.value);
        });

      const yearDisplay = row.append("div")
        .attr("class", "year-display")
        .attr("id", "year-display-val")
        .text(maxYear);

      function stopAnimation() {
        isPlaying = false;
        playBtn.text("Play");
        if (timer) clearInterval(timer);
      }

      function startAnimation() {
        isPlaying = true;
        playBtn.text("Pause");
        if (currentYear >= maxYear) updateToYear(minYear);

        timer = setInterval(() => {
          if (currentYear >= maxYear) {
            stopAnimation();
            return;
          }
          updateToYear(currentYear + 1);
        }, 300);
      }

      playBtn.on("click", () => {
        if (isPlaying) stopAnimation();
        else startAnimation();
      });
    }

    controlsContainer
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("justify-content", "space-between")
      .style("align-items", "center")
      .style("gap", "20px");

    const sizeToggle = controlsContainer.append("div").attr("class", "size-toggle");
    sizeToggle.append("span").text("Node size:");

    const btnFixed = sizeToggle.append("button").text("Fixed").classed("active", !useLogSize).style("transition", "all 0.3s ease");
    const btnScaled = sizeToggle.append("button").text("By attacks").classed("active", useLogSize).style("transition", "all 0.3s ease");

    function applySizeMode() {
      btnFixed.classed("active", !useLogSize);
      btnScaled.classed("active", useLogSize);
      circles.transition().duration(300).attr("r", d => nodeRadius(d));
    }

    btnFixed.on("click", () => { useLogSize = false; applySizeMode(); });
    btnScaled.on("click", () => { useLogSize = true; applySizeMode(); });

    sizeToggle.style("display", "none");

    // --- 9. Interazioni ---
    circles
      .on("mouseenter", function (event, d) {
        const relatedIds = new Set([d.id]);
        links.forEach(l => {
          if (l.source === d.id) relatedIds.add(l.target);
          if (l.target === d.id) relatedIds.add(l.source);
        });

        let curr = d;
        while (curr.parent && nodeById.has(curr.parent)) {
          const p = nodeById.get(curr.parent);
          relatedIds.add(p.id);
          curr = p;
        }

        circles.classed("dimmed", n => !relatedIds.has(n.id));
        linkSel
          .classed("active", l => relatedIds.has(l.source) && relatedIds.has(l.target))
          .classed("dimmed", l => !(relatedIds.has(l.source) && relatedIds.has(l.target)));

        d3.select(this).raise().transition().duration(120)
          .attr("stroke-width", 3)
          .attr("fill-opacity", 1);

        const levelLabel = d.level === 0 ? "Root" 
                         : d.level === 1 ? "Weapon type" 
                         : "Weapon subtype";
        
        const countVal = d.currentTotal; 
        const yearLabel = hasYear ? ` (up to ${currentYear})` : "";

        tooltip.transition().duration(100).style("opacity", 1);
        tooltip.html(`
          <div style="padding: 8px 12px;">
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #fff;">
              ${d.label}
            </div>
            <div style="margin-bottom: 3px; font-size: 13px;">
              <span style="font-weight: 600; color: #d1d5db;">Level:</span> 
              <span style="color: #f3f4f6;">${levelLabel}</span>
            </div>
            <div style="font-size: 13px;">
              <span style="font-weight: 600; color: #d1d5db;">Attacks${yearLabel}:</span> 
              <span style="color: #f3f4f6;">${fmt(countVal)}</span>
            </div>
          </div>
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px");
        currentHoveredNode = d;
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseleave", function () {
        tooltip.transition().duration(180).style("opacity", 0);
        circles.classed("dimmed", false)
          .transition().duration(150)
          .attr("stroke-width", 1)
          .attr("fill-opacity", d => d.level === 0 ? 1 : 0.9);
        linkSel.classed("dimmed", false)
               .classed("active", false);
        currentHoveredNode = null;
      });

    // --- 10. Legenda ---
    const legendDiv = legendContainer
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("gap", "8px")
      .style("margin-top", "10px");

    const levelItems = [
      { level: 0, label: "All attacks" },
      { level: 1, label: "Type" },
      { level: 2, label: "Subtype" }
    ];

    levelItems.forEach(item => {
      const d = legendDiv.append("div")
        .style("display", "inline-flex")
        .style("align-items", "center")
        .style("gap", "6px")
        .style("font-size", "13px");

      d.append("span")
        .style("width", "12px")
        .style("height", "12px")
        .style("border-radius", "50%")
        .style("display", "inline-block")
        .style("background",
          item.level === 0 ? "#111827" :
          item.level === 1 ? "#1d4ed8" : "#f97316"
        );
      d.append("span").text(item.label);
    });

  })();
}