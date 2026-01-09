window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Base Font Size from global config or default
  const BASE_FONT = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // 1. DATA PREP
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
     svg.append("text")
      .text("No Data")
      .attr("x", CHART_WIDTH/2)
      .attr("y", CHART_HEIGHT/2)
      .style("text-anchor", "middle")
      .style("font-size", `${BASE_FONT}px`)
      .style("fill", COLORS.textPrimary);
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
const colorMap = {};
topTargets.forEach((target, i) => {
        colorMap[target] = categoricalColors[i % categoricalColors.length];
});

  // 2. SVG SETUP
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  // 3. SMART LEGEND CALCULATION
  const legendGroup = svg.append('g').attr('class', 'legend-group');
  
  // Margini laterali per la legenda
  const legendMarginLeft = CHART_MARGIN.left;
  const legendMarginRight = CHART_MARGIN.right;
  const availableWidth = CHART_WIDTH - legendMarginLeft - legendMarginRight;
  
  const iconSize = 10;
  const itemGap = 10; // Spazio minimo tra gli elementi
  
  // A. Calculate optimal Font Size & Layout
  let legendFontSize = BASE_FONT;
  let legendLayout = [];
  let finalLegendHeight = 0;

  // Function to simulate layout with a specific font size
  function computeLayout(fontSize) {
      const rows = [];
      let currentRow = { items: [], width: 0 };
      let totalW = 0;
      
      // Temporary text to measure width
      const tmpText = svg.append("text").style("font-size", `${fontSize}px`).style("font-weight", "bold").attr("opacity", 0);

      const items = topTargets.map(key => {
          tmpText.text(key);
          const w = tmpText.node().getBBox().width + iconSize + 5; // Icon + Gap + Text
          return { key, width: w };
      });
      tmpText.remove();

      // Check if they fit in one line
      const totalWidthAll = items.reduce((acc, item) => acc + item.width, 0) + (items.length - 1) * itemGap;
      
      if (totalWidthAll <= availableWidth) {
          // FIT IN ONE LINE: Distribute Logic
          // Calculate gap to spread across full width
          const extraSpace = availableWidth - items.reduce((acc, item) => acc + item.width, 0);
          const dynamicGap = items.length > 1 ? extraSpace / (items.length - 1) : 0;
          
          let currentX = 0;
          items.forEach(item => {
              rows.push({ key: item.key, x: currentX, y: 0, width: item.width });
              currentX += item.width + dynamicGap;
          });
          return { rows: rows, height: fontSize + 8, fit: true };
      } 
      else {
          // WRAP LOGIC
          let currentX = 0;
          let currentY = 0;
          const lineHeight = fontSize + 8;
          const computedItems = [];

          items.forEach(item => {
              if (currentX + item.width > availableWidth && currentX > 0) {
                  currentX = 0;
                  currentY += lineHeight;
              }
              computedItems.push({ key: item.key, x: currentX, y: currentY, width: item.width });
              currentX += item.width + itemGap;
          });
          
          // Center the wrapped rows
          // (This is a simplified centering, calculating true row widths is complex but this is robust enough)
          return { rows: computedItems, height: currentY + lineHeight, fit: false };
      }
  }

  // Iterative Font Reduction
  // Try to fit in one line or at least readable size
  let layoutResult;
  for (let s = BASE_FONT; s >= 6; s--) {
      layoutResult = computeLayout(s);
      // If fits in one line, stop. If we are at min size, accept whatever wrap we have.
      if (layoutResult.fit || s === 6) {
          legendFontSize = s;
          legendLayout = layoutResult.rows;
          finalLegendHeight = layoutResult.height;
          break;
      }
  }

  // B. Render Legend
  const legendTopPadding = 5;
  legendGroup.attr("transform", `translate(${legendMarginLeft}, ${CHART_MARGIN.top})`); // Start drawing at top margin

  legendLayout.forEach(d => {
      const gItem = legendGroup.append("g")
          .datum(d.key)
          .attr("class", "legend-item")
          .attr("transform", `translate(${d.x}, ${d.y})`)
          .style("cursor", "pointer")
          .on("click", (e) => { e.stopPropagation(); toggleSelection(d.key); })
          .on("mouseover", () => { if(!activeSeries) updateVisuals(d.key, true); })
          .on("mouseout", () => { if(!activeSeries) updateVisuals(null); });

      gItem.append("rect")
          .attr("width", iconSize).attr("height", iconSize)
          .attr("y", -iconSize/2 - 2)
          .attr("rx", 2)
          .attr("fill", colorMap[d.key]);

      gItem.append("text")
          .attr("x", iconSize + 5)
          .attr("dy", "0.1em")
          .style("font-size", `${legendFontSize}px`)
          .style("font-weight", "bold")
          .style("fill", COLORS.textPrimary)
          .text(d.key);
  });


  // 4. CHART LAYOUT CALCULATION
  const chartTop = CHART_MARGIN.top + finalLegendHeight + 10; // 10px buffer
  const chartHeight = CHART_HEIGHT - chartTop - CHART_MARGIN.bottom;
  const chartWidth = availableWidth;

  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTop})`);

  // 5. STACK LOGIC (Standard)
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              let yCursor = gravityOffset;
              let myY0 = 0; let myY1 = 0;
              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) { myY0 = yCursor; myY1 = yCursor + val; }
                  yCursor += val + ribbonPadding;
              }
              return { x: step.label, y0: myY0, y1: myY1, val: step.values[key] };
          })
      };
  });

  // 6. SCALES
  const x = d3.scalePoint().domain(timeLabels).range([0, chartWidth]);
  const y = d3.scaleLinear().domain([0, maxStack]).range([0, chartHeight]); 
  const area = d3.area().x(d => x(d.x)).y0(d => y(d.y0)).y1(d => y(d.y1)).curve(d3.curveBumpX);

  // 7. DRAW CHART
  const verticalLine = g.append("line")
    .attr("y1", 0).attr("y2", chartHeight)
    .attr("stroke", COLORS.axisLine).attr("stroke-width", 1).attr("stroke-dasharray", "3 3")
    .style("opacity", 0).style("pointer-events", "none");

  const ribbonGroup = g.append("g");
  let activeSeries = null; 

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter().append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white").attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // Interaction
  function toggleSelection(key) { activeSeries = (activeSeries === key) ? null : key; updateVisuals(activeSeries); }
  function resetSelection() { activeSeries = null; updateVisuals(null); }
  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          ribbons.transition().duration(200).attr("fill", d => colorMap[d.key]).attr("fill-opacity", 0.9).attr("stroke", "white");
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);
          if (!isHover) { verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); }
      } else {
          ribbons.transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none");
          ribbons.filter(d => d.key === highlightKey).raise();
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", function() { return d3.select(this).datum() === highlightKey ? 1 : 0.3; });
      }
  }

  ribbons.on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
         .on("mouseover", (e, d) => { if(!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
         .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
         .on("mouseout", () => { if(!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

  // 8. SMART AXES (Dynamic Font Size)
  
  // Calculate max font size for X axis to fit labels without overlap
  const numTicks = timeLabels.length;
  const availableSpacePerTick = chartWidth / numTicks;
  
  // Estima larghezza media: 6px per carattere a size 10 (approx)
  // Formula: FontSize = AvailableWidth / (NumChars * 0.6)
  const maxLabelLength = d3.max(timeLabels, d => d.split("-")[0].length); // "2015" = 4 chars
  
  let axisFontSize = BASE_FONT;
  // Reduce font if space is tight
  if (availableSpacePerTick < (maxLabelLength * BASE_FONT * 0.7)) {
      axisFontSize = Math.max(6, Math.floor(availableSpacePerTick / (maxLabelLength * 0.7)));
  }

  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("x", d => x(d))
      .attr("y", chartHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`) // Dynamic Size
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP
  function updateTooltip(event, key) {
      if (!key) return;
      const mouseX = d3.pointer(event, g.node())[0];
      const step = x.step();
      let index = Math.round(mouseX / step);
      index = Math.max(0, Math.min(index, x.domain().length - 1));
      const hoveredLabel = x.domain()[index];
      const xPos = x(hoveredLabel);
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index];

      verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);
      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      tooltipText.text(`${hoveredLabel}: ${valText}`);
      
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
  }

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${BASE_FONT}px`).style("font-weight", "bold").style("fill", "#333");
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Font Size Config
  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // 1. DATA PREP
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
     svg.append("text")
      .text("No Data")
      .attr("x", CHART_WIDTH/2)
      .attr("y", CHART_HEIGHT/2)
      .style("text-anchor", "middle")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary);
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = categoricalColors[i % categoricalColors.length];
  });

  // 2. SVG SETUP
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  // Background click to reset selection
  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  // 3. LEGEND (FORCED 2 ROWS LAYOUT)
  const legendGroup = svg.append('g').attr('class', 'legend-group');
  
  const iconSize = 10;
  const itemGap = 15; // Spazio orizzontale
  const rowGap = FONT_SIZE + 5; // Spazio verticale
  const legendTopPadding = 5;

  // Distribuzione: 3 item nella prima riga, 2 nella seconda
  const row1Items = topTargets.slice(0, 3);
  const row2Items = topTargets.slice(3, 5);
  
  // Funzione helper per disegnare una riga centrata
  function drawLegendRow(items, rowIndex) {
      // 1. Calcola larghezza totale della riga
      let totalWidth = 0;
      const widths = items.map(key => {
          // Misura temporanea
          const txt = svg.append("text").style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").text(key);
          const w = txt.node().getBBox().width + iconSize + 5;
          txt.remove();
          return w;
      });
      totalWidth = widths.reduce((a, b) => a + b, 0) + (items.length - 1) * itemGap;

      // 2. Calcola punto di partenza X per centrare
      const availableWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
      let startX = CHART_MARGIN.left + (availableWidth - totalWidth) / 2;
      const y = CHART_MARGIN.top + legendTopPadding + (rowIndex * rowGap);

      // 3. Disegna
      let currentX = startX;
      items.forEach((key, i) => {
          const gItem = legendGroup.append("g")
              .datum(key)
              .attr("class", "legend-item")
              .attr("transform", `translate(${currentX}, ${y})`)
              .style("cursor", "pointer")
              .on("click", (e) => { e.stopPropagation(); toggleSelection(key); })
              .on("mouseover", () => { if(!activeSeries) updateVisuals(key, true); })
              .on("mouseout", () => { if(!activeSeries) updateVisuals(null); });

          gItem.append("rect")
              .attr("width", iconSize).attr("height", iconSize)
              .attr("y", -iconSize/2 - 1)
              .attr("rx", 2)
              .attr("fill", colorMap[key]);

          gItem.append("text")
              .attr("x", iconSize + 5)
              .attr("dy", "0.2em")
              .style("font-size", `${FONT_SIZE}px`)
              .style("font-weight", "bold")
              .style("fill", COLORS.textPrimary)
              .text(key);

          currentX += widths[i] + itemGap;
      });
  }

  drawLegendRow(row1Items, 0);
  drawLegendRow(row2Items, 1);

  // Calcola altezza occupata dalla legenda per spostare il grafico
  const legendHeight = (2 * rowGap) + 10;

  // 4. CHART DIMENSIONS
  const chartTop = CHART_MARGIN.top + legendHeight;
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - chartTop - CHART_MARGIN.bottom;

  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTop})`);

  // 5. STACK LOGIC
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0; let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 6. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, innerWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, innerHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 7. DRAW CHART ELEMENTS

  // Vertical Axis Line
  const verticalLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", COLORS.axisLine)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Ribbons
  const ribbonGroup = g.append("g");
  let activeSeries = null; 

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // --- INTERACTION ---

  function toggleSelection(key) {
      activeSeries = (activeSeries === key) ? null : key;
      updateVisuals(activeSeries);
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          // Reset
          ribbons.transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white");
          
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);
          
          if (!isHover) {
            verticalLine.style("opacity", 0);
            tooltipGroup.style("display", "none");
          }
      } else {
          // Dim Others
          ribbons.transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none");
          
          ribbons.filter(d => d.key === highlightKey).raise();

          legendGroup.selectAll('.legend-item')
             .transition().duration(200)
             .style("opacity", function() {
                 return d3.select(this).datum() === highlightKey ? 1 : 0.3;
             });
      }
  }

  // Events
  ribbons
    .on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
    .on("mouseover", (e, d) => { if(!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
    .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
    .on("mouseout", () => { if(!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

  // 8. AXES
  
  // Calculate dynamic font size for axis to avoid overlap
  const numTicks = timeLabels.length;
  const availableSpacePerTick = innerWidth / numTicks;
  // Estimate: 4 chars "2015" * font_size * 0.6 width factor
  let axisFontSize = FONT_SIZE;
  if (availableSpacePerTick < (4 * FONT_SIZE * 0.7)) {
      axisFontSize = Math.max(6, Math.floor(availableSpacePerTick / 2.8));
  }

  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("x", d => x(d))
      .attr("y", innerHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`)
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP
  function updateTooltip(event, key) {
      if (!key) return;
      
      // Calculate mouse position relative to Chart Group 'g'
      const mouseX = d3.pointer(event, g.node())[0];
      
      // ScalePoint logic to find nearest index
      const step = x.step();
      let index = Math.round(mouseX / step);
      
      // Clamp index
      const domain = x.domain();
      index = Math.max(0, Math.min(index, domain.length - 1));
      
      const hoveredLabel = domain[index];
      const xPos = x(hoveredLabel);
      
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index]; // Value at this time index

      verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      const tooltipContent = `${hoveredLabel}: ${valText}`;
      
      tooltipGroup.style("display", null);
      tooltipText.text(tooltipContent);
      
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
  }

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").style("fill", "#333");
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Font Config
  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // 1. DATA PREP
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
     svg.append("text")
      .text("No Data")
      .attr("x", CHART_WIDTH/2)
      .attr("y", CHART_HEIGHT/2)
      .style("text-anchor", "middle")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary);
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = categoricalColors[i % categoricalColors.length];
  });

  // 2. SVG SETUP
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  // Background click to reset selection
  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  // 3. DYNAMIC WRAPPING LEGEND
  const legendGroup = svg.append('g').attr('class', 'legend-group');
  
  const iconSize = 10;
  const itemGap = 12; // Spazio orizzontale tra item
  const rowGap = FONT_SIZE + 6; // Altezza riga
  const availableWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  
  let rows = [];
  let currentRow = { width: 0, items: [] };

  // A. Creazione temporanea per misurare larghezze
  topTargets.forEach(key => {
      // Gruppo temporaneo per misurare
      const tempG = legendGroup.append("g").attr("class", "temp-measure").style("opacity", 0);
      
      tempG.append("rect").attr("width", iconSize).attr("height", iconSize);
      const textNode = tempG.append("text")
          .attr("x", iconSize + 4)
          .style("font-size", `${FONT_SIZE}px`)
          .style("font-weight", "bold")
          .text(key);
      
      // Larghezza effettiva dell'elemento
      const itemWidth = textNode.node().getComputedTextLength() + iconSize + 4;
      tempG.remove(); // Pulizia

      // B. Logica di Wrapping
      // Se l'elemento non ci sta nella riga attuale, vai a capo
      if (currentRow.width + itemWidth > availableWidth && currentRow.items.length > 0) {
          rows.push(currentRow);
          currentRow = { width: 0, items: [] };
      }

      currentRow.items.push({ key: key, width: itemWidth });
      currentRow.width += itemWidth + itemGap;
  });
  // Aggiungi l'ultima riga
  if (currentRow.items.length > 0) rows.push(currentRow);

  // C. Rendering Definitivo Legenda (Centrata)
  let legendY = CHART_MARGIN.top; // Inizio rendering verticale

  rows.forEach(row => {
      // Larghezza reale della riga (senza l'ultimo gap inutile)
      const actualRowWidth = row.width - itemGap;
      // Calcola X per centrare la riga
      let currentX = CHART_MARGIN.left + (availableWidth - actualRowWidth) / 2;

      row.items.forEach(item => {
          const gItem = legendGroup.append("g")
              .datum(item.key)
              .attr("class", "legend-item")
              .attr("transform", `translate(${currentX}, ${legendY})`)
              .style("cursor", "pointer")
              .on("click", (e) => { e.stopPropagation(); toggleSelection(item.key); })
              .on("mouseover", () => { if(!activeSeries) updateVisuals(item.key, true); })
              .on("mouseout", () => { if(!activeSeries) updateVisuals(null); });

          gItem.append("rect")
              .attr("width", iconSize).attr("height", iconSize)
              .attr("y", -iconSize/2 - 1)
              .attr("rx", 2)
              .attr("fill", colorMap[item.key]);

          gItem.append("text")
              .attr("x", iconSize + 4)
              .attr("dy", "0.2em")
              .style("font-size", `${FONT_SIZE}px`)
              .style("font-weight", "bold")
              .style("fill", COLORS.textPrimary)
              .text(item.key);

          currentX += item.width + itemGap;
      });
      
      legendY += rowGap; // Scendi alla prossima riga
  });

  // Calcola altezza totale occupata dalla legenda per spostare il grafico
  const totalLegendHeight = (rows.length * rowGap) + 5;

  // 4. CHART DIMENSIONS
  const chartTop = CHART_MARGIN.top + totalLegendHeight;
  const chartHeight = CHART_HEIGHT - chartTop - CHART_MARGIN.bottom;
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTop})`);

  // 5. STACK LOGIC
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0; let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 6. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, innerWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, chartHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 7. DRAW CHART ELEMENTS

  // Vertical Axis Line
  const verticalLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", COLORS.axisLine)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Ribbons
  const ribbonGroup = g.append("g");
  let activeSeries = null; 

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // --- INTERACTION ---

  function toggleSelection(key) {
      activeSeries = (activeSeries === key) ? null : key;
      updateVisuals(activeSeries);
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          // Reset
          ribbons.transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white");
          
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);
          
          if (!isHover) {
            verticalLine.style("opacity", 0);
            tooltipGroup.style("display", "none");
          }
      } else {
          // Dim Others
          ribbons.transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none");
          
          ribbons.filter(d => d.key === highlightKey).raise();

          legendGroup.selectAll('.legend-item')
             .transition().duration(200)
             .style("opacity", function() {
                 return d3.select(this).datum() === highlightKey ? 1 : 0.3;
             });
      }
  }

  // Events
  ribbons
    .on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
    .on("mouseover", (e, d) => { if(!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
    .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
    .on("mouseout", () => { if(!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

  // 8. AXES
  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("x", d => x(d))
      .attr("y", chartHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP FIXED
  function updateTooltip(event, key) {
      if (!key) return;
      
      const mouseX = d3.pointer(event, g.node())[0];
      
      // Manual "invert" for scalePoint
      const domain = x.domain();
      const range = x.range();
      const step = x.step();
      
      // Calculate closest index
      let index = Math.round(mouseX / step);
      // Clamp to valid bounds
      index = Math.max(0, Math.min(index, domain.length - 1));
      
      const hoveredLabel = domain[index];
      const xPos = x(hoveredLabel);
      
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index];

      verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      tooltipText.text(`${hoveredLabel}: ${valText}`);
      
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
      tooltipGroup.style("display", null);
  }

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").style("fill", "#333");
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Configurazione Font
  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // 1. DATA PREP
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
     svg.append("text")
      .text("No Data")
      .attr("x", CHART_WIDTH/2)
      .attr("y", CHART_HEIGHT/2)
      .style("text-anchor", "middle")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary);
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = categoricalColors[i % categoricalColors.length];
  });

  // 2. SVG SETUP
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  // Sfondo trasparente per il reset della selezione
  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  // 3. LEGENDA "FLOW LAYOUT" (Anti-Sovrapposizione)
  const legendGroup = svg.append('g').attr('class', 'legend-group');
  
  const iconSize = 10;
  const itemGap = 10; // Spazio orizzontale tra item
  const rowGap = 5;   // Spazio verticale tra righe
  const textPadding = 4; // Spazio tra icona e testo
  
  // Larghezza disponibile per la legenda (tutta la larghezza meno i margini laterali)
  const availableLegendWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  let currentX = 0;
  let currentY = 0;
  let lineHeight = 0;

  // Array per memorizzare le posizioni calcolate
  const legendItemsPositions = [];

  // A. Calcolo delle posizioni (Misurazione preventiva)
  // Creiamo un testo invisibile per misurare la larghezza reale delle stringhe
  const measureText = svg.append("text")
      .style("font-size", `${FONT_SIZE}px`)
      .style("font-weight", "bold")
      .style("visibility", "hidden");

  topTargets.forEach(key => {
      measureText.text(key);
      const textWidth = measureText.node().getComputedTextLength();
      const itemWidth = iconSize + textPadding + textWidth;
      const itemHeight = Math.max(iconSize, FONT_SIZE); // Altezza riga basata sul font

      // Se l'elemento supera la larghezza disponibile, vai a capo (reset X, incrementa Y)
      if (currentX + itemWidth > availableLegendWidth && currentX > 0) {
          currentX = 0;
          currentY += itemHeight + rowGap;
      }

      legendItemsPositions.push({
          key: key,
          x: currentX,
          y: currentY,
          width: itemWidth,
          height: itemHeight
      });

      // Aggiorna altezza riga corrente e posizione X per il prossimo elemento
      lineHeight = Math.max(lineHeight, itemHeight);
      currentX += itemWidth + itemGap;
  });
  
  measureText.remove(); // Pulizia
  
  // Altezza totale finale della legenda
  const totalLegendHeight = currentY + lineHeight + 10; // +10 buffer

  // B. Disegno della legenda
  // Spostiamo il gruppo legenda nel margine superiore + chart margin left
  legendGroup.attr("transform", `translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`);

  legendItemsPositions.forEach(pos => {
      const gItem = legendGroup.append("g")
          .datum(pos.key)
          .attr("class", "legend-item")
          .attr("transform", `translate(${pos.x}, ${pos.y})`)
          .style("cursor", "pointer")
          .on("click", (e) => { e.stopPropagation(); toggleSelection(pos.key); })
          .on("mouseover", () => { if(!activeSeries) updateVisuals(pos.key, true); })
          .on("mouseout", () => { if(!activeSeries) updateVisuals(null); });

      // Icona colore
      gItem.append("rect")
          .attr("width", iconSize).attr("height", iconSize)
          .attr("y", 0) 
          .attr("rx", 2)
          .attr("fill", colorMap[pos.key]);

      // Testo
      gItem.append("text")
          .attr("x", iconSize + textPadding)
          .attr("y", iconSize / 2) // Centro verticale rispetto all'icona
          .attr("dy", "0.35em")
          .style("font-size", `${FONT_SIZE}px`)
          .style("font-weight", "bold")
          .style("fill", COLORS.textPrimary)
          .text(pos.key);
  });

  // 4. CHART DIMENSIONS (Adattive)
  // Il grafico inizia DOPO la legenda
  const chartTopY = CHART_MARGIN.top + totalLegendHeight;
  const chartHeight = CHART_HEIGHT - chartTopY - CHART_MARGIN.bottom;
  const chartWidth = availableLegendWidth; // Usa la stessa larghezza calcolata

  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTopY})`);

  // 5. STACK LOGIC
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0; let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 6. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, chartWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, chartHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 7. DRAW CHART ELEMENTS

  // Vertical Axis Line
  const verticalLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", COLORS.axisLine)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Ribbons
  const ribbonGroup = g.append("g");
  let activeSeries = null; 

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // --- INTERACTION ---

  function toggleSelection(key) {
      activeSeries = (activeSeries === key) ? null : key;
      updateVisuals(activeSeries);
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          // Reset
          ribbons.transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white");
          
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);
          
          if (!isHover) {
            verticalLine.style("opacity", 0);
            tooltipGroup.style("display", "none");
          }
      } else {
          // Dim Others
          ribbons.transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none");
          
          ribbons.filter(d => d.key === highlightKey).raise();

          legendGroup.selectAll('.legend-item')
             .transition().duration(200)
             .style("opacity", function() {
                 return d3.select(this).datum() === highlightKey ? 1 : 0.3;
             });
      }
  }

  // Events
  ribbons
    .on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
    .on("mouseover", (e, d) => { if(!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
    .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
    .on("mouseout", () => { if(!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

  // 8. AXES
  
  // Calculate dynamic font size for axis to avoid overlap
  const numTicks = timeLabels.length;
  const availableSpacePerTick = chartWidth / numTicks;
  
  let axisFontSize = FONT_SIZE;
  // Se lo spazio è poco (es. < 30px per tick), riduci il font
  if (availableSpacePerTick < 30) {
      axisFontSize = Math.max(8, FONT_SIZE - 2);
  }

  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("x", d => x(d))
      .attr("y", chartHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`)
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP FIXED
  function updateTooltip(event, key) {
      if (!key) return;
      
      const mouseX = d3.pointer(event, g.node())[0];
      
      // FIX: scalePoint invert logic
      const domain = x.domain();
      const step = x.step();
      
      // Calculate closest index based on mouse X relative to step size
      // Math.round(mouseX / step) works if range starts at 0
      let index = Math.round(mouseX / step);
      
      // Clamp index within valid bounds
      index = Math.max(0, Math.min(index, domain.length - 1));
      
      const hoveredLabel = domain[index];
      const xPos = x(hoveredLabel);
      
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index];

      verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      tooltipText.text(`${hoveredLabel}: ${valText}`);
      
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
      tooltipGroup.style("display", null);
  }

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").style("fill", "#333");
}window.addEventListener('resize', () => { if (window._draw_group_4_lastCall) draw_group_4(...window._draw_group_4_lastCall); });

function draw_group_4(data, choice, containerId) {
  window._draw_group_4_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // Configurazione Font
  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // 1. DATA PREP
  const inputJSON = data[choice];
  
  if (!inputJSON || !inputJSON.timeline || inputJSON.timeline.length === 0) {
     svg.attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
     svg.append("text")
      .text("No Data")
      .attr("x", CHART_WIDTH/2)
      .attr("y", CHART_HEIGHT/2)
      .style("text-anchor", "middle")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary);
     return;
  }

  const timeline = inputJSON.timeline;
  const ribbonPadding = inputJSON.config.ribbonPadding;
  const topTargets = inputJSON.top_targets; 
  const timeLabels = timeline.map(d => d.label);

  const categoricalColors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];
  const colorMap = {};
  topTargets.forEach((target, i) => {
      colorMap[target] = categoricalColors[i % categoricalColors.length];
  });

  // 2. SVG SETUP
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  // 3. SAFE LEGEND CALCULATION (Fix Sovrapposizione)
  const legendGroup = svg.append('g').attr('class', 'legend-group');
  
  const iconSize = 10;
  const itemGap = 25; // Aumentato lo spazio tra gli elementi
  const rowGap = 5;
  const textPadding = 6;
  
  // Larghezza disponibile
  const availableLegendWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  let currentX = 0;
  let currentY = 0;
  let lineHeight = Math.max(iconSize, FONT_SIZE) + rowGap;

  // Elemento invisibile per misurare
  const measureText = svg.append("text")
      .style("font-size", `${FONT_SIZE}px`)
      .style("font-weight", "bold")
      .style("visibility", "hidden");

  const legendItemsPositions = [];

  topTargets.forEach(key => {
      measureText.text(key);
      
      // FIX CRITICO: Fallback se la misurazione fallisce (ritorna 0 in modali nascosti)
      let textWidth = measureText.node().getComputedTextLength();
      if (textWidth <= 1) {
          // Stima: circa 60% della dimensione del font per ogni carattere
          textWidth = key.length * (FONT_SIZE * 0.65);
      }

      // Larghezza totale dell'item: Icona + Padding + Testo
      const itemWidth = iconSize + textPadding + textWidth;

      // Wrapping: Se supera la larghezza, vai a capo
      if (currentX + itemWidth > availableLegendWidth && currentX > 0) {
          currentX = 0;
          currentY += lineHeight;
      }

      legendItemsPositions.push({
          key: key,
          x: currentX,
          y: currentY,
          width: itemWidth
      });

      // Avanza X
      currentX += itemWidth + itemGap;
  });
  
  measureText.remove(); 
  
  // Altezza totale finale
  const totalLegendHeight = currentY + lineHeight + 5; 

  // B. Rendering Legenda
  // Spostiamo la legenda nel margine superiore, centrando le righe se necessario
  // Qui usiamo un allineamento a sinistra standard per robustezza
  legendGroup.attr("transform", `translate(${CHART_MARGIN.left}, ${CHART_MARGIN.top})`);

  legendItemsPositions.forEach(pos => {
      const gItem = legendGroup.append("g")
          .datum(pos.key)
          .attr("class", "legend-item")
          .attr("transform", `translate(${pos.x}, ${pos.y})`)
          .style("cursor", "pointer")
          .on("click", (e) => { e.stopPropagation(); toggleSelection(pos.key); })
          .on("mouseover", () => { if(!activeSeries) updateVisuals(pos.key, true); })
          .on("mouseout", () => { if(!activeSeries) updateVisuals(null); });

      gItem.append("rect")
          .attr("width", iconSize).attr("height", iconSize)
          .attr("y", -1) 
          .attr("rx", 2)
          .attr("fill", colorMap[pos.key]);

      gItem.append("text")
          .attr("x", iconSize + textPadding)
          .attr("y", iconSize / 2)
          .attr("dy", "0.35em")
          .style("font-size", `${FONT_SIZE}px`)
          .style("font-weight", "bold")
          .style("fill", COLORS.textPrimary)
          .text(pos.key);
  });

  // 4. CHART DIMENSIONS (Adattive)
  const chartTopY = CHART_MARGIN.top + totalLegendHeight;
  const chartHeight = CHART_HEIGHT - chartTopY - CHART_MARGIN.bottom;
  // Usiamo la larghezza piena disponibile
  const chartWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;

  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${chartTopY})`);

  // 5. STACK LOGIC
  const maxStack = d3.max(timeline, d => {
      const totalVal = Object.values(d.values).reduce((a, b) => a + b, 0);
      const totalPad = (d.order.length - 1) * ribbonPadding;
      return totalVal + totalPad;
  });

  const seriesData = topTargets.map(key => {
      return {
          key: key,
          values: timeline.map((step, i) => {
              const currentStepValueSum = Object.values(step.values).reduce((a,b) => a+b, 0);
              const currentStepPaddingSum = (step.order.length - 1) * ribbonPadding;
              const currentStackHeight = currentStepValueSum + currentStepPaddingSum;
              const gravityOffset = maxStack - currentStackHeight;
              
              let yCursor = gravityOffset;
              let myY0 = 0; let myY1 = 0;

              for (let k of step.order) {
                  const val = step.values[k];
                  if (k === key) {
                      myY0 = yCursor;
                      myY1 = yCursor + val;
                  }
                  yCursor += val + ribbonPadding;
              }

              return {
                  x: step.label,
                  y0: myY0, 
                  y1: myY1,
                  val: step.values[key]
              };
          })
      };
  });

  // 6. SCALES
  const x = d3.scalePoint()
      .domain(timeLabels)
      .range([0, chartWidth]);

  const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([0, chartHeight]); 

  const area = d3.area()
      .x(d => x(d.x))
      .y0(d => y(d.y0))
      .y1(d => y(d.y1))
      .curve(d3.curveBumpX);

  // 7. DRAW CHART ELEMENTS

  // Vertical Axis Line
  const verticalLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", COLORS.axisLine)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3 3")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Ribbons
  const ribbonGroup = g.append("g");
  let activeSeries = null; 

  const ribbons = ribbonGroup.selectAll(".ribbon")
      .data(seriesData)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", d => area(d.values))
      .attr("fill", d => colorMap[d.key])
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

  // --- INTERACTION ---

  function toggleSelection(key) {
      activeSeries = (activeSeries === key) ? null : key;
      updateVisuals(activeSeries);
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  function updateVisuals(highlightKey, isHover = false) {
      if (!highlightKey) {
          // Reset
          ribbons.transition().duration(200)
            .attr("fill", d => colorMap[d.key])
            .attr("fill-opacity", 0.9)
            .attr("stroke", "white");
          
          legendGroup.selectAll('.legend-item').transition().duration(200).style("opacity", 1);
          
          if (!isHover) {
            verticalLine.style("opacity", 0);
            tooltipGroup.style("display", "none");
          }
      } else {
          // Dim Others
          ribbons.transition().duration(200)
            .attr("fill", d => d.key === highlightKey ? colorMap[d.key] : "#e0e0e0")
            .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.3)
            .attr("stroke", d => d.key === highlightKey ? "#333" : "none");
          
          ribbons.filter(d => d.key === highlightKey).raise();

          legendGroup.selectAll('.legend-item')
             .transition().duration(200)
             .style("opacity", function() {
                 return d3.select(this).datum() === highlightKey ? 1 : 0.3;
             });
      }
  }

  // Events
  ribbons
    .on("click", (e, d) => { e.stopPropagation(); toggleSelection(d.key); updateTooltip(e, d.key); })
    .on("mouseover", (e, d) => { if(!activeSeries) { updateVisuals(d.key, true); verticalLine.style("opacity", 1); updateTooltip(e, d.key); } })
    .on("mousemove", (e, d) => { updateTooltip(e, activeSeries || d.key); })
    .on("mouseout", () => { if(!activeSeries) { updateVisuals(null); verticalLine.style("opacity", 0); tooltipGroup.style("display", "none"); } });

  // 8. AXES
  
  // Smart Axis Font Size
  const numTicks = timeLabels.length;
  const availableSpacePerTick = chartWidth / numTicks;
  let axisFontSize = FONT_SIZE;
  if (availableSpacePerTick < 25) axisFontSize = Math.max(8, FONT_SIZE - 2);

  g.selectAll(".axis-label")
      .data(timeLabels)
      .enter()
      .append("text")
      .attr("x", d => x(d))
      .attr("y", chartHeight + 15)
      .style("text-anchor", "middle")
      .style("font-size", `${axisFontSize}px`)
      .style("fill", COLORS.textPrimary)
      .text(d => d.split("-")[0]); 

  // 9. TOOLTIP
  function updateTooltip(event, key) {
      if (!key) return;
      
      const mouseX = d3.pointer(event, g.node())[0];
      const step = x.step();
      let index = Math.round(mouseX / step);
      const domain = x.domain();
      index = Math.max(0, Math.min(index, domain.length - 1));
      
      const hoveredLabel = domain[index];
      const xPos = x(hoveredLabel);
      
      const series = seriesData.find(s => s.key === key);
      const dataPoint = series.values[index];

      verticalLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

      const valText = dataPoint ? `${dataPoint.val.toFixed(1)}%` : "0%";
      // Tooltip Text: "Label: Value"
      tooltipText.text(`${hoveredLabel}: ${valText}`);
      
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
      
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 10;
      if (tx + bbox.width > CHART_WIDTH) tx = mx - bbox.width - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${my - 20})`);
      tooltipGroup.style("display", null);
  }

  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("stroke-width", 0.5).attr("rx", 2);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE}px`).style("font-weight", "bold").style("fill", "#333");
}