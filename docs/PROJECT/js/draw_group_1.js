window.addEventListener('resize', () => { if (window._draw_group_1_lastCall) draw_group_1(...window._draw_group_1_lastCall); });

function draw_group_1(data, choice, containerId) {
  window._draw_group_1_lastCall = [data, choice, containerId];

  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;

  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  const localMargin = { ...CHART_MARGIN, left: 50, bottom: 40 };

  const innerWidth = CHART_WIDTH - localMargin.left - localMargin.right;
  const innerHeight = CHART_HEIGHT - localMargin.top - localMargin.bottom;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

  const g = svg.append('g').attr('transform', `translate(${localMargin.left},${localMargin.top})`);

  // DATA CHECK
  const groupData = data[choice];
  if (!groupData || groupData.length === 0) {
    g.append("text").text("No Data Available").attr("x", innerWidth / 2).attr("y", innerHeight / 2).style("text-anchor", "middle").style("font-size", chartLabelFontSize + "px").style("fill", COLORS.textPrimary);
    return;
  }

  // SCALES
  const xScale = d3.scaleLinear()
    .domain(d3.extent(groupData, d => d.year))
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupData, d => +d.value)])
    .nice()
    .range([innerHeight, 0]);

  // COLOR
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const lineColor = (groupIndex >= 0 && COLORS.groupColors[groupIndex])
    ? COLORS.groupColors[groupIndex]
    : COLORS.defaultComparison;

  // DRAW
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

  // AXES
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(5))
    .attr('color', COLORS.axisLine)
    .selectAll("text")
    .style("font-size", chartLabelFontSize + "px")
    .style("fill", COLORS.textPrimary);

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("~s")))
    .attr('color', COLORS.axisLine)
    .selectAll("text")
    .style("font-size", chartLabelFontSize + "px")
    .style("fill", COLORS.textPrimary);

  // LABELS
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + localMargin.bottom - 5)
    .style("text-anchor", "middle")
    .style("font-size", chartLabelFontSize + "px")
    .style("fill", COLORS.textPrimary)
    .text("Years");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -localMargin.left + 15)
    .attr("x", -innerHeight / 2)
    .style("text-anchor", "middle")
    .style("font-size", chartLabelFontSize + "px")
    .style("fill", COLORS.textPrimary)
    .text("Cumulative Attacks");

  // INTERACTION / TOOLTIP
  const focus = g.append('g').style('display', 'none');

  focus.append('line')
    .attr('class', 'hover-line')
    .attr('y1', 0).attr('y2', innerHeight)
    .style('stroke', '#666').style('stroke-width', '1px').style('stroke-dasharray', '3 3');

  focus.append('circle')
    .attr('r', 4).style('fill', 'white').style('stroke', lineColor).style('stroke-width', '2px');

  const tooltipGroup = focus.append('g').attr('class', 'tooltip-container');
  const tooltipRect = tooltipGroup.append('rect').attr('fill', 'rgba(255, 255, 255, 0.95)').attr('stroke', '#ccc').attr('rx', 4);
  const tooltipText = tooltipGroup.append('text').attr('x', 9).attr('dy', '.35em').style("font-size", (chartLabelFontSize - 2) + "px").style("fill", "#333");

  g.append('rect')
    .attr('class', 'overlay')
    .attr('width', innerWidth).attr('height', innerHeight)
    .style('opacity', 0).style('cursor', 'crosshair')
    .on('mouseover', () => focus.style('display', null))
    .on('mouseout', () => focus.style('display', 'none'))
    .on('mousemove', mousemove);

  const bisectDate = d3.bisector(d => d.year).left;

  function mousemove(event) {
    const x0 = xScale.invert(d3.pointer(event)[0]);
    const i = bisectDate(groupData, x0, 1);
    const d0 = groupData[i - 1];
    const d1 = groupData[i];
    let d = (!d0) ? d1 : (!d1) ? d0 : (x0 - d0.year > d1.year - x0 ? d1 : d0);

    if (!d) return;

    const prevVal = (i > 0 && groupData[i - 1]) ? groupData[i - 1].value : 0;
    const currentIndex = groupData.indexOf(d);
    const previousCumulative = currentIndex > 0 ? groupData[currentIndex - 1].value : 0;
    const yearlyAttacks = d.value - previousCumulative;

    const xPos = xScale(d.year);
    const yPos = yScale(d.value);

    focus.select('.hover-line').attr('transform', `translate(${xPos},0)`);
    focus.select('circle').attr('transform', `translate(${xPos},${yPos})`);

    // Updated Tooltip 
    tooltipText.text(""); // clear
    tooltipText.append("tspan").attr("x", 5).attr("dy", "1.2em").style("font-weight", "bold").text(`Year: ${d.year}`);
    tooltipText.append("tspan").attr("x", 5).attr("dy", "1.2em").text(`In Year: ${yearlyAttacks}`);
    tooltipText.append("tspan").attr("x", 5).attr("dy", "1.2em").text(`Total: ${d.value}`);

    const bbox = tooltipText.node().getBBox();
    tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 10).attr("y", 0);

    // Position Logic
    let tooltipX = xPos + 10;
    if (xPos + bbox.width + 20 > innerWidth) tooltipX = xPos - bbox.width - 20;
    let tooltipY = yPos - bbox.height / 2;
    if (tooltipY < 0) tooltipY = 0;

    tooltipGroup.attr('transform', `translate(${tooltipX},${tooltipY})`);
  }
}