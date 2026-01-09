window.addEventListener('resize', () => { if (window._draw_target_2_lastCall) draw_target_2(...window._draw_target_2_lastCall); });

function draw_target_2(data, choice, containerId) {
  window._draw_target_2_lastCall = [data, choice, containerId];
  
  const container = d3.select(`#${containerId}`);
  if (container.empty()) return;
  
  const svg = container.select('svg');
  if (svg.empty()) return;

  svg.selectAll('*').remove();

  // 1. SETUP
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  // Aumentiamo leggermente il raggio base dato che ora abbiamo il panning dinamico
  const radius = Math.min(width, height) / 2 - 50; 

  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  // Gruppo principale (Camera)
  // Lo inizializziamo al centro
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize : 10;
  const duration = 750; // Animazione leggermente più lenta per il movimento della camera

  // 2. DATA PREP
  const rawData = JSON.parse(JSON.stringify(data[choice]));
  const hierarchy = d3.hierarchy(rawData);

  // 3. TREE CONFIG
  const tree = d3.tree()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  // 4. COLORS
  const colorMap = {};
  const CATEGORIES_LIST = ["military_police", "government", "business", "citizens", "transportations"];
  CATEGORIES_LIST.forEach((key, i) => {
      colorMap[key] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

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

  // Initial draw
  update(root);

  // ---------------------------------------------------------
  // CORE UPDATE FUNCTION
  // ---------------------------------------------------------
  function update(source) {
      
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.links();

      // A. CAMERA PAN LOGIC (Sposta la Radice)
      // Cerchiamo il nodo espanso
      const expandedCategory = root.children ? root.children.find(d => d.children) : null;
      
      let newTx = width / 2;
      let newTy = height / 2;

      if (expandedCategory) {
          // Se c'è un nodo espanso, spostiamo la radice nella direzione OPPOSTA
          // L'angolo d.x è in radianti, partendo da ore 12 (in D3 tree radial logic spesso ruotato)
          // La visualizzazione ruota di -90 gradi, quindi d.x=0 è ore 12.
          
          const angle = expandedCategory.x - Math.PI / 2; // Correggiamo rotazione cartesiana
          const moveDistance = radius * 0.4; // Quanto spostare (40% del raggio)

          // Calcoliamo lo spostamento inverso
          // Se il nodo è a destra (cos > 0), spostiamo la radice a sinistra (sottraiamo)
          newTx = (width / 2) - (Math.cos(angle) * moveDistance);
          newTy = (height / 2) - (Math.sin(angle) * moveDistance);
      }

      // Animazione della "Camera" (il gruppo g intero)
      g.transition().duration(duration)
       .attr("transform", `translate(${newTx},${newTy})`);


      // B. NODES
      const node = g.selectAll('g.node')
          .data(nodes, d => d.data.name);

      const nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `rotate(${source.x0 * 180 / Math.PI - 90}) translate(${source.y0},0)`)
          .on('click', click);

      nodeEnter.append('circle')
          .attr('r', 1e-6)
          .style("fill", d => getNodeColor(d))
          .style("stroke", "#fff")
          .style("stroke-width", 1.5)
          .style("cursor", d => d._children || d.children ? "pointer" : "default")
          .on("mouseover", (event, d) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);

      // Label Outline (Bianco)
      nodeEnter.append('text')
          .attr("class", "label-outline")
          .attr("dy", "0.31em")
          .attr("x", d => d.x < Math.PI === !d.children ? 10 : -10)
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .text(d => getLabelText(d))
          .style("font-size", d => d.depth === 0 ? "11px" : `${FONT_SIZE}px`)
          .style("fill", "none")
          .style("stroke", "white")
          .style("stroke-width", 3)
          .style("opacity", 0);

      // Label Text (Colore)
      nodeEnter.append('text')
          .attr("class", "label-text")
          .attr("dy", "0.31em")
          .attr("x", d => d.x < Math.PI === !d.children ? 10 : -10)
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .text(d => getLabelText(d))
          .style("font-size", d => d.depth === 0 ? "11px" : `${FONT_SIZE}px`)
          .style("font-weight", d => d.data.name === choice ? "bold" : "normal")
          .style("fill", COLORS.textPrimary)
          .style("opacity", 0);

      // UPDATE
      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition().duration(duration)
          .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

      nodeUpdate.select('circle')
          .attr('r', d => d.depth === 0 ? 8 : (d.depth === 2 ? 4 : 6))
          .style("fill", d => getNodeColor(d));

      // Gestione Opacità Labels (Clean View)
      nodeUpdate.selectAll('text')
          .text(d => getLabelText(d))
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .attr("x", d => d.x < Math.PI === !d.children ? 10 : -10)
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .transition().duration(duration)
          .style("opacity", d => {
              if (d.depth === 0) return 1; // Root
              if (d.depth === 2) return 1; // Sottotipi
              if (expandedCategory) {
                  // Se qualcosa è espanso, mostra solo label di quello
                  return d === expandedCategory ? 1 : 0;
              }
              return 1; // Panoramica: mostra tutto
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

  function getLabelText(d) {
      if (d.depth === 0) return "ALL";
      const name = d.data.name.replace(/_/g, ' '); 
      return name.length > 20 ? name.substring(0, 18) + "..." : name;
  }

  function getNodeColor(d) {
      if (d.depth === 0) return "#555";
      if (d.depth === 2) return "#e67e22"; 
      const c = colorMap[d.data.name] || "#999";
      return d._children ? d3.rgb(c).darker(0.3) : c;
  }

  function click(event, d) {
      // Click consentito solo su categorie (livello 1)
      if (d.depth !== 1) return;

      if (d.children) {
          d._children = d.children;
          d.children = null;
      } else {
          // Chiudi eventuali fratelli
          if (d.parent && d.parent.children) {
              d.parent.children.forEach(sibling => {
                  if (sibling !== d && sibling.children) {
                      sibling._children = sibling.children;
                      sibling.children = null;
                  }
              });
          }
          d.children = d._children;
          d._children = null;
      }
      update(d);
  }

  // Tooltip
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#333").attr("rx", 4);
  const tooltipText = tooltipGroup.append("text").attr("x", 5).attr("y", 12).style("font-size", `${FONT_SIZE-2}px`).style("fill", "#333");

  function showTooltip(event, d) {
      tooltipGroup.style("display", null);
      tooltipText.text(""); 
      const title = d.data.name.replace(/_/g, ' ');
      tooltipText.append("tspan").attr("x", 8).attr("dy", "0").style("font-weight", "bold").text(title);
      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.2em").text(`Attacks: ${d.data.value}`);
      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 16).attr("height", bbox.height + 10);
      moveTooltip(event);
  }

  function moveTooltip(event) {
      const [mx, my] = d3.pointer(event, svg.node());
      // In questo caso usiamo coordinate relative all'SVG intero, non al gruppo G traslato
      // poiché il tooltipGroup è appeso direttamente a svg e non a g.
      // D3.pointer su svg.node() restituisce le coordinate giuste.
      tooltipGroup.attr("transform", `translate(${mx + 15}, ${my + 15})`);
  }

  function hideTooltip() { tooltipGroup.style("display", "none"); }
}