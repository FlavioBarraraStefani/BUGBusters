const METRICS = ['count', 'avg_kills', 'avg_wounded', 'avg_damage', 'success_rate'];

window.addEventListener('resize', () => { 
  if (window._draw_attack_2_lastCall) 
    draw_attack_2(...window._draw_attack_2_lastCall); 
});

function draw_attack_2(data, choice, containerId) {
  // Save state for resize
  window._draw_attack_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);  
  container.style('position', 'relative');
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  // Clear existing content
  svg.selectAll('*').remove();
  
  // Dimensions 
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - 2*CHART_MARGIN.top - CHART_MARGIN.bottom;
  
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const innerRadius = 20;

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${CHART_WIDTH/2},${CHART_HEIGHT/2+0.75*CHART_MARGIN.top})`);

  // 1. DATA & COLORS
  const chartData = data[choice] || [];
  const typeIndex = CATEGORIES.attack.indexOf(choice);
  const baseColor = COLORS.attackColors[typeIndex]

  // Global maximums (safe access)
  const gm = data && data.meta && data.meta.global_max_values ? data.meta.global_max_values : {};
  const globalMaxValues = {
    'success_rate': gm.success_rate,
    'avg_kills': gm.avg_kills,
    'avg_wounded': gm.avg_wounded,
    'avg_damage': gm.avg_damage
  };

  const fontSize =  isSmallScreen() ? 10 : 15;

  // 2. UI CONTROLS — create a sibling div before the SVG so controls sit above the canvas
  let controlsWrapper = container.select('.chart-controls');
  if (controlsWrapper.empty()) {
    controlsWrapper = container.insert('div', 'svg')
      .attr('class', 'chart-controls')
      .style('display', 'flex')
      .style('position', 'absolute')
      .style('flex-direction', 'row')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('gap', '8px')
      .style('top', (5) + 'px')
      .style('left', '50%')
      .style('transform', 'translateX(-50%)')
      .style('z-index', '11');
  }

  let controlLabel = controlsWrapper.select('.chart-control-label');
  if (controlLabel.empty()) {
    controlLabel = controlsWrapper.append('div')
      .attr('class', 'chart-control-label')
      .style('color', COLORS.defaultComparison)
      .style('font-weight', 'bold')
      .style('font-size', `${fontSize*1.2}px`)
      .text('Feature:');
  }

  let controls = controlsWrapper.select('.chart-control-select');
  if (controls.empty()) {
    controls = controlsWrapper.append('select')
      .attr('class', 'chart-control-select')
      .style('color', baseColor)
      .style('font-size', `${fontSize*1}px`)
      .style('border-color', 'black')
      .style('border-radius', '4px');
    
    controls.selectAll('option')
      .data(METRICS)
      .enter().append('option')
      .attr('value', d => d)
      .text(d => d.replace('_', ' ').toUpperCase());

    controls.on('change', function() {
      updateChart(this.value);
    });
  }

  // 3. TOOLTIP (append to body to avoid SVG/container clipping)
  let tooltip = d3.select('body').select('.d3-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(255, 255, 255, 0.95)')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('pointer-events', 'none')
      .style('font-size', `${labelFontSize}px`)
      .style('opacity', 0)
      .style('z-index', '10000');
  }

  // 4. SCALES & LAYERS
  const x = d3.scaleBand()
    .range([0, 2 * Math.PI])
    .align(0)
    .domain(d3.range(1969, 2021).map(String));

  const y = d3.scaleLinear()
    .range([innerRadius, radius]);

  const gridLayer = g.append("g");
  const sliceLayer = g.append("g");
  const tickLayer = g.append("g").attr('class', 'label-ticks');
  const labelLayer = g.append("g");

  // Labels - FIXED ROTATION
  const labelData = x.domain().filter(d => (parseInt(d) - 1969) % 5 === 0);
  // Draw radial tick lines from innerRadius to just past the label position
  tickLayer.selectAll('line')
    .data(labelData)
    .join('line')
    .attr('class', 'year-tick')
    .attr('stroke', COLORS.axisLine)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '5,2')
    .style('z-index', -1)
    .style('opacity', 0.7)
    .attr('x1', d => {
      const theta = x(d) + x.bandwidth() / 2 - Math.PI / 2;
      return Math.cos(theta) * innerRadius;
    })
    .attr('y1', d => {
      const theta = x(d) + x.bandwidth() / 2 - Math.PI / 2;
      return Math.sin(theta) * innerRadius;
    })
    .attr('x2', d => {
      const theta = x(d) + x.bandwidth() / 2 - Math.PI / 2;
      return Math.cos(theta) * (radius + 5);
    })
    .attr('y2', d => {
      const theta = x(d) + x.bandwidth() / 2 - Math.PI / 2;
      return Math.sin(theta) * (radius + 5);
    });

  labelLayer.selectAll("text")
    .data(labelData)
    .enter()
    .append("text")
    .each(function (d) {
      const angle = x(d) + x.bandwidth() / 2;
      const rotateAngle = angle * 180 / Math.PI - 90;

      d3.select(this)
        .attr(
          "transform",
          `rotate(${rotateAngle}) translate(${radius + 10},0) rotate(${-rotateAngle})`
        )
        .attr("text-anchor", "middle")          // horizontal center
        .attr("dominant-baseline", "middle");   // vertical center
    })
    .text(d => d)
    .style("font-size", `${labelFontSize / 2}px`)
    .style("fill", COLORS.textPrimary)
    .style("font-weight", "bold");


  // 5. UPDATE FUNCTION
  function updateChart(metric) {
    // Get all values for this metric
    const values = chartData.map(d => d[metric] || 0).filter(v => v !== null && !isNaN(v));
    // Prefer global max if provided, otherwise fall back to data max
    const globalMax = globalMaxValues[metric];
    const maxVal = (globalMax != null && !isNaN(globalMax)) ? globalMax : (d3.max(values) || 1);
    
    // Set domain from 0 to max, range already set to [innerRadius, radius]
    y.domain([0, maxVal]);

    const colorScale = d3.scaleSequential()
      .domain([0, maxVal])
      .interpolator(d3.interpolateRgb("#ffffff", baseColor));

    // Grid (animated transitions on metric change)
    const yTicks = y.ticks(5);
    const grid = gridLayer.selectAll("circle").data(yTicks, d => d);

    grid.join(
      enter => enter.append('circle')
        .attr('fill', 'none')
        .attr('stroke', COLORS.axisLine)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0)
        .attr('r', innerRadius)
        .call(enter => enter.transition().duration(750)
          .style('opacity', 0.5)
          .attr('r', d => y(d))
        ),
      update => update.call(update => update.transition().duration(750)
        .style('opacity', 0.5)
        .attr('r', d => y(d))
      ),
      exit => exit.call(exit => exit.transition().duration(750)
        .style('opacity', 0)
        .attr('r', innerRadius)
        .remove()
      )
    );

    // Slices
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .startAngle(d => x(d.year))
      .endAngle(d => x(d.year) + x.bandwidth())
      .padAngle(0.01)
      .padRadius(innerRadius);

    sliceLayer.selectAll("path")
      .data(chartData, d => d.year)
      .join(
        enter => enter.append("path")
          .attr("fill", d => colorScale(d[metric] || 0))
          .style("cursor", "pointer")
          .style("z-index", 1)
          .attr("d", d => arc.outerRadius(innerRadius)(d))
          .each(function(d) { 
            this._currentR = y(d[metric] || 0);
          })
          .call(enter => enter.transition().duration(750)
            .attrTween("d", function(d) {
              const targetR = y(d[metric] || 0);
              const i = d3.interpolate(innerRadius, targetR);
              return t => arc.outerRadius(i(t))(d);
            })
          ),
        update => update.call(update => update.transition().duration(750)
          .attr("fill", d => colorScale(d[metric] || 0))
          .attrTween("d", function(d) {
              const prev = this._currentR || innerRadius;
              const next = y(d[metric] || 0);
              this._currentR = next;
              const i = d3.interpolate(prev, next);
              return t => arc.outerRadius(i(t))(d);
          })
        ),
        exit => exit.remove()
      )
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .style("stroke", "#333")
          .style("stroke-width", 2);        
        // Fixed: Get mouse position relative to the page
        const mouseX = event.pageX;
        const mouseY = event.pageY;
        
        tooltip.interrupt()
          .style("opacity", 1)
          .html(`<strong>Year:${d.year}</strong><br>${metric.replace('_',' ')}: ${(d[metric]||0).toFixed(2)}`)
          .style("left", (mouseX + 10) + "px")
          .style("top", (mouseY + 10) + "px");
      })
      .on("mousemove", (event) => {
        // Update tooltip position on move
        const mouseX = event.pageX;
        const mouseY = event.pageY;
        
        tooltip
          .style("left", (mouseX + 10) + "px")
          .style("top", (mouseY + 10) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .style("stroke", "none");
        tooltip.transition()
          .duration(200)
          .style("opacity", 0);
      });
  }

  const currentMetric = controls.property('value') || 'count';
  updateChart(currentMetric);
}