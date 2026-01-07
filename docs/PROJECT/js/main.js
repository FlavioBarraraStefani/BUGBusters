const API_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
const authStatusEl = document.getElementById("auth-status");
const tokenInputEl = document.getElementById("github-token");
const authSectionEl = document.getElementById("api-auth");
// Define as an array of tuples (key, value), allowing for key duplicates

// Category definitions
const CATEGORIES = {
  group: ['SL', 'taliban', 'ISIL'],
  attack: ['explosion', 'armed_assault', 'assassination', 'hostage_taking', 'infrastructure_attack'],
  target: ['military_police', 'government', 'business', 'citizens', 'transportations']
};

const COLORS = {
  // Structured color definitions
  GLOBE: {
    ocean: "rgba(200, 209, 211, 0.84)",
    //ocean: '#b4dbe7ff',
    country: {
      stroke: "#171717ff",
      fill: "#f4f3f3ff"
    },
    hexbin: {
      colormap: [
        "#fcfdbf", "#fb9f3a", "#ed7953", "#d8576b", "#bc3f85",
        "#9e2f7f", "#7c1f6d", "#5c126e", "#3b0f70", "#1c1044",
        "#000004" //magma
      ]
    }
  },

  RIGHT_CHART:{
    axisLine: '#05253fff',    //axes
    textPrimary: '#1565C0', //labels
  },

  //EACH CATEGORY COLOR SET
  groupColors: [
    '#42A5F5',
    '#66BB6A', 
    '#EF5350'
  ],
  attackColors: [
    '#E15759',
    '#F28E2B',
    '#9467BD',
    '#59A14F',
    '#D37295' 
  ],  
  targetColors: [
    '#FF8A80', 
    '#90CAF9', 
    '#80DEEA', 
    '#FFCC80', 
    '#CE93D8'
  ],
  defaultComparison: '#78909C',

  //COMMON COLORS
  axisLine: '#64B5F6',    //axes
  textPrimary: '#1565C0', //labels
}

//FONT SIZE OF EACH CHART LABEL
const labelFontSize = 16//px
const chartLabelFontSize = 10//px
const isSmallScreen = () => window.innerWidth < 576;
const isXLScreen = () => window.innerWidth >= 1200;

// Aspect ratio 3:2 (width:height)
const CHART_WIDTH = 300;
const CHART_HEIGHT = 200;
const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };

// -------------------------------
// Token Validation
// -------------------------------
async function validateToken(token) {
  token = token || tokenInputEl?.value.trim();
  if (!token) {
    showAuthSection();
    return false;
  }

  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `token ${token}` }
    });

    if (!res.ok) throw new Error("Invalid token or access denied");

    localStorage.setItem("github_token", token);
    document.body.classList.add("authenticated");
    hideAuthSection();

    // Scroll to first private section
    const firstPrivateSection = document.querySelector('.private-section');
    if (firstPrivateSection) {
      setTimeout(() => firstPrivateSection.scrollIntoView({ behavior: 'smooth' }), 300);
    }

    // Load charts automatically after token is validated
    await initChartsAfterAuth();

    return true;

  } catch (err) {
    localStorage.removeItem("github_token");
    document.body.classList.remove("authenticated");
    showAuthSection();
    if (authStatusEl) {
      authStatusEl.className = "alert alert-danger mb-3";
      authStatusEl.textContent = "Authentication failed: " + err.message;
    }
    //throw err;
    return false;
  }
}

function showAuthSection() {
  if (authSectionEl) {
    authSectionEl.style.display = 'block';
    document.body.classList.remove('authenticated');
  }
}

function hideAuthSection() {
  if (authSectionEl) {
    authSectionEl.style.display = 'none';
    document.body.classList.add('authenticated');
  }
}

// -------------------------------
// Initial check for cached token
// -------------------------------
(async function () {
  const savedToken = localStorage.getItem("github_token");
  if (savedToken) {
    hideAuthSection();
    if (authStatusEl) authStatusEl.textContent = "Checking saved token...";
    const isValid = await validateToken(savedToken);
    if (!isValid) showAuthSection();
  } else {
    showAuthSection();
  }
})();

// -------------------------------
// Load Chart Function
// -------------------------------
const loadChart = (function () {
  const BASE_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
  const cache = new Map();

  return async function (filePath, chartFunc, choice, containerId) {
    const token = localStorage.getItem("github_token");
    const cacheKey = Array.isArray(filePath) ? filePath.join('|') : filePath;

    try {
      if (!cache.has(cacheKey)) {
        let rawData;
        if (Array.isArray(filePath)) {
          const allData = [];
          for (const path of filePath) {
            const url = `${BASE_URL}/${path}`;
            const res = await fetch(url, { headers: token ? { Authorization: `token ${token}` } : {} });
            if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.statusText}`);

            const decodedContent = atob((await res.json()).content.replace(/\n/g, ''));
            let data;
            if (path.endsWith('.json')) {
              data = JSON.parse(decodedContent);
            } else if (path.endsWith('.csv')) {
              // Simple CSV parser: assumes comma-separated, first line is headers
              const lines = decodedContent.split('\n').filter(line => line.trim());
              if (lines.length < 1) throw new Error('CSV file is empty');
              const headers = lines[0].split(',').map(h => h.trim());
              data = lines.slice(1).map(line => {
                const values = line.split(',');
                const obj = {};
                headers.forEach((header, i) => {
                  obj[header] = values[i] ? values[i].trim() : '';
                });
                return obj;
              });
            } else {
              throw new Error(`Unsupported file format for ${path}`);
            }
            allData.push(data);
          }
          rawData = allData.flat();
        } else {
          const url = `${BASE_URL}/${filePath}`;
          const res = await fetch(url, { headers: token ? { Authorization: `token ${token}` } : {} });
          if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.statusText}`);

          const decodedContent = atob((await res.json()).content.replace(/\n/g, ''));
          if (filePath.endsWith('.json')) {
            rawData = JSON.parse(decodedContent);
          } else if (filePath.endsWith('.csv')) {
            // Simple CSV parser: assumes comma-separated, first line is headers
            const lines = decodedContent.split('\n').filter(line => line.trim());
            if (lines.length < 1) throw new Error('CSV file is empty');
            const headers = lines[0].split(',').map(h => h.trim());
            rawData = lines.slice(1).map(line => {
              const values = line.split(',');
              const obj = {};
              headers.forEach((header, i) => {
                obj[header] = values[i] ? values[i].trim() : '';
              });
              return obj;
            });
          } else {
            throw new Error(`Unsupported file format for ${filePath}`);
          }
        }
        cache.set(cacheKey, rawData);
      }

      const rawData = cache.get(cacheKey);
      await chartFunc(rawData, choice, containerId);

    } catch (err) {
      console.error(`Error loading chart for ${containerId}:`, err);
    }
  };
})();

// -------------------------------
// Function to load all charts after authentication
// -------------------------------
async function initChartsAfterAuth() {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingProgress = document.getElementById('loading-progress');
  const mainContent = document.getElementById('main-content');
  const header = document.getElementById('main-header');
  const globeColorMap = document.getElementById('globe_color_map');


  // Show loading overlay
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
  const loadingContent = document.getElementById('loading-content');
  const errorContent = document.getElementById('error-content');
  if (loadingContent) loadingContent.style.display = 'flex';
  if (errorContent) errorContent.style.display = 'none';
  if (mainContent) { mainContent.style.display = 'none'; mainContent.style.opacity = 0; }
  if (header) { header.style.display = 'none'; header.style.opacity = 0; }
  if (globeColorMap) { globeColorMap.style.display = 'none'; globeColorMap.style.opacity = 0; }
  // Explicitly define ALL charts to load (main page + all modal charts)
  const chartsToLoad = [
    // ===== GROUP CATEGORY =====
    // Note: We use the SAME file for all 3 because the JSON contains keys for each choice
    { file: 'PROJECT/GROUPS/groups_temporal_cumulative.json', func: draw_group_1, choice: 'ISIL', container: 'plot_group_ISIL_1' },
    { file: 'PROJECT/GROUPS/groups_temporal_cumulative.json', func: draw_group_1, choice: 'taliban', container: 'plot_group_taliban_1' },
    { file: 'PROJECT/GROUPS/groups_temporal_cumulative.json', func: draw_group_1, choice: 'SL', container: 'plot_group_SL_1' },

    { file: 'PROJECT/GROUPS/groups_regional_activity.json', func: draw_group_2, choice: 'ISIL', container: 'plot_group_ISIL_2' },
    { file: 'PROJECT/GROUPS/groups_regional_activity.json', func: draw_group_2, choice: 'taliban', container: 'plot_group_taliban_2' },
    { file: 'PROJECT/GROUPS/groups_regional_activity.json', func: draw_group_2, choice: 'SL', container: 'plot_group_SL_2' },
    
    { file: 'PROJECT/GROUPS/groups_flows.json', func: draw_group_3, choice: 'ISIL', container: 'plot_group_ISIL_3' },
    { file: 'PROJECT/GROUPS/groups_flows.json', func: draw_group_3, choice: 'taliban', container: 'plot_group_taliban_3' },
    { file: 'PROJECT/GROUPS/groups_flows.json', func: draw_group_3, choice: 'SL', container: 'plot_group_SL_3' },

    { file: 'PROJECT/GROUPS/groups_bump_data.json', func: draw_group_4, choice: 'ISIL', container: 'plot_group_ISIL_4' },
    { file: 'PROJECT/GROUPS/groups_bump_data.json', func: draw_group_4, choice: 'taliban', container: 'plot_group_taliban_4' },
    { file: 'PROJECT/GROUPS/groups_bump_data.json', func: draw_group_4, choice: 'SL', container: 'plot_group_SL_4' },

    { file: 'PROJECT/GROUPS/groups_casualty_bins.json', func: draw_group_5, choice: 'ISIL', container: 'plot_group_ISIL_5' },
    { file: 'PROJECT/GROUPS/groups_casualty_bins.json', func: draw_group_5, choice: 'taliban', container: 'plot_group_taliban_5' },
    { file: 'PROJECT/GROUPS/groups_casualty_bins.json', func: draw_group_5, choice: 'SL', container: 'plot_group_SL_5' },

    // ===== ATTACK CATEGORY =====
    // For each choice in ['explosion', 'armed_assault', 'assassination', 'hostage_taking', 'infrastructure_attack']
    { file: 'PROJECT/ATTACKS/radar_chart.json', func: draw_attack_1, choice: 'explosion', container: 'plot_attack_explosion_1' },
    { file: 'PROJECT/ATTACKS/radar_chart.json', func: draw_attack_1, choice: 'armed_assault', container: 'plot_attack_armed_assault_1' },
    { file: 'PROJECT/ATTACKS/radar_chart.json', func: draw_attack_1, choice: 'assassination', container: 'plot_attack_assassination_1' },
    { file: 'PROJECT/ATTACKS/radar_chart.json', func: draw_attack_1, choice: 'hostage_taking', container: 'plot_attack_hostage_taking_1' },
    { file: 'PROJECT/ATTACKS/radar_chart.json', func: draw_attack_1, choice: 'infrastructure_attack', container: 'plot_attack_infrastructure_attack_1' },

    { file: 'PROJECT/ATTACKS/rose_chart.json', func: draw_attack_2, choice: 'explosion', container: 'plot_attack_explosion_2' },
    { file: 'PROJECT/ATTACKS/rose_chart.json', func: draw_attack_2, choice: 'armed_assault', container: 'plot_attack_armed_assault_2' },
    { file: 'PROJECT/ATTACKS/rose_chart.json', func: draw_attack_2, choice: 'assassination', container: 'plot_attack_assassination_2' },
    { file: 'PROJECT/ATTACKS/rose_chart.json', func: draw_attack_2, choice: 'hostage_taking', container: 'plot_attack_hostage_taking_2' },
    { file: 'PROJECT/ATTACKS/rose_chart.json', func: draw_attack_2, choice: 'infrastructure_attack', container: 'plot_attack_infrastructure_attack_2' },
    
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_3, choice: 'explosion', container: 'plot_attack_explosion_3' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_3, choice: 'armed_assault', container: 'plot_attack_armed_assault_3' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_3, choice: 'assassination', container: 'plot_attack_assassination_3' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_3, choice: 'hostage_taking', container: 'plot_attack_hostage_taking_3' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_3, choice: 'infrastructure_attack', container: 'plot_attack_infrastructure_attack_3' },

    { file: 'comparing_categories/bar_chart.json', func: draw_attack_4, choice: 'explosion', container: 'plot_attack_explosion_4' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_4, choice: 'armed_assault', container: 'plot_attack_armed_assault_4' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_4, choice: 'assassination', container: 'plot_attack_assassination_4' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_4, choice: 'hostage_taking', container: 'plot_attack_hostage_taking_4' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_4, choice: 'infrastructure_attack', container: 'plot_attack_infrastructure_attack_4' },

    { file: 'comparing_categories/bar_chart.json', func: draw_attack_5, choice: 'explosion', container: 'plot_attack_explosion_5' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_5, choice: 'armed_assault', container: 'plot_attack_armed_assault_5' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_5, choice: 'assassination', container: 'plot_attack_assassination_5' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_5, choice: 'hostage_taking', container: 'plot_attack_hostage_taking_5' },
    { file: 'comparing_categories/bar_chart.json', func: draw_attack_5, choice: 'infrastructure_attack', container: 'plot_attack_infrastructure_attack_5' },
    /*
        // ===== TARGET CATEGORY =====
        // For each choice in ['military_police', 'government', 'business', 'citizens', 'transportations']
        { file: 'comparing_categories/bar_chart.json', func: draw_target_1, choice: 'military_police', container: 'plot_target_military_police_1' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_1, choice: 'government', container: 'plot_target_government_1' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_1, choice: 'business', container: 'plot_target_business_1' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_1, choice: 'citizens', container: 'plot_target_citizens_1' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_1, choice: 'transportations', container: 'plot_target_transportations_1' },
    
        { file: 'comparing_categories/bar_chart.json', func: draw_target_2, choice: 'military_police', container: 'plot_target_military_police_2' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_2, choice: 'government', container: 'plot_target_government_2' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_2, choice: 'business', container: 'plot_target_business_2' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_2, choice: 'citizens', container: 'plot_target_citizens_2' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_2, choice: 'transportations', container: 'plot_target_transportations_2' },
    
        { file: 'comparing_categories/bar_chart.json', func: draw_target_3, choice: 'military_police', container: 'plot_target_military_police_3' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_3, choice: 'government', container: 'plot_target_government_3' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_3, choice: 'business', container: 'plot_target_business_3' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_3, choice: 'citizens', container: 'plot_target_citizens_3' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_3, choice: 'transportations', container: 'plot_target_transportations_3' },
    
        { file: 'comparing_categories/bar_chart.json', func: draw_target_4, choice: 'military_police', container: 'plot_target_military_police_4' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_4, choice: 'government', container: 'plot_target_government_4' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_4, choice: 'business', container: 'plot_target_business_4' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_4, choice: 'citizens', container: 'plot_target_citizens_4' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_4, choice: 'transportations', container: 'plot_target_transportations_4' },
    
        { file: 'comparing_categories/bar_chart.json', func: draw_target_5, choice: 'military_police', container: 'plot_target_military_police_5' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_5, choice: 'government', container: 'plot_target_government_5' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_5, choice: 'business', container: 'plot_target_business_5' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_5, choice: 'citizens', container: 'plot_target_citizens_5' },
        { file: 'comparing_categories/bar_chart.json', func: draw_target_5, choice: 'transportations', container: 'plot_target_transportations_5' },
    */
    // ===== MAIN PAGE CHARTS =====
    { file: "PROJECT/CATEGORIES/globe.json", func: (data) => { window.globe_data = data }, choice: null, container: "body" },
    {
      file: [
        "PROJECT/CATEGORIES/default_float_1.csv",
        "PROJECT/CATEGORIES/default_float_2.csv",
        "PROJECT/CATEGORIES/default_float_3.csv",
      ],
      func: (data) => {
        precomputeGlobeData(data);
        precomputeColormap();
      }, choice: null, container: "body"
    },
    {
      file: 
        "PROJECT/CATEGORIES/globe_categories.json",
      func: (data) => {
        precomputeTargetData(data);
      }, choice: null, container: "body"
    },


    //RIGHT CHART FILES
    { file: "PROJECT/CATEGORIES/groups.json", func: (data) => { 
      computeGroupCumulativeCountry(data);
      precompute_group(data) 
    }, choice: null, container: "body" },
    { file: "PROJECT/CATEGORIES/attacks_cumulative.csv", func: (data) => { 
      precompute_attack(data) 
    }, choice: null, container: "body" },
    { file: "PROJECT/CATEGORIES/target_bump_5.json", func: (data) => { 
      precompute_target(data) 
    }, choice: null, container: "body" },
  ];

  try {
    let completed = 0;
    const total = chartsToLoad.length;

    // Update progress helper
    const updateProgress = () => {
      const percent = Math.round((completed / total) * 100);
      if (loadingProgress) loadingProgress.textContent = `${percent}%`;
    };

    // Load all charts concurrently
    await Promise.all(
      chartsToLoad.map(async (chart) => {
        try {
          await loadChart(chart.file, chart.func, chart.choice, chart.container);
        } catch (err) {
          console.error(`Error loading chart ${chart.container}:`, err);
        } finally {
          completed++;
          updateProgress();
        }
      })
    );

    // Hide loading, show content
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (mainContent) {
      mainContent.style.display = 'block';
      mainContent.style.transition = 'opacity 1s';
      setTimeout(() => { mainContent.style.opacity = 1; }, 10);
    }
    if (globeColorMap) {
      globeColorMap.style.display = 'none';
      globeColorMap.style.opacity = '0';
      setTimeout(() => {
        globeColorMap.style.display = 'block';
        globeColorMap.style.opacity = '1';
      }, 1010);
    }


    if (header) {
      header.style.display = 'block';
      header.style.transition = 'opacity 1s';
      setTimeout(() => { header.style.opacity = 1; }, 10);
    }

    // Add resize listener
    window.addEventListener('resize', updateMainCanvases);
    // Set canvas sizes dynamically
    updateMainCanvases();

  } catch (err) {
    console.error('Error during initialization:', err);
    const loadingContent = document.getElementById('loading-content');
    const errorMessage = document.getElementById('error-message');
    if (loadingContent) loadingContent.style.display = 'none';
    if (errorContent) errorContent.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = err.message;
  }
}
