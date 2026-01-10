const ATTACK_3_CONFIG = {
  "Explosives": { url: "https://api.iconify.design/mdi:bomb.svg?color=white", color: "#D32F2F" },
  "Firearms": { url: "https://api.iconify.design/mdi:pistol.svg?color=white", color: "#0f1113ff" },
  "Incendiary": { url: "https://api.iconify.design/mdi:fire.svg?color=white", color: "#F57C00" },
  "Melee": { url: "https://api.iconify.design/mdi:knife.svg?color=white", color: "#777474ff" },
  "Chemical": { url: "https://api.iconify.design/mdi:flask.svg?color=white", color: "#2ecc71" },
  "Sabotage Equipment": { url: "https://api.iconify.design/mdi:wrench.svg?color=white", color: "#FFC107" },
  "Others": { url: "https://api.iconify.design/mdi:dots-horizontal.svg?color=white", color: "#AB47BC" },
  "Unknown": { url: "https://api.iconify.design/mdi:help.svg?color=white", color: "#d0d0d0ff" }
};

window._attack3_preload_promise = null;

window.addEventListener('resize', () => {
  if (window._draw_attack_3_lastCall) {
    draw_attack_3(...window._draw_attack_3_lastCall);
  }
});

window.addEventListener('load', () => {
  preload_attack_3();
});

function preload_attack_3() {
  if (window._attack3_preload_promise) {
    return window._attack3_preload_promise;
  }

  window._attack3_preload_promise = (async () => {
    if (document.getElementById("attack3-svg-cache")) return;

    const hiddenContainer = d3.select("body").append("svg")
      .attr("id", "attack3-svg-cache")
      .style("position", "absolute")
      .style("width", 0)
      .style("height", 0)
      .style("overflow", "hidden");
    
    const defs = hiddenContainer.append("defs");

    const loadPromises = Object.keys(ATTACK_3_CONFIG).map(async (key) => {
      const item = ATTACK_3_CONFIG[key];
      const safeId = key.replace(/[^a-zA-Z0-9]/g, '_');

      try {
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`Failed to load ${item.url}`);
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svgElement = doc.documentElement;
        
        const symbol = defs.append("symbol")
          .attr("id", `icon_preload_${safeId}`)
          .attr("viewBox", svgElement.getAttribute("viewBox") || "0 0 24 24");
        
        symbol.html(svgElement.innerHTML);
        symbol.selectAll("*").attr("fill", "white"); 

      } catch (err) {
        console.warn(`Error preloading icon for ${key}:`, err);
      }
    });

    await Promise.all(loadPromises);
  })();

  return window._attack3_preload_promise;
}

async function draw_attack_3(data, choice, containerId) {
  window._draw_attack_3_lastCall = [data, choice, containerId];


  if (!window._attack3_preload_promise) {
    preload_attack_3();
  }
  await window._attack3_preload_promise;

  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;

  let svg = container.select('svg');
  if (svg.empty()) {
    svg = container.append('svg');
  }
  svg.selectAll('*').remove();

  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  const g = svg.append('g')
    .attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  const fallback = ATTACK_3_CONFIG["Others"];
  const internalPadding = 4;

  const categoryData = data.find(d => d.category === choice);
  if (!categoryData || !categoryData.data || categoryData.data.length === 0) {
    g.append("text").text("No Data").attr("x", innerWidth / 2).attr("y", innerHeight / 2);
    return;
  }

  const items = categoryData.data.map(d => ({
    ...d,
    safeLabel: d.label.replace(/[^a-zA-Z0-9]/g, '_')
  })).sort((a, b) => b.value - a.value);

  const defs = svg.append("defs");

  const cols = 10;
  const rows = 10;
  const totalCells = 100;
  const totalValue = d3.sum(items, d => d.value);

  items.forEach(item => {
    item.percentage = ((item.value / totalValue) * 100).toFixed(1);
  });

  const legendWidth = 100;
  const chartAreaWidth = innerWidth - legendWidth;
  const maxGridHeight = innerHeight;
  const maxGridWidth = chartAreaWidth;
  const cellSize = Math.min(maxGridWidth / cols, maxGridHeight / rows);
  const actualGridWidth = cellSize * cols;
  const actualGridHeight = cellSize * rows;
  const xOffsetStart = (chartAreaWidth - actualGridWidth) / 2;
  const yOffsetStart = (innerHeight - actualGridHeight) / 2;

  let count = 0;
  const gridData = [];

  items.forEach((item, i) => {
    let num = (i === items.length - 1)
      ? totalCells - count
      : Math.round((item.value / totalValue) * totalCells);
    count += num;

    const conf = ATTACK_3_CONFIG[item.label] || fallback;

    for (let k = 0; k < num; k++) {
      gridData.push({
        ...item,
        color: conf.color,
        percentage: ((item.value / totalValue) * 100).toFixed(1)
      });
    }
  });

  gridData.forEach((d, i) => {
    d.col = i % cols;
    d.row = Math.floor(i / cols);
    d.x = xOffsetStart + (d.col * cellSize);
    d.y = yOffsetStart + (d.row * cellSize);
  });

  const labelsInGridData = new Set(gridData.map(d => d.label));
  
  labelsInGridData.forEach(label => {
    const safeLabel = label.replace(/[^a-zA-Z0-9]/g, '_');
    
    const mask = defs.append("mask")
      .attr("id", `mask_${containerId}_${safeLabel}`)
      .attr("maskContentUnits", "objectBoundingBox"); 

    mask.append("use")
      .attr("href", (d) => {
         const exists = document.getElementById(`icon_preload_${safeLabel}`);
         return exists ? `#icon_preload_${safeLabel}` : `#icon_preload_Others`;
      })
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 1)
      .attr("height", 1);
  });

  const cellGroup = g.append("g");

  const cells = cellGroup.selectAll(".cell")
    .data(gridData)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", d => d.x + (internalPadding / 2))
    .attr("y", d => d.y + (internalPadding / 2))
    .attr("width", cellSize - internalPadding)
    .attr("height", cellSize - internalPadding)
    .attr("fill", d => d.color)
    .attr("mask", d => `url(#mask_${containerId}_${d.safeLabel})`)
    .style("cursor", "pointer")
    .style("opacity", 1);

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "white").attr("stroke", "#333").attr("rx", 4);
  const tooltipTitle = tooltipGroup.append("text").attr("x", 8).attr("y", 14).style("font-size", `${10}px`).style("font-weight", "700").style("fill", "#333");
  const tooltipBody = tooltipGroup.append("text").attr("x", 8).attr("y", 14 + 12 + 6).style("font-size", `${10}px`).style("fill", "#333");

  let lastTooltipWidth = 0;
  let lastTooltipHeight = 0;

  function highlight(label) {
    cells.transition().duration(200).style("opacity", d => d.label === label ? 1 : 0.2);
    legendGroup.selectAll(".legend-item").transition().duration(200).style("opacity", function () {
      return d3.select(this).datum().label === label ? 1 : 0.3;
    });
  }
  function unhighlight() {
    cells.transition().duration(200).style("opacity", 1);
    legendGroup.selectAll(".legend-item").transition().duration(200).style("opacity", 1);
    tooltipGroup.style("display", "none");
  }

  function handleCellMouseOver(event, d) {
    highlight(d.label);
    tooltipGroup.style("display", null);
    tooltipTitle.text(`Weapon: ${d.label}`);
    const pct = (d.percentage !== undefined) ? d.percentage : (((d.value / totalValue) * 100).toFixed(1));
    tooltipBody.text(`${d.value} attacks (${pct}% of the category)`);

    const titleBox = tooltipTitle.node().getBBox();
    const bodyBox = tooltipBody.node().getBBox();
    const w = Math.max(titleBox.width, bodyBox.width) + 16;
    const h = titleBox.height + bodyBox.height + 10;
    tooltipRect.attr("width", w).attr("height", h);
    lastTooltipWidth = w;
    lastTooltipHeight = h;
  }

  function handleCellMouseMove(event) {
    const [mx, my] = d3.pointer(event, svg.node());
    const tooltipWidth = lastTooltipWidth || 100;
    const tooltipHeight = lastTooltipHeight || 50;

    let tx = mx + 5;
    let ty = my + 5;

    if (tx + tooltipWidth > CHART_WIDTH) tx = mx - tooltipWidth - 10;
    if (tx < 0) tx = 5;
    if (ty + tooltipHeight > CHART_HEIGHT) ty = my - tooltipHeight - 10;
    if (ty < 0) ty = 5;

    tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
  }

  cells
    .on("mouseover", handleCellMouseOver)
    .on("mousemove", handleCellMouseMove)
    .on("mouseout", unhighlight);

  const legendLabels = Array.from(labelsInGridData).sort();
  const legendItems = legendLabels.map(label => items.find(d => d.label === label)).filter(item => item && item.value > 0);

  const legendGroup = g.append("g")
    .attr("transform", `translate(${xOffsetStart + actualGridWidth + 20}, 0)`);

  legendGroup.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text("Weapon usage %")
    .style("font-size", "10px")
    .style("font-weight", "700")
    .style("fill", "#333");

  let currentY = 16;
  legendItems.forEach(item => {
    const conf = ATTACK_3_CONFIG[item.label] || fallback;
    const itemG = legendGroup.append("g")
      .datum(item)
      .attr("class", "legend-item")
      .attr("transform", `translate(0, ${currentY})`)
      .style("cursor", "pointer")
      .on("mouseover", handleCellMouseOver)
      .on("mousemove", handleCellMouseMove)
      .on("mouseout", unhighlight);
    
    itemG.append("rect")
      .attr("width", 8).attr("height", 8)
      .attr("fill", conf.color).attr("rx", 1);

    itemG.append("text")
      .attr("x", 12).attr("y", 7)
      .text(item.label)
      .style("font-size", "10px").style("fill", "#333");

    currentY += 18;
  });

  try {
    const heuristicHeight = currentY;
    const node = legendGroup.node();
    const legendBBox = (node && node.getBBox) ? node.getBBox() : null;
    const measuredHeight = (legendBBox && legendBBox.height) ? legendBBox.height : 0;
    const legendHeight = measuredHeight > 0 ? measuredHeight : heuristicHeight;

    const legendX = xOffsetStart + actualGridWidth + 20;
    const legendY = yOffsetStart + (actualGridHeight / 2) - (legendHeight / 2);
    legendGroup.attr("transform", `translate(${legendX}, ${legendY})`);
  } catch (err) {
    const legendX = xOffsetStart + actualGridWidth + 20;
    const legendY = yOffsetStart + (actualGridHeight / 2) - (currentY / 2);
    legendGroup.attr("transform", `translate(${legendX}, ${legendY})`);
    console.warn("Could not measure legend bounding box; used heuristic:", err);
  }
}