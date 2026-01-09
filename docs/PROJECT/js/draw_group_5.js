window.addEventListener('resize', () => { if (window._draw_group_5_lastCall) draw_group_5(...window._draw_group_5_lastCall); });

function draw_group_5(data, choice, containerId) {
  window._draw_group_5_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS
  // Use global CHART_MARGIN
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  // 2. DATA CHECK
  const groupData = data[choice];
  
  if (!groupData || groupData.length === 0) {
     g.append("text")
      .text("No Data")
      .attr("x", innerWidth/2)
      .attr("y", innerHeight/2)
      .style("text-anchor", "middle")
      .style("font-size", `${chartLabelFontSize}px`);
     return;
  }

  // 3. SCALES
  const x0 = d3.scaleBand()
    .domain(groupData.map(d => d.bin))
    .rangeRound([0, innerWidth])
    .paddingInner(0.2);

  const subgroups = ["killed_count", "wounded_count"];
  const x1 = d3.scaleBand()
    .domain(subgroups)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  const maxY = d3.max(groupData, d => Math.max(d.killed_count, d.wounded_count));
  const y = d3.scaleLinear()
    .domain([0, maxY * 1.1])
    .rangeRound([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(subgroups)
    .range(["#d32f2f", "#fbc02d"]); 

  // 4. DRAW BARS
  const binGroup = g.append("g")
    .selectAll("g")
    .data(groupData)
    .enter().append("g")
    .attr("transform", d => `translate(${x0(d.bin)},0)`);

  const bars = binGroup.selectAll("rect")
    .data(d => subgroups.map(key => ({ key: key, value: d[key] })))
    .enter().append("rect")
    .attr("class", d => `bar bar-${d.key}`)
    .attr("x", d => x1(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("fill", d => color(d.key))
    .attr("rx", 2);

  // 5. BAR LABELS (Numbers on top)
  const labels = binGroup.selectAll(".bar-label")
    .data(d => subgroups.map(key => ({ key: key, value: d[key] })))
    .enter().append("text")
    .attr("class", d => `bar-label label-${d.key}`)
    .attr("x", d => x1(d.key) + x1.bandwidth() / 2)
    .attr("y", d => y(d.value) - 4)
    .attr("text-anchor", "middle")
    // Slightly smaller than standard chartLabelFontSize
    .style("font-size", `${Math.max(8, chartLabelFontSize - 3)}px`) 
    .style("fill", COLORS.textPrimary) 
    .style("font-weight", "bold")
    .text(d => d.value > 0 ? d.value : "");

  // --- INTERACTION LOGIC ---
  function highlightCategory(activeKey) {
      d3.selectAll(".bar")
        .transition().duration(200)
        .attr("fill", d => d.key === activeKey ? color(d.key) : "#e0e0e0")
        .attr("opacity", d => d.key === activeKey ? 1 : 0.4);

      d3.selectAll(".bar-label")
        .transition().duration(200)
        .style("opacity", d => d.key === activeKey ? 1 : 0.2);

      d3.selectAll(".legend-item")
        .transition().duration(200)
        .style("opacity", function() {
            const itemKey = d3.select(this).datum(); 
            return itemKey === activeKey ? 1 : 0.3;
        });
  }

  function resetHighlight() {
      d3.selectAll(".bar")
        .transition().duration(200)
        .attr("fill", d => color(d.key))
        .attr("opacity", 1);

      d3.selectAll(".bar-label")
        .transition().duration(200)
        .style("opacity", 1);

      d3.selectAll(".legend-item")
        .transition().duration(200)
        .style("opacity", 1);
        
      tooltipGroup.style("display", "none");
  }

  bars
    .on("mouseover", function(event, d) {
        highlightCategory(d.key);
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);
        
        // Tooltip: Label only
        tooltipGroup.style("display", null);
        const label = d.key === "killed_count" ? "Fatalities" : "Injuries";
        tooltipText.text(label);
        
        const bbox = tooltipText.node().getBBox();
        tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
    })
    .on("mousemove", function(event) {
        const [mx, my] = d3.pointer(event, svg.node());
        let tx = mx + 10;
        if (tx + 80 > CHART_WIDTH) tx = mx - 90;
        tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
    })
    .on("mouseout", function() {
        d3.select(this).attr("stroke", "none");
        resetHighlight();
    });

  // 6. AXES
  // X Axis
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x0))
    .attr("color", COLORS.axisLine) // Color of the line and ticks
    .selectAll("text")
      .style("font-size", `${chartLabelFontSize}px`)
      .style("fill", COLORS.textPrimary);

  // X Title
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 35)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartLabelFontSize}px`)
    .style("fill", COLORS.textPrimary)
    .text("Casualties per Attack (Bin)");

  // 7. LEGEND (CENTERED & HORIZONTAL)
  const legendGroup = g.append("g")
    .attr("transform", `translate(${innerWidth / 2}, -10)`); // Inside top margin

  const createLegendItem = (key, label, colorHex, xOffset) => {
      const item = legendGroup.append("g")
          .datum(key) 
          .attr("class", "legend-item")
          .attr("transform", `translate(${xOffset}, 0)`) 
          .style("cursor", "pointer")
          .on("mouseover", () => highlightCategory(key))
          .on("mouseout", resetHighlight);

      item.append("rect")
          .attr("width", 8).attr("height", 8)
          .attr("fill", colorHex);
      
      item.append("text")
          .attr("x", 12).attr("y", 7)
          .text(label)
          .style("font-size", `${chartLabelFontSize}px`)
          .style("fill", COLORS.textPrimary);
  };

  createLegendItem("killed_count", "Fatalities", "#d32f2f", -65);
  createLegendItem("wounded_count", "Injuries", "#fbc02d", 10);

  // 8. TOOLTIP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect")
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .attr("rx", 2);
    
  const tooltipText = tooltipGroup.append("text")
    .attr("x", 5)
    .attr("y", 12)
    .style("font-size", `${chartLabelFontSize}px`)
    .style("font-weight", "bold")
    .style("fill", "#333");
}