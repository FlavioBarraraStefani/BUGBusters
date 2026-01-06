// Global cache for map topology
window._worldTopologyCache = null;

window.addEventListener('resize', () => { if (window._draw_group_2_lastCall) draw_group_2(...window._draw_group_2_lastCall); });

async function draw_group_2(data, choice, containerId) {
  window._draw_group_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // 2. FETCH TOPOLOGY
  if (!window._worldTopologyCache) {
    try {
        const response = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
        window._worldTopologyCache = await response.json();
    } catch (error) {
        svg.append("text").text("Error loading map").attr("x", width/2).attr("y", height/2);
        return;
    }
  }
  const world = window._worldTopologyCache;
  const countriesFeatures = topojson.feature(world, world.objects.countries).features;

  // 3. PREPARE DATA
  const groupInfo = data[choice];
  
  if (!groupInfo || !groupInfo.data) {
    svg.append("text").text("No Data").attr("x", width/2).attr("y", height/2);
    return;
  }

  const dataMap = new Map(groupInfo.data.map(d => [d.country, d.count]));
  
  // 4. FILTER FEATURES
  const relevantCountries = countriesFeatures.filter(d => dataMap.has(d.properties.name));
  const featuresToFit = relevantCountries.length > 0 ? relevantCountries : countriesFeatures;

  // 5. PROJECTION & PATH
  // Manteniamo il padding superiore di 30px per fare spazio al titolo
  const topPadding = 30;
  
  const projection = d3.geoMercator()
    .fitExtent([[5, topPadding], [width - 5, height - 5]], { type: "FeatureCollection", features: featuresToFit });
    
  const pathGenerator = d3.geoPath().projection(projection);

  // 6. COLOR SCALE
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const baseColor = (groupIndex >= 0 && COLORS.groupColors[groupIndex]) 
                    ? COLORS.groupColors[groupIndex] 
                    : COLORS.defaultComparison;

  const maxVal = d3.max(groupInfo.data, d => d.count) || 100;
  const colorScale = d3.scaleSequential(d3.interpolateRgb("white", baseColor))
    .domain([0, maxVal]);

  const g = svg.append('g');

  // 7. DRAW COUNTRIES
  g.selectAll("path")
    .data(featuresToFit)
    .enter().append("path")
    .attr("d", pathGenerator)
    .attr("fill", d => {
        const value = dataMap.get(d.properties.name);
        return value ? colorScale(value) : "#f0f0f0"; 
    })
    .attr("stroke", "#bbb") 
    .attr("stroke-width", 0.5)
    // Interaction
    .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1).raise();
        const value = dataMap.get(d.properties.name) || 0;
        
        tooltipGroup.style("display", null);
        tooltipText.text(`${d.properties.name}: ${value}`);
        
        const bbox = tooltipText.node().getBBox();
        tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
    })
    .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svg.node());
        const xOffset = (x > width / 2) ? -100 : 10; 
        tooltipGroup.attr("transform", `translate(${x + xOffset}, ${y - 20})`);
    })
    .on("mouseout", function() {
        d3.select(this).attr("stroke", "#bbb").attr("stroke-width", 0.5);
        tooltipGroup.style("display", "none");
    });

  // 8. ADD REGION LABEL (CENTERED)
  // Posizioniamo il gruppo esattamente al centro della larghezza (width/2) e a 20px dall'alto
  const titleGroup = svg.append("g")
     .attr("transform", `translate(${width / 2}, 20)`)
     .style("text-anchor", "middle"); // Fondamentale per centrare il testo

  // 8a. Halo (White stroke outline)
  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("stroke", "white")
    .style("stroke-width", "3px")
    .style("stroke-linejoin", "round")
    .style("fill", "white")
    .style("opacity", 0.8);

  // 8b. Actual Text
  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", COLORS.textPrimary);

  // 9. TOOLTIP GROUP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  
  const tooltipRect = tooltipGroup.append("rect")
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#333")
    .attr("rx", 4);

  const tooltipText = tooltipGroup.append("text")
    .attr("x", 5)
    .attr("y", 12)
    .style("font-size", "10px")
    .style("font-weight", "bold");
}// Global cache for map topology
window._worldTopologyCache = null;

window.addEventListener('resize', () => { if (window._draw_group_2_lastCall) draw_group_2(...window._draw_group_2_lastCall); });

async function draw_group_2(data, choice, containerId) {
  window._draw_group_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONS
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  // 2. FETCH TOPOLOGY
  if (!window._worldTopologyCache) {
    try {
        const response = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json');
        window._worldTopologyCache = await response.json();
    } catch (error) {
        svg.append("text")
           .text("Error loading map")
           .attr("x", width/2)
           .attr("y", height/2)
           .style("font-size", `${labelFontSize}px`);
        return;
    }
  }
  const world = window._worldTopologyCache;
  const countriesFeatures = topojson.feature(world, world.objects.countries).features;

  // 3. PREPARE DATA
  const groupInfo = data[choice];
  
  if (!groupInfo || !groupInfo.data) {
    svg.append("text")
       .text("No Data")
       .attr("x", width/2)
       .attr("y", height/2)
       .style("font-size", `${labelFontSize}px`);
    return;
  }

  const dataMap = new Map(groupInfo.data.map(d => [d.country, d.count]));
  
  // 4. FILTER FEATURES
  const relevantCountries = countriesFeatures.filter(d => dataMap.has(d.properties.name));
  const featuresToFit = relevantCountries.length > 0 ? relevantCountries : countriesFeatures;

  // 5. PROJECTION & PATH
  // Usiamo CHART_MARGIN per definire l'area di disegno della mappa
  const projection = d3.geoMercator()
    .fitExtent([
        [CHART_MARGIN.left, CHART_MARGIN.top], 
        [width - CHART_MARGIN.right, height - CHART_MARGIN.bottom]
    ], { type: "FeatureCollection", features: featuresToFit });
    
  const pathGenerator = d3.geoPath().projection(projection);

  // 6. COLOR SCALE
  const groupIndex = CATEGORIES.group.indexOf(choice);
  const baseColor = (groupIndex >= 0 && COLORS.groupColors[groupIndex]) 
                    ? COLORS.groupColors[groupIndex] 
                    : COLORS.defaultComparison;

  const maxVal = d3.max(groupInfo.data, d => d.count) || 100;
  
  // Interpoliamo dal bianco al colore del gruppo per i dati
  const colorScale = d3.scaleSequential(d3.interpolateRgb("white", baseColor))
    .domain([0, maxVal]);

  const g = svg.append('g');

  // 7. DRAW COUNTRIES
  g.selectAll("path")
    .data(featuresToFit)
    .enter().append("path")
    .attr("d", pathGenerator)
    .attr("fill", d => {
        const value = dataMap.get(d.properties.name);
        // Se c'è un valore > 0 usiamo la scala, altrimenti il colore di default del globo
        return value ? colorScale(value) : (COLORS.GLOBE.country.fill || "#f4f3f3");
    })
    .attr("stroke", COLORS.GLOBE.country.stroke || "#171717") 
    .attr("stroke-width", 0.5)
    // Interaction
    .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#333") // Highlight stroke color
          .attr("stroke-width", 1)
          .raise();
          
        const value = dataMap.get(d.properties.name) || 0;
        
        tooltipGroup.style("display", null);
        // Explicit tooltip text
        tooltipText.text(`${d.properties.name}: ${value} attacks`);
        
        const bbox = tooltipText.node().getBBox();
        tooltipRect.attr("width", bbox.width + 10).attr("height", bbox.height + 6);
    })
    .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svg.node());
        const xOffset = (x > width / 2) ? -100 : 10; 
        tooltipGroup.attr("transform", `translate(${x + xOffset}, ${y - 20})`);
    })
    .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", COLORS.GLOBE.country.stroke || "#171717")
          .attr("stroke-width", 0.5);
        tooltipGroup.style("display", "none");
    });

  // 8. ADD REGION LABEL (CENTERED)
  // Posizioniamo il titolo centrato orizzontalmente e dentro il margine superiore
  const titleGroup = svg.append("g")
     .attr("transform", `translate(${width / 2}, ${CHART_MARGIN.top / 1.5})`) // Posizionato nel margine superiore
     .style("text-anchor", "middle");

  // 8a. Halo (White stroke outline)
  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", `${labelFontSize}px`) // Use constant
    .style("font-weight", "bold")
    .style("stroke", "white")
    .style("stroke-width", "3px")
    .style("stroke-linejoin", "round")
    .style("fill", "white")
    .style("opacity", 0.8);

  // 8b. Actual Text
  titleGroup.append("text")
    .text(groupInfo.region)
    .style("font-size", `${labelFontSize}px`) // Use constant
    .style("font-weight", "bold")
    .style("fill", COLORS.textPrimary);

  // 9. TOOLTIP GROUP
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  
  const tooltipRect = tooltipGroup.append("rect")
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#333")
    .attr("rx", 4);

  const tooltipText = tooltipGroup.append("text")
    .attr("x", 5)
    .attr("y", 12)
    .style("font-size", `${labelFontSize - 2}px`) // Slightly smaller than main labels
    .style("font-weight", "bold");
}