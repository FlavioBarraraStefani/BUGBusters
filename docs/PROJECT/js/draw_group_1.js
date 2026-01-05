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
  
  // 1. MARGINS
  const localMargin = { ...CHART_MARGIN, left: 45, bottom: 35 };
  
  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    
  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // 2. DATA CHECK
  const groupData = data[choice];

  if (!groupData || groupData.length === 0) {
    g.append("text")
     .attr("text-anchor", "middle")
     .attr("x", innerWidth/2)
     .attr("y", innerHeight/2)
     .style("font-size", "12px")
     .text("No Data Available");
    return;
  }

  // 3. SCALES
  const xScale = d3.scaleLinear()
    .domain(d3.extent(groupData, d => d.year))
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupData, d => +d.value)]) 
    .nice()
    .range([innerHeight, 0]);

  // 4. COLOR SELECTION
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const lineColor = (groupIndex >= 0 && COLORS.groupColors[groupIndex]) 
                    ? COLORS.groupColors[groupIndex] 
                    : COLORS.defaultComparison;

  // 5. DRAW CHART ELEMENTS
  // Area
  const area = d3.area()
    .x(d => xScale(d.year))
    .y0(innerHeight)
    .y1(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(groupData)
    .attr("fill", lineColor)
    .attr("fill-opacity", 0.1)
    .attr("d", area);

  // Line
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(groupData)
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(5))
    .attr('color', COLORS.axisLine || '#ccc');

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("~s")))
    .attr('color', COLORS.axisLine || '#ccc');
    
  // Labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + localMargin.bottom - 5)
    .style("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", COLORS.textPrimary)
    .text("Years");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -localMargin.left + 12)
    .attr("x", -innerHeight / 2)
    .style("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", COLORS.textPrimary)
    .text("Cumulative Attacks");

  //----------------------------------------//
  //        INTERACTION / TOOLTIP LOGIC     //
  //----------------------------------------//

  // A. Create the "Focus" Group (Hidden by default)
  const focus = g.append('g')
    .style('display', 'none');

  // A.1 Vertical Dotted Line
  focus.append('line')
    .attr('class', 'hover-line')
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .style('stroke', '#666')
    .style('stroke-width', '1px')
    .style('stroke-dasharray', '3 3');

  // A.2 Circle on the line
  focus.append('circle')
    .attr('r', 4)
    .style('fill', 'white')
    .style('stroke', lineColor)
    .style('stroke-width', '2px');

  // A.3 Tooltip Container (Rect + Text)
  const tooltipGroup = focus.append('g').attr('class', 'tooltip-container');
  
  // Background rectangle for text (so it's readable over grid lines)
  const tooltipRect = tooltipGroup.append('rect')
    .attr('fill', 'rgba(255, 255, 255, 0.9)')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 0.5)
    .attr('rx', 4) // Rounded corners
    .attr('ry', 4);

  const tooltipText = tooltipGroup.append('text')
    .attr('x', 9)
    .attr('dy', '.35em')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('fill', '#333');

  // B. Transparent Overlay to capture mouse events
  g.append('rect')
    .attr('class', 'overlay')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .style('opacity', 0) // Invisible
    .style('cursor', 'crosshair')
    .on('mouseover', () => focus.style('display', null))
    .on('mouseout', () => focus.style('display', 'none'))
    .on('mousemove', mousemove);

  // C. The Bisector function (Finds index in sorted array)
  const bisectDate = d3.bisector(d => d.year).left;

  function mousemove(event) {
    // 1. Get X coordinate of mouse relative to 'g'
    const x0 = xScale.invert(d3.pointer(event)[0]);
    
    // 2. Find closest data point
    const i = bisectDate(groupData, x0, 1);
    const d0 = groupData[i - 1];
    const d1 = groupData[i];
    
    // Check if we are at the boundaries
    let d;
    if (!d0) d = d1;
    else if (!d1) d = d0;
    else d = x0 - d0.year > d1.year - x0 ? d1 : d0;

    if (!d) return;

    // 3. Move Focus elements
    const xPos = xScale(d.year);
    const yPos = yScale(d.value);

    // Move line
    focus.select('.hover-line')
      .attr('transform', `translate(${xPos},0)`);

    // Move circle
    focus.select('circle')
      .attr('transform', `translate(${xPos},${yPos})`);

    // Update Tooltip Text
    const textContent = `Yr: ${d.year} | Att: ${d.value}`;
    tooltipText.text(textContent);

    // Dynamic Tooltip Positioning
    // Put tooltip to the left if we are near the right edge
    const tooltipWidth = tooltipText.node().getComputedTextLength() + 20;
    const tooltipX = (xPos + tooltipWidth + 10 > innerWidth) 
                     ? xPos - tooltipWidth - 10 
                     : xPos + 10;
    
    // Keep vertical position somewhat fixed or following point, clamped to top
    const tooltipY = Math.max(20, yPos - 20); 

    tooltipGroup.attr('transform', `translate(${tooltipX},${tooltipY})`);
    
    // Resize rect to fit text
    tooltipRect
      .attr('width', tooltipWidth)
      .attr('height', 20)
      .attr('y', -10); // Center rect vertically around text
  }
}