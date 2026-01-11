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
  
  svg
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  // Non trasliamo più al centro, lavoriamo con coordinate assolute 0,0
  const g = svg.append('g');

  const FONT_SIZE = (typeof chartLabelFontSize !== 'undefined') ? chartLabelFontSize - 1 : 9;
  const duration = 750;

  // 2. DATA PREP
  const rawData = JSON.parse(JSON.stringify(data[choice]));
  const root = d3.hierarchy(rawData);

  // 3. COLORS
  const colorMap = {};
  const CATEGORIES_LIST = ["military_police", "government", "business", "citizens", "transportations"];
  CATEGORIES_LIST.forEach((key, i) => {
      colorMap[key] = COLORS.targetColors[i % COLORS.targetColors.length];
  });

  // SIZE SCALE
  const maxValue = d3.max(root.descendants(), d => d.data.value);
  const sizeScale = d3.scaleSqrt().domain([0, maxValue]).range([4, 15]); 

  // 4. MANUAL LAYOUT CALCULATION (Left-to-Right Fixed Positions)
  
  // A. Root Node (Fixed Left Center)
  root.x = height * 0.1;
  root.y = width * 0.333; // 15% from left

  // B. Categories (Level 1)
  // Vogliamo 5 categorie allineate verticalmente al centro (50% width)
  // La categoria SCELTA deve essere al centro (indice 2 su 0-4)
  if (root.children) {
      const cats = root.children;
      const totalCats = cats.length; // Dovrebbe essere 5
      
      // Troviamo l'indice della scelta attuale
      const choiceIndex = cats.findIndex(d => d.data.name === choice);
      
      // Riordiniamo l'array 'cats' affinché 'choice' sia al centro visivo?
      // Oppure calcoliamo le posizioni in modo che choice finisca a y = height/2.
      // Facciamo un sort personalizzato: mettiamo choice al centro dell'array.
      // Esempio target ordine: [0, 1, CHOICE, 3, 4]
      
      // Creiamo un nuovo array ordinato per la visualizzazione
      let orderedCats = [];
      const others = cats.filter(d => d.data.name !== choice);
      
      // Logica semplice: prendi metà degli altri, poi choice, poi il resto
      const half = Math.floor(others.length / 2);
      orderedCats = [...others.slice(0, half), cats[choiceIndex], ...others.slice(half)];
      
      // Assegniamo coordinate
      const availableH = height * 0.8; // Usiamo 80% dell'altezza
      const startY = (height - availableH) / 2;
      const stepY = availableH / (totalCats - 1 || 1);

      orderedCats.forEach((node, i) => {
          node.x = startY + i * stepY; // x è verticale in d3 tree logic, ma qui usiamo x come verticale per coerenza mentale?
          // ATTENZIONE: In SVG standard x=orizzontale, y=verticale.
          // Nel codice precedente usavamo tree radiale. Qui usiamo cartesiano.
          // Usiamo x per orizzontale e y per verticale.
          
          node.y = startY + i * stepY; // Coordinata Y verticale
          node.x = width * 0.25;        // Coordinata X orizzontale (centro)
          
          // Importante: sovrascriviamo l'oggetto originale in 'root.children' con le nuove coordinate?
          // orderedCats contiene riferimenti agli oggetti in root.children, quindi sì.
      });

      // C. Subcategories (Level 2) - Solo per la scelta
      // Devono essere espansi a destra della scelta
      const choiceNode = cats[choiceIndex];
      if (choiceNode.children) {
          const subs = choiceNode.children;
          const totalSubs = subs.length;
          
          // Ventaglio a destra (85% width)
          // Centrato verticalmente sulla posizione della categoria scelta (che è height/2 se tutto va bene)
          const subStartY = choiceNode.y - (availableH * 0.25); // Un po' più compatti
          const subStepY = (availableH * 0.5) / (totalSubs - 1 || 1);

          subs.forEach((sub, i) => {
              sub.x = width * 0.4; // A destra
              sub.y = subStartY + i * subStepY;
          });
      }
  }

  // Flatten nodes for drawing
  const nodes = root.descendants();
  const links = root.links();

  // Filtriamo i link: mostriamo solo quelli verso le categorie, e dalla scelta ai sottotipi.
  // Gli altri sottotipi (se esistono nei dati ma non posizionati) avranno coordinate undefined o vecchie.
  // Il nostro layout manuale ha toccato solo i nodi visibili.
  // Filtriamo nodes che hanno x e y definiti.
  const visibleNodes = nodes.filter(d => d.x !== undefined && d.y !== undefined);
  const visibleLinks = links.filter(l => l.source.x !== undefined && l.target.x !== undefined);

  update(visibleNodes, visibleLinks);

  // ---------------------------------------------------------
  // RENDER FUNCTION
  // ---------------------------------------------------------
  function update(nodes, links) {
      
      // A. LINKS (Bezier orizzontale)
      const linkGen = d3.linkHorizontal()
          .x(d => d.x)
          .y(d => d.y);

      g.selectAll('path.link')
          .data(links)
          .join('path')
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1.5)
          .attr("d", linkGen)
          .transition().duration(duration)
          .attr("d", linkGen); // Animazione se ci fosse cambio stato, qui è statico ma fluido al resize

      // B. NODES
      const nodeGroups = g.selectAll('g.node')
          .data(nodes, d => d.data.name)
          .join(
              enter => {
                  const grp = enter.append('g').attr('class', 'node');
                  grp.attr("transform", d => `translate(${d.x},${d.y})`);
                  grp.append('circle').attr('r', 0); // Animazione raggio
                  grp.append('text').attr('class', 'outline').style('opacity', 0);
                  grp.append('text').attr('class', 'main').style('opacity', 0);
                  return grp;
              },
              update => update,
              exit => exit.remove()
          );

      // Transizione posizione
      nodeGroups.transition().duration(duration)
          .attr("transform", d => `translate(${d.x},${d.y})`);

      // Cerchi
      nodeGroups.select('circle')
          .transition().duration(duration)
          .attr('r', d => sizeScale(d.data.value))
          .style("fill", d => getNodeColor(d))
          .style("stroke", "#fff")
          .style("stroke-width", 2)
          .style("cursor", "default");

      // Eventi Mouse (riattaccati per sicurezza su merge)
      nodeGroups.select('circle')
          .on("mouseover", (event, d) => showTooltip(event, d))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);

      // --- LABELS ---
      // Posizionamento testo: 
      // Root -> Sopra/Sotto? O nascosto.
      // Categorie -> Sopra/Sotto il nodo per non coprire il link?
      // Sottotipi -> A destra del nodo.
      
      nodeGroups.each(function(d) {
          const grp = d3.select(this);
          const r = sizeScale(d.data.value);
          const label = getLabelText(d);
          
          let dx = 0;
          let dy = 0;
          let anchor = "middle";

          if (d.depth === 0) {
              // Root: Label non richiesta ("nascosta" o sotto)
              // Richiesta precedente: "rimuovi quella di root" -> return empty string in helper
          } else if (d.depth === 1) {
              // Categorie: Testo sotto il cerchio per pulizia
              dy = r + 10;
              anchor = "middle";
          } else if (d.depth === 2) {
              // Sottotipi: Testo a destra
              dx = r + 8;
              dy = 4; // Centrato verticalmente approx
              anchor = "start";
          }

          // Update Outline
          grp.select('.outline')
              .text(label)
              .attr("dx", dx)
              .attr("dy", dy)
              .attr("text-anchor", anchor)
              .style("font-size", `${FONT_SIZE}px`)
              .style("font-weight", "bold")
              .style("stroke", "white")
              .style("stroke-width", 3)
              .transition().duration(duration)
              .style("opacity", 1); // Sempre visibili ora che sono ben spaziati

          // Update Main Text
          grp.select('.main')
              .text(label)
              .attr("dx", dx)
              .attr("dy", dy)
              .attr("text-anchor", anchor)
              .style("font-size", `${FONT_SIZE}px`)
              .style("font-weight", "bold")
              .style("fill", COLORS.textPrimary)
              .transition().duration(duration)
              .style("opacity", 1);
      });
  }

  // --- HELPERS ---

  function getLabelText(d) {
      if (d.depth === 0) return ""; 
      const name = d.data.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Accorcia se troppo lungo, ma ora abbiamo spazio orizzontale per i sottotipi
      const maxLen = d.depth === 2 ? 37 : 45; 
      if (name.length > maxLen) return name.substring(0, maxLen-2) + "..";
      return name;
  }

  function getNodeColor(d) {
      if (d.depth === 0) return "#555";
      if (d.depth === 1) {
          const c = colorMap[d.data.name] || "#999";
          // Sbiadisci le non-scelte
          return (d.data.name === choice) ? c : "#ddd"; 
      }
      if (d.depth === 2) {
          // I sottotipi ereditano dal genitore (che è la scelta)
          return colorMap[d.parent.data.name] || "#999";
      }
      return "#ccc";
  }

  // --- TOOLTIP LOGIC ---
  const tooltipGroup = svg.append("g").style("display", "none").style("pointer-events", "none");
  const tooltipRect = tooltipGroup.append("rect").attr("fill", "rgba(255, 255, 255, 0.95)").attr("stroke", "#ccc").attr("stroke-width", 1).attr("rx", 4).style("filter", "drop-shadow(2px 2px 3px rgba(0,0,0,0.2))");
  const tooltipText = tooltipGroup.append("text").attr("x", 0).attr("y", 0).style("font-size", `${Math.max(8, FONT_SIZE - 1)}px`).style("fill", "#333");

  function showTooltip(event, d) {
      tooltipGroup.style("display", null);
      tooltipText.text(""); 

      const title = d.data.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").style("font-weight", "bold").text(title);

      let typeLabel = d.depth === 0 ? "Root" : (d.depth === 1 ? "Category" : "Subtype");
      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").style("font-style", "italic").style("fill", "#666").text(typeLabel);
      
      tooltipText.append("tspan").attr("x", 8).attr("dy", "1.1em").text(`Attacks: ${d.data.value}`);

      const bbox = tooltipText.node().getBBox();
      tooltipRect.attr("width", bbox.width + 16).attr("height", bbox.height + 10);
      moveTooltip(event);
  }

  function moveTooltip(event) {
      const [mx, my] = d3.pointer(event, svg.node());
      let tx = mx + 15;
      let ty = my + 15;
      
      const bgW = parseFloat(tooltipRect.attr("width"));
      const bgH = parseFloat(tooltipRect.attr("height"));

      if (tx + bgW > width) tx = mx - bgW - 10;
      if (ty + bgH > height) ty = my - bgH - 10;
      
      tooltipGroup.attr("transform", `translate(${tx}, ${ty})`);
  }

  function hideTooltip() { tooltipGroup.style("display", "none"); }
}