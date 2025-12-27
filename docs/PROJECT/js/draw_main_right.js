window.addEventListener('resize', () => { if (window._draw_main_right_lastCall) draw_main_right(...window._draw_main_right_lastCall); });

// Draw function for main page right canvas
function draw_main_right(categoryInfo, containerId) {
  window._draw_main_right_lastCall = [categoryInfo, containerId];

  const container = d3.select(`#${containerId}`);
  // SVG is inside .canvas-wrapper child
  const svg = container.select('.canvas-wrapper svg');
  if (svg.empty()) return;
  
  svg.selectAll('*').remove();
  svg.attr('width', '100%')
     .attr('height', '100%')
     .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  // Drawing code - placeholder bar chart
  const chartData = [
    { label: 'A', value: Math.floor(Math.random() * 5) + 10 },
    { label: 'B', value: 20 },
    { label: 'C', value: 15 }
  ];
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const xScale = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, innerWidth]).padding(0.2);
  const yScale = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value)]).nice().range([innerHeight, 0]);
  g.selectAll('rect').data(chartData).enter().append('rect')
    .attr('x', d => xScale(d.label))
    .attr('y', d => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', d => innerHeight - yScale(d.value))
    .attr('fill', '#0d6efd');
  g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));
  g.append('g').call(d3.axisLeft(yScale));

}
