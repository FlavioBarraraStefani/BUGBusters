window.addEventListener('resize', () => { if (window._draw_group_1_lastCall) draw_group_1(...window._draw_group_1_lastCall); });

function draw_group_1(data, choice, containerId) {
  // Save params for resize
  window._draw_group_1_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  // Clear existing content
  svg.selectAll('*').remove();
  
  // Use fixed dimensions from constants
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  //----------------------//
  // LOGIC IMPLEMENTATION //
  //----------------------//

  // 1. SELECT DATA BASED ON CHOICE
  // The Python script generates { "ISIL": [...], "taliban": [...] }
  // We extract the array matching the 'choice' string.
  const groupData = data[choice];

  if (!groupData || groupData.length === 0) {
    g.append("text").text("No data available").attr("y", innerHeight/2).attr("x", innerWidth/2);
    return;
  }

  // 2. DEFINE SCALES
  const xExtent = d3.extent(groupData, d => d.year);
  
  const xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupData, d => d.value)])
    .nice()
    .range([innerHeight, 0]);

  // 3. DEFINE COLOR
  // Map choice to an index in CATEGORIES to pick the right color from COLORS.groupColors
  // defined in main.js: group: ['ISIL', 'taliban', 'SL'] -> colors: ['red','green','blue']
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const lineColor = (groupIndex >= 0 && COLORS.groupColors[groupIndex]) 
                    ? COLORS.groupColors[groupIndex] 
                    : COLORS.defaultComparison;

  // 4. DRAW GRIDLINES (Optional, helps readability)
  const yAxisGrid = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat('').ticks(5);
  g.append('g')
    .attr('class', 'y axis-grid')
    .attr('color', 'rgba(0,0,0,0.05)') // Very light grid
    .call(yAxisGrid);

  // 5. DRAW LINE
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX); // Smooth curve

  g.append("path")
    .datum(groupData)
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // 6. DRAW AREA (Optional: Adds visual weight to "cumulative" growth)
  const area = d3.area()
    .x(d => xScale(d.year))
    .y0(innerHeight)
    .y1(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(groupData)
    .attr("fill", lineColor)
    .attr("fill-opacity", 0.1) // Light fill under the line
    .attr("d", area);

  // 7. AXES
  // X Axis (Format years to remove comma, e.g. "2015" not "2,015")
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(5))
    .attr('color', COLORS.axisLine || '#ccc');

  // Y Axis
  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5))
    .attr('color', COLORS.axisLine || '#ccc');
    
  // 8. AXIS LABELS
  g.append("text")
    .attr("x", innerWidth)
    .attr("y", innerHeight - 5)
    .attr("fill", COLORS.textPrimary)
    .attr("text-anchor", "end")
    .style("font-size", "10px")
    .text("Year");
}