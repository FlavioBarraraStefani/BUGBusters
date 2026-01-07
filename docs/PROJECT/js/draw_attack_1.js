window.addEventListener('resize', () => { 
  if (window._draw_attack_1_lastCall) draw_attack_1(...window._draw_attack_1_lastCall); 
});

function draw_attack_1(data, choice, containerId) {
  window._draw_attack_1_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;
  
  svg.selectAll('*').remove();
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`) // FOR RESPONSIVE SCALING
  const g = svg.append('g')

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
  
  const idx_choice = CATEGORIES.attack.indexOf(choice);  
  const selectedData = attackTypes.filter(d => d.attack_type === attackLabels[idx_choice]) // CHOOSE ATTACK TYPE
  const mainColor = COLORS.attackColors[idx_choice]; 

  const globalMaxValues = {
    'success_rate': data.meta.global_max_values.success_rate,
    'avg_kills': data.meta.global_max_values.avg_kills,
    'avg_wounded': data.meta.global_max_values.avg_wounded,
    'avg_damage': data.meta.global_max_values.avg_damage
  };


  const fontSize = 10;  
  // Scaling factors based on fontSize (base size = 12)
  const labelOffset = fontSize * 1.2 + 10;
  const maxValOffset = fontSize * 1.1 + 5;
  const pointRadius = Math.max(3, fontSize * 0.35);
  const hoverRadius = Math.max(7, fontSize * 0.8);

  // Adjust radius to account for labels
  const labelSpace = fontSize *5;
  const centerX = CHART_WIDTH / 2;
  const centerY = CHART_HEIGHT / 2;
  const radius = Math.min(centerX, centerY) - labelSpace;
  const levels = 4; //number of concentric circles

  const defs = svg.append('defs');
  
  const glowFilter = defs.append('filter')
    .attr('id', 'glow')
    .attr('height', '180%')
    .attr('width', '180%')
    .attr('x', '-40%')
    .attr('y', '-40%');

  glowFilter.append('feGaussianBlur')
    .attr('stdDeviation', 5)
    .attr('result', 'coloredBlur');

  const feMerge = glowFilter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  const shadowFilter = defs.append('filter')
    .attr('id', 'dropshadow')
    .attr('height', '130%');

  shadowFilter.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', 2.5);

  shadowFilter.append('feOffset')
    .attr('dx', 1.5)
    .attr('dy', 1.5)
    .attr('result', 'offsetblur');

  shadowFilter.append('feComponentTransfer')
    .append('feFuncA')
    .attr('type', 'linear')
    .attr('slope', 0.4);
    
  const shadowMerge = shadowFilter.append('feMerge');
  shadowMerge.append('feMergeNode');
  shadowMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  //random bullshit normalization function
  function normalize(value, key) {
    let maxKey;
    if (key === 'success') maxKey = 'success_rate';
    else maxKey = { 'nkill': 'avg_kills', 'nwound': 'avg_wounded', 'propvalue': 'avg_damage' }[key];
    
    const maxVal = globalMaxValues[maxKey] || 1;
    return Math.min(Math.max(value / maxVal, 0), 1);
  }
  
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius / levels) * i;
    g.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', levelRadius)
      .attr('fill', 'none')
      .attr('stroke', COLORS.axisLine)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.1 + (i * 0.2))
      .style('pointer-events', 'none');
  }

  const angleSlice = (Math.PI * 2) / features.length;

  features.forEach((feature, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    g.append('line')
      .attr('x1', centerX)
      .attr('y1', centerY)
      .attr('x2', x).attr('y2', y)
      .attr('stroke', COLORS.axisLine)
      .attr('stroke-width', 2.8)
      .attr('stroke-opacity', 0.65)
      .style('pointer-events', 'none');
    
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const labelRadius = radius + labelOffset; 
    const labelX = centerX + labelRadius * cosA;
    const labelY = centerY + labelRadius * sinA;
    
    // Posizionamento personalizzato per ogni feature
    let anchor = 'middle';
    let xOffset = 0;
    let yOffsetTitle = 0;
    
    // Posizionamenti specifici per feature
    if (feature.key === 'success') {
      // Success Rate (alto)
      anchor = 'middle';
      xOffset = 0;
      yOffsetTitle = -fontSize * 0.7;
    } else if (feature.key === 'nkill') {
      // Avg Kills (destra)
      anchor = 'start';
      xOffset = fontSize * 0.7;
      yOffsetTitle = 0;
    } else if (feature.key === 'nwound') {
      // Avg Wounded (basso)
      anchor = 'middle';
      xOffset = 0;
      yOffsetTitle = fontSize * 1.5;
    } else if (feature.key === 'propvalue') {
      // Avg Damage (sinistra)
      anchor = 'start';
      xOffset = -fontSize * 3.5;
      yOffsetTitle = 0;
    }

    const textLabel = g.append('text')
      .attr('x', labelX + xOffset).attr('y', labelY + yOffsetTitle)
      .attr('text-anchor', anchor).attr('dominant-baseline', 'middle')
      .attr('font-size', fontSize + 'px')
      .attr('font-weight', '1000').attr('fill', COLORS.textPrimary)
      .attr('letter-spacing', '0.3').style('pointer-events', 'none');

    // Rimuovi simbolo del dollaro da Avg Damage
    let cleanLabel = feature.label.replace(/\s*\(\$\)/g, '');
    const words = cleanLabel.split(' ');

    // Logica per andare a capo
        if (words.length > 1) {
        // Calcola offset verticale in base alla posizione
        let firstLineDy = '-0.3em';
        let secondLineDy = '1.1em';
        
        // Per Avg Wounded (in basso), riduci lo spazio tra le righe
        if (feature.key === 'nwound') {
            firstLineDy = '-1.5em';
            secondLineDy = '0.95em';
        }
        
        // PRIMA RIGA (spostata leggermente in alto)
        textLabel.append('tspan')
            .attr('x', labelX + xOffset)
            .attr('dy', firstLineDy)
            .text(words[0]);

        // SECONDA RIGA (il resto della frase, spostato sotto)
        textLabel.append('tspan')
            .attr('x', labelX + xOffset)
            .attr('dy', secondLineDy)
            .text(words.slice(1).join(' '));
    } else {
        // Se è una parola sola, scrivila normalmente al centro
        textLabel.text(cleanLabel);
    }

    const featureKeyMap = { 'success': 'success_rate', 'nkill': 'avg_kills', 'nwound': 'avg_wounded', 'propvalue': 'avg_damage' };
    const featureKey = featureKeyMap[feature.key];
    const maxValue = globalMaxValues[featureKey] || 0;

    const fmt = (v) => {
      if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
      if (v >= 1000) return (v/1000).toFixed(0) + 'k';
      if (v < 1) return v.toFixed(3);
      return v.toFixed(2);
    };

    const maxLabelRadius = radius - fontSize * 0.9; 
    const maxLx = centerX + maxLabelRadius * cosA;
    const maxLy = centerY + maxLabelRadius * sinA - 1;
    
    // Posizionamento valori massimi personalizzato per feature
    let maxValAnchor = 'middle';
    let maxValXOffset = 0;
    let maxValYOffset = 0;

    if (feature.key === 'success') {
      // Success Rate (alto)
      maxValAnchor = 'middle';
      maxValXOffset = 0;
      maxValYOffset = -maxValOffset;
    } else if (feature.key === 'nkill') {
      // Avg Kills (destra)
      maxValAnchor = 'start';
      maxValXOffset = maxValOffset;
      maxValYOffset = 0;
    } else if (feature.key === 'nwound') {
      // Avg Wounded (basso)
      maxValAnchor = 'middle';
      maxValXOffset = 0;
      maxValYOffset = maxValOffset * 1.3;
    } else if (feature.key === 'propvalue') {
      // Avg Damage (sinistra)
      maxValAnchor = 'end';
      maxValXOffset = -maxValOffset;
      maxValYOffset = 0;
    }

    g.append('text')
      .attr('x', maxLx + maxValXOffset).attr('y', maxLy + maxValYOffset)
      .attr('text-anchor', maxValAnchor).attr('dominant-baseline', 'middle')
      .attr('font-size', fontSize + 'px').attr('font-weight', 'bold').attr('fill', '#555')
      .text(fmt(maxValue));
  });

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
    .attr('fill', COLORS.defaultComparison).attr('fill-opacity', 0.1)
    .attr('stroke', COLORS.defaultComparison).attr('stroke-width', 2.2)
    .attr('filter', 'url(#dropshadow)');
  
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
    
    g.append('path')
      .datum(pathCoords).attr('d', avgLine)
      .attr('fill', mainColor).attr('fill-opacity', 0.15)
      .attr('stroke', mainColor).attr('stroke-width', 2.5)
      .attr('stroke-opacity', 1).attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#glow)');

    pathCoords.forEach((coord, i) => {
      const actualValue = [metrics.success_rate, metrics.avg_kills, metrics.avg_wounded, metrics.avg_damage][i];
      const fmt = (v) => {
        if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
        if (v >= 1000) return (v/1000).toFixed(0) + 'k';
        if (v < 1) return v.toFixed(3);
        return v.toFixed(2);
      };
      
      const pt = g.append('circle')
        .attr('cx', coord[0]).attr('cy', coord[1]).attr('r', pointRadius)
        .attr('fill', mainColor)
        .attr('stroke', mainColor).attr('stroke-width', 2.5)
        .style('cursor', 'pointer').attr('filter', 'url(#glow)');

      pt.on('mouseover', function() {
        d3.select(this).attr('r', hoverRadius).attr('stroke-width', 3);
        
        g.append('text')
         .attr('class', 'hover-label')
         .attr('x', coord[0]).attr('y', coord[1] - fontSize * 1.3)
         .attr('text-anchor', 'middle')
         .attr('font-size', fontSize + 'px').attr('font-weight', 'bold')
         .attr('fill', 'black').attr('stroke', 'white')
         .attr('stroke-width', 3).attr('paint-order', 'stroke')
         .text(fmt(actualValue));
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', pointRadius).attr('stroke-width', 2.5);
        g.selectAll('.hover-label').remove();
      });
    });
  });
  
  // Legend with font-relative sizing
  const legendRectWidth = fontSize * 0.8;
  const legendRectHeight = fontSize * 0.8;
  const legendSpacing = fontSize * 0.9;
  const legendTextOffset = legendRectWidth + fontSize * 0.3;

  const LegendLabels = [
    'Explosion',
    'Armed Assault',
    'Assassination',
    'Hostage Taking',
    'Facility Attack'
  ]
  
  const legend = g.append('g')
    .attr('transform', `translate(${fontSize * 0.8},${fontSize * 0.3 + CHART_MARGIN.top})`)
    .style('font-family', 'Arial, sans-serif').style('font-size', fontSize + 'px')
    .style('opacity', 0.98).attr('filter', 'url(#dropshadow)');

  legend.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', legendRectWidth).attr('height', legendRectHeight)
    .attr('fill', mainColor).attr('rx', 1.5)
    .attr('stroke', 'white').attr('stroke-width', 0.8);

  legend.append('text')
    .attr('x', legendTextOffset).attr('y', legendRectHeight * 0.85)
    .attr('fill', mainColor)
    .attr('font-weight', '700').attr('letter-spacing', '0.2').text(LegendLabels[idx_choice]);

  legend.append('rect')
    .attr('x', 0).attr('y', legendSpacing)
    .attr('width', legendRectWidth).attr('height', legendRectHeight)
    .attr('fill', COLORS.defaultComparison)
    .attr('rx', 1.5)
    .attr('stroke', 'white')
    .attr('stroke-width', 0.8);

  legend.append('text')
    .attr('x', legendTextOffset).attr('y', legendSpacing + legendRectHeight * 0.85)
    .attr('fill',COLORS.defaultComparison)
    .attr('font-weight', '700')
    .attr('letter-spacing', '0.2')
    .text('Global avg');
}