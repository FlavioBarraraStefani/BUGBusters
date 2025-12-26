window.addEventListener('resize', () => { if (window._draw_target_3_lastCall) draw_target_3(...window._draw_target_3_lastCall); });

function draw_target_3(data, choice, containerId) {
  window._draw_target_3_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  // Clear existing content
  svg.selectAll('*').remove();
  
  // Use fixed dimensions from constants (viewBox handles responsive scaling)
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  //----------------------//
  //MODIFY AFTER THIS LINE//
  //----------------------//

  //example
  
  // Sample data
  const chartData = [
    { label: '2014', value: Math.floor(Math.random() * 300) + 100 },
    { label: '2015', value: Math.floor(Math.random() * 300) + 100 },
    { label: '2016', value: Math.floor(Math.random() * 300) + 100 },
    { label: '2017', value: Math.floor(Math.random() * 300) + 100 },
    { label: '2018', value: Math.floor(Math.random() * 300) + 100 }
  ];
  
  const xScale = d3.scaleBand().domain(chartData.map(d => d.label)).range([0, innerWidth]).padding(0.2);
  const yScale = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value)]).nice().range([innerHeight, 0]);
  
  // Bars
  g.selectAll('rect').data(chartData).enter().append('rect')
    .attr('x', d => xScale(d.label))
    .attr('y', d => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', d => innerHeight - yScale(d.value))
    .attr('fill', '#0d6efd');
  
  // Axes
  g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));
  g.append('g').call(d3.axisLeft(yScale).ticks(5));
}
