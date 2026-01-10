window.addEventListener('resize', () => { if (window._draw_group_3_lastCall) draw_group_3(...window._draw_group_3_lastCall); });

function draw_group_3(data, choice, containerId) {
  window._draw_group_3_lastCall = [data, choice, containerId];

  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;

  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. DIMENSIONS
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

  const labelPadding = 45;

  svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  // 2. DATA PREP
  const rawData = data[choice];
  if (!rawData || !rawData.nodes || rawData.nodes.length === 0) {
    g.append("text")
      .text("No Data")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .style("text-anchor", "middle")
      .style("font-size", `${chartLabelFontSize}px`);
    return;
  }

  const sankeyData = {
    nodes: rawData.nodes.map(d => ({ ...d })),
    links: rawData.links.map(d => ({ ...d }))
  };

  // 3. SANKEY GENERATOR
  if (!d3.sankey) return;

  const sankey = d3.sankey()
    .nodeId(d => d.index)
    .nodeWidth(12)
    .nodePadding(12)
    .nodeSort((a, b) => b.value - a.value)
    .extent([[labelPadding, 0], [innerWidth - labelPadding, innerHeight]]);

  const { nodes, links } = sankey(sankeyData);

  // 4. COLORS & UTILS
  let attackColorIndex = 0;
  let targetColorIndex = 0;

  const colorsAttack = [
    '#E15759',
    '#F28E2B',
    '#EDC948',
    '#59A14F',
    '#76B7B2',
  ];
  const colorsTarget = [
    '#4E79A7',
    '#9C755F',
    '#B07AA1',
    '#FF9DA7',
    '#BAB0AC',
  ];

  const nodeColorMap = new Map();
  nodes.forEach(d => {
    if (d.name === 'Unknown') {
      nodeColorMap.set(d.index, COLORS.defaultComparison);
    } else if (d.type === 'attack') {
      nodeColorMap.set(d.index, colorsAttack[attackColorIndex++ % colorsAttack.length]);
    } else {
      nodeColorMap.set(d.index, colorsTarget[targetColorIndex++ % colorsTarget.length]);
    }
  });

  const getColor = (d) => nodeColorMap.get(d.index);

  // 5. DRAW LINKS
  const link = g.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(links)
    .enter().append("path")
    .attr("class", "sankey-link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", "#ccc")
    .attr("stroke-width", d => Math.max(1, d.width))
    .style("stroke-opacity", 0.3)
    .sort((a, b) => b.width - a.width);

  // Link Hover
  link.on("mouseover", function (event, d) {
    d3.select(this).style("stroke-opacity", 0.7).attr("stroke", "#999");
    showTooltip(event, `${d.value}`);
  })
    .on("mousemove", moveTooltip)
    .on("mouseout", function () {
      d3.select(this).style("stroke-opacity", 0.3).attr("stroke", "#ccc");
      hideTooltip();
    });

  // 6. DRAW NODES
  const node = g.append("g")
    .selectAll("rect")
    .data(nodes)
    .enter().append("rect")
    .attr("class", "sankey-node")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", (d, i) => getColor(d, i))
    .attr("stroke", "#333");

  // Node Hover Interaction
  node.on("mouseover", function (event, d) {
    d3.selectAll('.sankey-link').style("stroke-opacity", 0.05);
    d3.selectAll('.sankey-node').style("opacity", 0.3);
    d3.selectAll('.sankey-label').style("opacity", 0.2);

    d3.select(this).style("opacity", 1);

    d3.selectAll('.sankey-label')
      .filter(labelData => labelData.index === d.index)
      .style("opacity", 1)
      .style("font-weight", "bold");

    d3.selectAll('.sankey-link')
      .filter(l => l.source.index === d.index || l.target.index === d.index)
      .style("stroke-opacity", 0.8)
      .attr("stroke", "#666");

    const connectedNodeIndices = new Set();
    links.forEach(l => {
      if (l.source.index === d.index) connectedNodeIndices.add(l.target.index);
      if (l.target.index === d.index) connectedNodeIndices.add(l.source.index);
    });

    d3.selectAll('.sankey-node')
      .filter(n => connectedNodeIndices.has(n.index))
      .style("opacity", 1);

    d3.selectAll('.sankey-label')
      .filter(labelData => connectedNodeIndices.has(labelData.index))
      .style("opacity", 1);

    showTooltip(event, `${d.value}`);
  })
    .on("mousemove", moveTooltip)
    .on("mouseout", function () {
      d3.selectAll('.sankey-link').style("stroke-opacity", 0.3).attr("stroke", "#ccc");
      d3.selectAll('.sankey-node').style("opacity", 1);
      d3.selectAll('.sankey-label').style("opacity", 1).style("font-weight", "normal");
      hideTooltip();
    });

  // 7. LABELS
  const texts = g.append("g")
    .style("font-size", `${Math.max(9, chartLabelFontSize - 2)}px`)
    .style("fill", COLORS.textPrimary)
    .style("pointer-events", "none")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
    .attr("class", "sankey-label")
    .attr("x", d => d.x0 < innerWidth / 2 ? d.x0 - 6 : d.x1 + 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("text-anchor", d => d.x0 < innerWidth / 2 ? "end" : "start");

  texts.each(function (d) {
    wrapByChar(d3.select(this), d.name, 12, 1.1);
  });

  // 8. TITLES
  const headerY = -10;
  svg.append("text")
    .attr("x", CHART_MARGIN.left + labelPadding)
    .attr("y", CHART_MARGIN.top + headerY)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartLabelFontSize}px`)
    .style("font-weight", "bold")
    .style("fill", "#666")
    .text("ATTACKS");

  svg.append("text")
    .attr("x", CHART_WIDTH - CHART_MARGIN.right - labelPadding)
    .attr("y", CHART_MARGIN.top + headerY)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartLabelFontSize}px`)
    .style("font-weight", "bold")
    .style("fill", "#666")
    .text("TARGETS");

  // 9. TOOLTIP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect")
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .attr("rx", 2);

  const tooltipText = tooltipGroup.append("text")
    .attr("x", 4)
    .attr("y", 9)
    .style("font-size", `${Math.max(8, chartLabelFontSize - 4)}px`)
    .style("font-family", "sans-serif");

  function showTooltip(event, text) {
    tooltipGroup.style("display", null);
    tooltipText.text(text);
    const bbox = tooltipText.node().getBBox();
    tooltipRect.attr("width", bbox.width + 8).attr("height", bbox.height + 5);
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const [x, y] = d3.pointer(event, svg.node());
    const xOffset = (x > CHART_WIDTH / 2) ? - (tooltipRect.attr("width") * 1) - 10 : 10;
    const yOffset = -15;
    tooltipGroup.attr("transform", `translate(${x + xOffset}, ${y + yOffset})`);
  }

  function hideTooltip() { tooltipGroup.style("display", "none"); }

  function wrapByChar(textElement, rawString, maxCharsPerLine, lineHeightEm) {
    const cleanString = rawString.replace(/\//g, ' / ');
    const words = cleanString.split(/\s+/);
    let lines = [], currentLine = [], currentLen = 0;
    words.forEach(word => {
      if (currentLen + word.length > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine.join(" ")); currentLine = [word]; currentLen = word.length;
      } else {
        currentLine.push(word); currentLen += word.length + 1;
      }
    });
    if (currentLine.length > 0) lines.push(currentLine.join(" "));
    textElement.text(null);
    const x = textElement.attr("x");
    const startDy = -((lines.length * lineHeightEm) / 2) + (lineHeightEm / 2) + 0.1;
    lines.forEach((line, i) => {
      textElement.append("tspan")
        .attr("x", x)
        .attr("dy", i === 0 ? `${startDy}em` : `${lineHeightEm}em`)
        .text(line);
    });
  }
}