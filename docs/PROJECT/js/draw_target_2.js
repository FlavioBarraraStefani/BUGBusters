window.addEventListener('resize', () => { if (window._draw_target_2_lastCall) draw_target_2(...window._draw_target_2_lastCall); });

function draw_target_2(data, choice, containerId) {
  window._draw_target_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP DIMENSIONI
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  // Radius base: Aumentato leggermente recuperando spazio dai margini
  const radius = Math.min(width, height) / 2 - 35; 

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize - 1 : 9;
  const duration = 750;

  // 2. DATA PREP
  const rawData = JSON.parse(JSON.stringify(data[choice]));
  const hierarchy = d3.hierarchy(rawData);

  // 3. TREE CONFIG
  const tree = d3.tree()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 10 : 30) / a.depth);

  // 4. SCALES & COLORS
  const colorMap = {};
  const CATEGORIES_LIST = ["military_police", "government", "business", "citizens", "transportations"];
  CATEGORIES_LIST.forEach((key, i) => {
      colorMap[key] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  const maxValue = d3.max(hierarchy.descendants(), d => d.data.value);
  const sizeScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([2, 10]); 

  // 5. INITIAL COLLAPSE
  function collapse(d) {
      if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
      }
  }

  hierarchy.children.forEach(d => {
      if (d.data.name !== choice) {
          collapse(d);
      }
  });

  const root = hierarchy;
  root.x0 = 0;
  root.y0 = 0;

  update(root);

  // ---------------------------------------------------------
  // CORE UPDATE FUNCTION
  // ---------------------------------------------------------
  function update(source) {
      
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.links();

      // --- LAYOUT OVERRIDE ---
      nodes.forEach(d => {
          d.r = sizeScale(d.data.value); 
          
          if (d.depth === 0) {
              d.y = 0; 
          } else if (d.depth === 1) {
              d.y = radius * 0.50; 
          } else {
              d.y = radius * 0.95; 
          }
      });

      // A. CAMERA PAN LOGIC
      const expandedCategory = root.children ? root.children.find(d => d.children) : null;
      
      let newTx = width / 2;
      let newTy = height / 2;

      if (expandedCategory) {
          const angle = expandedCategory.x - Math.PI / 2;
          const moveDistance = radius * 0.25; 
          newTx = (width / 2) - (Math.cos(angle) * moveDistance);
          newTy = (height / 2) - (Math.sin(angle) * moveDistance);
      }

      g.transition().duration(duration)
       .attr("transform", `translate(${newTx},${newTy})`);


      // B. NODES
      const node = g.selectAll('g.node')
          .data(nodes, d => d.data.name);

      const nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `rotate(${source.x0 * 180 / Math.PI - 90}) translate(${source.y0},0)`);

      nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style("fill", d => getNodeColor(d))
          .style("stroke", "#fff")
          .style("stroke-width", 1.5)
          .style("cursor", "default")
          .on("mouseover", (event, d) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);

      // --- LABEL LOGIC (ADAPTIVE) ---
      
      const getLabelX = (d) => {
          const padding = 5; // Ridotto padding
          const offset = d.r + padding; 
          return d.x < Math.PI === !d.children ? offset : -offset;
      };

      // 1. Outline
      nodeEnter.append('text')
          .attr("class", "outline")
          .attr("dy", "0.31em")
          .attr("x", d => getLabelX(d))
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .style("font-size", `${FONT_SIZE}px`)
          .style("font-weight", "bold")
          .style("stroke", "white")
          .style("stroke-width", 3)
          .style("opacity", 0);

      // 2. Text
      nodeEnter.append('text')
          .attr("class", "main-label")
          .attr("dy", "0.31em")
          .attr("x", d => getLabelX(d))
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .style("font-size", `${FONT_SIZE}px`)
          .style("font-weight", "bold")
          .style("fill", COLORS.textPrimary)
          .style("opacity", 0);

      // UPDATE NODES
      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition().duration(duration)
          .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

      nodeUpdate.select('circle')
          .transition().duration(duration)
          .attr('r', d => d.r) 
          .style("fill", d => getNodeColor(d));

      // Applicazione Testo con Smart Truncate (Tolleranza Aumentata)
      nodeUpdate.selectAll('text')
          .each(function(d) {
              const el = d3.select(this);
              const fullName = d.data.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              // Calcola spazio disponibile
              const angle = d.x - Math.PI / 2;
              
              // Spingiamo i margini al limite (5px dal bordo invece di 20)
              const edgePadding = 5; 
              
              const kx = (width / 2 - edgePadding) / Math.abs(Math.cos(angle)); 
              const ky = (height / 2 - edgePadding) / Math.abs(Math.sin(angle));
              const maxDist = Math.min(kx, ky);
              
              // Aggiungiamo una tolleranza extra (es. +15px) per permettere al testo di andare un pelo oltre o riempire spazi vuoti
              const tolerance = 15;
              const availableWidth = Math.max(0, maxDist - d.y - d.r - 5 + tolerance);
              
              smartTruncate(el, fullName, availableWidth);
          })
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .attr("x", d => getLabelX(d))
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .transition().duration(duration)
          .style("opacity", d => {
              if (d.depth === 2) return 1;
              return 0; 
          });

      // EXIT
      const nodeExit = node.exit().transition().duration(duration)
          .attr('transform', d => `rotate(${source.x * 180 / Math.PI - 90}) translate(${source.y},0)`)
          .remove();

      nodeExit.select('circle').attr('r', 1e-6);
      nodeExit.selectAll('text').style('opacity', 1e-6);

      // C. LINKS
      const link = g.selectAll('path.link')
          .data(links, d => d.target.data.name);

      const linkEnter = link.enter().insert('path', "g")
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1.5)
          .attr('d', d => {
              const o = {x: source.x0, y: source.y0};
              return d3.linkRadial().angle(d => o.x).radius(d => o.y)({source: o, target: o});
          });

      const linkUpdate = linkEnter.merge(link);
      linkUpdate.transition().duration(duration)
          .attr('d', d3.linkRadial().angle(d => d.x).radius(d => d.y));

      link.exit().transition().duration(duration)
          .attr('d', d => {
              const o = {x: source.x, y: source.y};
              return d3.linkRadial().angle(d => o.x).radius(d => o.y)({source: o, target: o});
          })
          .remove();

      nodes.forEach(d => {
          d.x0 = d.x;
          d.y0 = d.y;
      });
  }

  // --- HELPERS ---

  function smartTruncate(textEl, str, maxWidth) {
      textEl.text(str);
      let computedLen = textEl.node().getComputedTextLength();
      
      if (computedLen === 0) {
          // Stima più conservativa (5.5px per char) per evitare falsi positivi
          computedLen = str.length * 5.5;
      }

      if (computedLen <= maxWidth) return;

      let len = str.length;
      while (len > 0 && computedLen > maxWidth) {
          len--;
          const substr = str.substring(0, len) + "..";
          textEl.text(substr);
          computedLen = textEl.node().getComputedTextLength();
          if (computedLen === 0) computedLen = substr.length * 5.5; 
      }
  }

  function getNodeColor(d) {
      if (d.depth === 0) return "#555";
      if (d.depth === 1) {
          const c = colorMap[d.data.name] || "#999";
          return (d.data.name === choice || d.parent?.data.name === choice) ? c : "#ccc"; 
      }
      if (d.depth === 2) {
          const parentColor = colorMap[d.parent.data.name] || "#999";
          return (d.parent.data.name === choice) ? parentColor : "#ccc";
      }
      return "#ccc";
  }

  // --- TOOLTIP LOGIC ---
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
      .style("font-size", `${Math.max(8, FONT_SIZE - 2)}px`)
      .style("fill", "#333");

  function showTooltip(event, d) {
      tooltipGroup.style("display", null);
      tooltipText.text(""); 

      const title = d.data.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").style("font-weight", "bold").text(title);

      let typeLabel = "";
      if (d.depth === 0) typeLabel = "Root";
      else if (d.depth === 1) typeLabel = "Category";
      else if (d.depth === 2) typeLabel = "Subtype";

      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").style("font-style", "italic").style("fill", "#666").text(typeLabel);

      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").text("Attacks: ");
      tooltipText.append("tspan").style("font-weight", "bold").text(d.data.value);

      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 16).attr("height", bbox.height + 10);
      moveTooltip(event);
  }

  function moveTooltip(event) {
      const [mx, my] = d3.pointer(event, svg.node());
      const offset = 10;
      
      const bgWidth = parseFloat(tooltipRect.attr("width"));
      const bgHeight = parseFloat(tooltipRect.attr("height"));

      let tx = mx + offset;
      let ty = my + offset;

      if (tx + bgWidth > width) tx = mx - bgWidth - offset;
      if (ty + bgHeight > height) ty = my - bgHeight - offset;
      
      if (tx < 0) tx = offset;
      if (ty < 0) ty = offset;

      tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
  }

  function hideTooltip() { 
      tooltipGroup.style("display", "none"); 
  }
}