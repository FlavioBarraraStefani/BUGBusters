window.addEventListener('resize', () => { if (window._draw_target_1_lastCall) draw_target_1(...window._draw_target_1_lastCall); });

function draw_target_1(data, choice, containerId) {
  window._draw_target_1_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  svg.selectAll('*').remove();
  
  // 1. SETUP DIMENSIONS & MARGINS
  const localMargin = { ...CHART_MARGIN, left: 120, right: 20 }; 
  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    
  // Background rect for click reset
  svg.append("rect")
     .attr("width", CHART_WIDTH)
     .attr("height", CHART_HEIGHT)
     .attr("fill", "transparent")
     .on("click", () => resetSelection());

  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // Font Size Config (Global or default)
  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;

  // Region Abbreviations
  const regionAbbreviations = {
      "Middle East & North Africa":   "MENA",
      "Central America & Caribbean":  "Cent. Am. & Carib",
      "South America":                "South America",
      "North America":                "North America",
      "Sub-Saharan Africa":           "Sub-Saharan Africa",
      "Australasia & Oceania":        "Oceania",
      "Southeast Asia":               "Southeast Asia",
      "East Asia":                    "East Asia",
      "South Asia":                   "South Asia",
      "Central Asia":                 "Central Asia",
      "Western Europe":               "Western Europe",
      "Eastern Europe":               "Eastern Europe"
  };
  const getShortName = (name) => regionAbbreviations[name] || name;

  // 2. DATA PROCESSING
  const allCategories = Array.from(new Set(data.map(d => d.category)));
  const regionsMap = d3.group(data, d => d.region_txt);
  
  let processedData = [];
  let globalChoiceTotal = 0;
  let globalTotal = 0;

  regionsMap.forEach((items, region) => {
      const continent = items[0].continent;
      const row = { region: region, continent: continent };
      let regionTotal = 0;

      allCategories.forEach(cat => row[cat] = 0);

      items.forEach(d => {
          row[d.category] = d.count;
          regionTotal += d.count;
          globalTotal += d.count;
          if (d.category === choice) globalChoiceTotal += d.count;
      });

      if (regionTotal > 0) {
          allCategories.forEach(cat => {
              row[cat] = row[cat] / regionTotal;
          });
      }
      processedData.push(row);
  });

  processedData.sort((a, b) => {
      return d3.ascending(a.continent, b.continent) || d3.ascending(a.region, b.region);
  });

  const globalAvg = globalTotal > 0 ? (globalChoiceTotal / globalTotal) : 0;

  // 3. LAYOUT CALCULATION
  const continentsGroups = d3.group(processedData, d => d.continent);
  const numberOfContinents = continentsGroups.size;
  const totalRegions = processedData.length;
  
  const GAP_SIZE = 10; 
  const barPadding = 2; 
  const totalGapSpace = (numberOfContinents - 1) * GAP_SIZE;
  const availableSpace = innerHeight - totalGapSpace;
  const barStep = availableSpace / totalRegions; 
  const barHeight = Math.max(1, barStep - barPadding);

  const yPosMap = new Map();
  let currentY = 0;
  let currentContinent = null;

  processedData.forEach((d, i) => {
      if (d.continent !== currentContinent) {
          if (currentContinent !== null) {
              currentY += GAP_SIZE;
          }
          currentContinent = d.continent;
      }
      yPosMap.set(d.region, currentY);
      currentY += barStep;
  });
  
  // 4. SCALES & COLOR
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);

  // Color mapping: map CATEGORIES.target pairs to COLORS.targetColors; other categories use COLORS.defaultComparison
  const color = (() => {
      const map = new Map();
      const tableau = d3.schemeTableau10;

        CATEGORIES.target.forEach((k, i) => {
              map.set(k, COLORS.targetColors[i] || tableau[i % tableau.length]);
          });

      const defaultOther =  COLORS.defaultComparison

      allCategories.forEach(k => {
          if (!map.has(k)) map.set(k, defaultOther);
      });

      // Explicit fallback for a generic 'others' key
      if (!map.has('others')) map.set('others', defaultOther);

      return d3.scaleOrdinal()
          .domain(allCategories)
          .range(allCategories.map(k => map.get(k)));
  })();

  const otherCategories = allCategories.filter(c => c !== choice);
  const stackKeys = [choice, ...otherCategories];
  const stackedData = d3.stack().keys(stackKeys)(processedData);

  // 5. DRAW BARS & INTERACTION
  const seriesGroups = g.selectAll("g.series")
      .data(stackedData)
      .enter().append("g")
      .attr("class", "series")
      .attr("fill", d => color(d.key))
      .attr("fill-opacity", d => d.key === choice ? 1 : 0.25);

  let activeSeries = null; 

  function updateVisuals(highlightKey) {
      if (!highlightKey) {
          seriesGroups.transition().duration(200).attr("fill-opacity", d => d.key === choice ? 1 : 0.25);
      } else {
          seriesGroups.transition().duration(200)
              .attr("fill-opacity", d => d.key === highlightKey ? 1 : 0.15);
      }
  }

  function resetSelection() {
      activeSeries = null;
      updateVisuals(null);
  }

  seriesGroups.each(function(seriesD) {
      const seriesKey = seriesD.key;

      d3.select(this).selectAll("rect")
          .data(seriesD)
          .enter().append("rect")
          .attr("y", d => yPosMap.get(d.data.region))
          .attr("x", d => x(d[0]))
          .attr("width", d => x(d[1]) - x(d[0]))
          .attr("height", barHeight)
          .style("cursor", "pointer")
          // EVENTS
          .on("mouseover", function(event, d) {
              if (!activeSeries) updateVisuals(seriesKey);
              tooltipGroup.style("display", null);
          })
          .on("mousemove", function(event, d) {
              const val = (d.data[seriesKey] * 100).toFixed(1);
              
              // Text Content
              tooltipText.text("");
              tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").style("font-weight", "bold").text(`Target: ${seriesKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
              tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").text(`Continent: ${d.data.continent}`);
              tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").text(`Region: ${d.data.region}`);
              tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").text("Percentage: ");
              tooltipText.append("tspan").attr("font-weight", "bold").text(`${val}%`);

              // Resize Rect
              const bbox = tooltipText.node().getBBox();
              const bgWidth = bbox.width + 16;
              const bgHeight = bbox.height + 10;

              tooltipRect
                  .attr("width", bgWidth)
                  .attr("height", bgHeight);

              // --- DYNAMIC POSITIONING (Boundary Detection) ---
              const [mx, my] = d3.pointer(event, svg.node());
              const offset = 5;
              
              let tx = mx + offset;
              let ty = my + offset;

              // Check Right Edge: If tooltip goes past width, flip to left
              if (tx + bgWidth > CHART_WIDTH) {
                  tx = mx - bgWidth - offset;
              }

              // Check Bottom Edge: If tooltip goes past height, flip up
              if (ty + bgHeight > CHART_HEIGHT) {
                  ty = my - bgHeight - offset;
              }
              
              // Safety check for top/left
              if (tx < 0) tx = offset;
              if (ty < 0) ty = offset;

              tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
          })
          .on("mouseout", function() {
              if (!activeSeries) updateVisuals(null);
              tooltipGroup.style("display", "none");
          });
  });

  // 6. AXES
  g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5, "%"))
      .selectAll("text")
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary);

  // Region Labels
  const yAxisGroup = g.append("g").attr("class", "y-axis-regions");
  yAxisGroup.selectAll("text")
      .data(processedData)
      .enter().append("text")
      .attr("x", -10) 
      .attr("y", d => yPosMap.get(d.region) + barHeight / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end") 
      .style("font-size", `${FONT_SIZE}px`)
      .style("fill", COLORS.textPrimary)
      .text(d => getShortName(d.region));

  // 7. GLOBAL AVG LINE
  if (globalAvg > 0) {
      const avgX = x(globalAvg);
      
      g.append("line")
          .attr("x1", avgX).attr("x2", avgX)
          .attr("y1", 0).attr("y2", innerHeight)
          .attr("stroke", 'black')
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "1,1")
          .style("pointer-events", "none");

      g.append("text")
          .attr("x", avgX + 5)
          .attr("y", -10)
          .style("font-size", "10px")
          .style("fill", 'black')
          .style("text-anchor", "middle")
          .text(`Global Avg: ${(globalAvg * 100).toFixed(1)}%`);
  }

  // 8. TOOLTIP STRUCTURE (Last to be on top)
  const tooltipGroup = svg.append("g")
      .attr("class", "tooltip-container")
      .style("display", "none")
      .style("pointer-events", "none");

  const tooltipRect = tooltipGroup.append("rect")
      .attr("fill", "rgba(255, 255, 255, 0.95)")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("filter", "drop-shadow(2px 2px 3px rgba(0,0,0,0.2))");

  const tooltipText = tooltipGroup.append("text")
      .attr("x", 0)
      .attr("y", 0)
      // Diminuisco la size del tooltip rispetto al font principale del grafico
      .style("font-size", `${Math.max(8, FONT_SIZE - 2)}px`)
      .style("fill", "#333");
}