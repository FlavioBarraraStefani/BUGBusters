window.addEventListener('resize', () => { if (window._draw_attack_1_lastCall) draw_attack_1(...window._draw_attack_1_lastCall); });

function draw_attack_1(data, choice, containerId) {
  window._draw_attack_1_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  // Clear existing content
  svg.selectAll('*').remove();
  
  // Setup SVG dimensions
  const innerWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const innerHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
  const g = svg.append('g').attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

  //--------//
  // PREPROCESSING
  //--------//
  const features = data.meta.features;
  const attackTypes = data.data;
  const globalAverage = data.meta.global_average;

  const attackLabels = [
    'Bombing/Explosion',
    'Armed Assault',
    'Assassination',
    'Hostage Taking (Kidnapping)',
    'Facility/Infrastructure Attack'
  ];
  // Get selected attack data
  const idx_choice = CATEGORIES.attack.indexOf(choice);  
  const selectedData = attackTypes.filter(d => d.attack_type === attackLabels[idx_choice])
  // Color for selected attack
  const mainColor = COLORS.attackColors[idx_choice];

  const globalMaxValues = {
    'success_rate': data.meta.global_max_values.success_rate,
    'avg_kills': data.meta.global_max_values.avg_kills,
    'avg_wounded': data.meta.global_max_values.avg_wounded,
    'avg_damage': data.meta.global_max_values.avg_damage
  };

  //--------//
  // DRAWING
  //--------//


  // 4. CHART SETUP (Maximised)
  const centerX = innerWidth / 2;
  const centerY = innerHeight / 2;
  
  // MODIFICATO: -15px margine minimo per massimizzare il raggio
  const radius = (Math.min(innerWidth, innerHeight) /2) - 15; 
  
  const levels = 5;

  // Defs: Filters
  const defs = svg.append('defs');
  const glowFilter = defs.append('filter').attr('id', 'glow').attr('height', '180%').attr('width', '180%').attr('x', '-40%').attr('y', '-40%');
  glowFilter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur');
  const feMerge = glowFilter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  const shadowFilter = defs.append('filter').attr('id', 'dropshadow').attr('height', '130%');
  shadowFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 2.5);
  shadowFilter.append('feOffset').attr('dx', 1.5).attr('dy', 1.5).attr('result', 'offsetblur');
  shadowFilter.append('feComponentTransfer').append('feFuncA').attr('type', 'linear').attr('slope', 0.4);
  const shadowMerge = shadowFilter.append('feMerge');
  shadowMerge.append('feMergeNode');
  shadowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  // Normalize helper
  function normalize(value, key) {
    let maxKey;
    if (key === 'success') maxKey = 'success_rate';
    else maxKey = { 'nkill': 'avg_kills', 'nwound': 'avg_wounded', 'propvalue': 'avg_damage' }[key];
    
    const maxVal = globalMaxValues[maxKey] || 1;
    return Math.min(Math.max(value / maxVal, 0), 1);
  }
  
  // Draw Grid Circles
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius / levels) * i;
    g.append('circle')
      .attr('cx', centerX).attr('cy', centerY).attr('r', levelRadius)
      .attr('fill', 'none').attr('stroke', COLORS.axisLine)
      .attr('stroke-width', 2.5).attr('stroke-opacity', 0.15 + (i * 0.08))
      .style('pointer-events', 'none');
  }

  // 5. DRAW AXES AND LABELS (Tighter Fit)
  const angleSlice = (Math.PI * 2) / features.length;

  features.forEach((feature, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Axis line
    g.append('line')
      .attr('x1', centerX).attr('y1', centerY).attr('x2', x).attr('y2', y)
      .attr('stroke', COLORS.axisLine)
      .attr('stroke-width', 2.8).attr('stroke-opacity', 0.65)
      .style('pointer-events', 'none');
    
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // --- A. Feature Label (Outer Title) ---
    // MODIFICATO: +20px (più vicino al grafico)
    const labelRadius = radius + 20; 
    const labelX = centerX + labelRadius * Math.cos(angle);
    const labelY = centerY + labelRadius * Math.sin(angle);
    
    let anchor = 'middle';
    let xOffset = 0;
    
    // Horizontal adjustment
    if (cosA < -0.2) { anchor = 'end'; xOffset = -5; }
    else if (cosA > 0.2) { anchor = 'start'; xOffset = 5; }

    // Vertical adjustment: Push Titles AWAY from center
    let yOffsetTitle = 0;
    if (sinA < -0.9) { 
        yOffsetTitle = -6; // Top: Move Up slightly
    } else if (sinA > 0.9) {
        yOffsetTitle = 6;  // Bottom: Move Down slightly
    }

    g.append('text')
      .attr('x', labelX + xOffset).attr('y', labelY + yOffsetTitle)
      .attr('text-anchor', anchor).attr('dominant-baseline', 'middle')
      .attr('font-size', '9px').attr('font-weight', '800').attr('fill', COLORS.textPrimary)
      .attr('letter-spacing', '0.3').style('pointer-events', 'none')
      .text(feature.label);

    // --- B. Max Value Label (Inner - The Bold Number) ---
    const featureKeyMap = { 'success': 'success_rate', 'nkill': 'avg_kills', 'nwound': 'avg_wounded', 'propvalue': 'avg_damage' };
    const featureKey = featureKeyMap[feature.key];
    const maxValue = globalMaxValues[featureKey] || 0;

    const fmt = (v) => {
      if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
      if (v >= 1000) return (v/1000).toFixed(0) + 'k';
      if (v < 1) return v.toFixed(3);
      return v.toFixed(2);
    };

    // MODIFICATO: +6px (molto vicino al cerchio)
    const maxLabelRadius = radius + 6; 
    const maxLx = centerX + maxLabelRadius * Math.cos(angle);
    const maxLy = centerY + maxLabelRadius * Math.sin(angle);
    
    let maxValAnchor = 'middle';
    let maxValXOffset = 0;
    let maxValYOffset = 0;

    // Horizontal alignment
    if (cosA < -0.2) { maxValAnchor = 'end'; maxValXOffset = -8; } 
    else if (cosA > 0.2) { maxValAnchor = 'start'; maxValXOffset = 8; }

    // Vertical separation: Push Values TOWARDS center
    if (Math.abs(sinA) < 0.3) { 
        maxValYOffset = 12; // Horizontal axis: push down
    } 
    else if (sinA < -0.9) { 
        maxValYOffset = 12; // Top Axis: Push DOWN
    } 
    else if (sinA > 0.9) { 
        maxValYOffset = -12; // Bottom Axis: Push UP
    }

    // Max Value (BOLD)
    g.append('text')
      .attr('x', maxLx + maxValXOffset).attr('y', maxLy + maxValYOffset)
      .attr('text-anchor', maxValAnchor).attr('dominant-baseline', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold') // BOLD
      .attr('fill', '#555')
      .text(fmt(maxValue));
  });

  // 6. DRAW POLYGONS
  // Global Average
  const avgValues = [
    normalize(globalAverage.success_rate, 'success'),
    normalize(globalAverage.avg_kills, 'nkill'),
    normalize(globalAverage.avg_wounded, 'nwound'),
    normalize(globalAverage.avg_damage, 'propvalue')
  ];
  
  const avgCoords = avgValues.map((value, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = radius * value;
    return [centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)];
  });

  const avgLine = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveLinearClosed);

  g.append('path')
    .datum(avgCoords).attr('d', avgLine)
    .attr('fill', '#B0BEC5').attr('fill-opacity', 0.15)
    .attr('stroke', '#78909C').attr('stroke-width', 2.2)
    .attr('filter', 'url(#dropshadow)');
  
  // Selected Attack
  selectedData.forEach((attackType) => {
    const metrics = attackType.metrics;
    const values = [
      normalize(metrics.success_rate, 'success'),
      normalize(metrics.avg_kills, 'nkill'),
      normalize(metrics.avg_wounded, 'nwound'),
      normalize(metrics.avg_damage, 'propvalue')
    ];
    const pathCoords = values.map((value, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = radius * value;
      return [centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)];
    });
    
    // Polygon
    g.append('path')
      .datum(pathCoords).attr('d', avgLine)
      .attr('fill', mainColor).attr('fill-opacity', 0.2)
      .attr('stroke', mainColor).attr('stroke-width', 3)
      .attr('stroke-opacity', 1).attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#glow)');

    // Data Points (Hover Only)
    pathCoords.forEach((coord, i) => {
      const actualValue = [metrics.success_rate, metrics.avg_kills, metrics.avg_wounded, metrics.avg_damage][i];
      const fmt = (v) => {
        if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
        if (v >= 1000) return (v/1000).toFixed(0) + 'k';
        if (v < 1) return v.toFixed(3);
        return v.toFixed(2);
      };
      
      const pt = g.append('circle')
        .attr('cx', coord[0]).attr('cy', coord[1]).attr('r', 7.0)
        .attr('fill', mainColor)
        .attr('stroke', '#fff').attr('stroke-width', 2.5)
        .style('cursor', 'pointer').attr('filter', 'url(#glow)');

      // --- HOVER EFFECT ---
      pt.on('mouseover', function() {
        d3.select(this).attr('r', 9.5).attr('stroke-width', 3);
        
        g.append('text')
         .attr('class', 'hover-label')
         .attr('x', coord[0])
         .attr('y', coord[1] - 15) // Above dot
         .attr('text-anchor', 'middle')
         .attr('font-size', '10px')
         .attr('font-weight', 'bold') // Bold only on hover
         .attr('fill', 'black')
         .attr('stroke', 'white')
         .attr('stroke-width', 3)
         .attr('paint-order', 'stroke')
         .text(fmt(actualValue));
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 7.0).attr('stroke-width', 2.5);
        g.selectAll('.hover-label').remove();
      });
    });
  });
  
  // Legend
  const legend = g.append('g')
    .attr('transform', `translate(8,6)`)
    .style('font-family', 'Arial, sans-serif').style('font-size', '8px')
    .style('opacity', 0.98).attr('filter', 'url(#dropshadow)');

  let redLabel = 'Selected';
  let redColor = '#FF5252';
  
  const shortLabelMap = {
    'Bombing/Explosion': 'explosion',
    'Armed Assault': 'armed_assault',
    'Assassination': 'assassination',
    'Hostage Taking (Kidnapping)': 'hostage_taking',
    'Facility/Infrastructure Attack': 'infrastructure_attack'
  };

  if (selectedData && selectedData.length === 1) {
    const full = selectedData[0].attack_type;
    redLabel = shortLabelMap[full] || full;
    redColor =  redColor;
  }

  legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 11).attr('height', 9)
    .attr('fill', redColor).attr('rx', 2).attr('stroke', 'white').attr('stroke-width', 1);
  legend.append('text').attr('x', 15).attr('y', 7.5).attr('fill', '#1565C0')
    .attr('font-weight', '700').attr('letter-spacing', '0.2').text(redLabel);

  legend.append('rect').attr('x', 0).attr('y', 15).attr('width', 11).attr('height', 9)
    .attr('fill', '#78909C').attr('rx', 2).attr('stroke', 'white').attr('stroke-width', 1);
  legend.append('text').attr('x', 15).attr('y', 22.5).attr('fill', '#1565C0')
    .attr('font-weight', '700').attr('letter-spacing', '0.2').text('Global avg');
}