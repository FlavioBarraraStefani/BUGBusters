const API_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
const authStatusEl = document.getElementById("auth-status");
const tokenInputEl = document.getElementById("github-token");
const authSectionEl = document.getElementById("api-auth");

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

const loadChart = (function () {
  const BASE_URL = "https://api.github.com/repos/supernino02/BugBuster-project/contents";
  const cache = new Map();

  return async function (filePath, chartFunc, containerId) {
    const containerDiv = document.getElementById(containerId);
    if (!containerDiv) return;

    containerDiv.style.display = "none"; // hide until loaded
    const token = localStorage.getItem("github_token");

    try {
      if (!cache.has(filePath)) {
        const url = `${BASE_URL}/${filePath}`;
        const res = await fetch(url, { headers: token ? { Authorization: `token ${token}` } : {} });
        if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.statusText}`);
        const rawData = JSON.parse(atob((await res.json()).content.replace(/\n/g, '')));
        cache.set(filePath, rawData);
      }

      const rawData = cache.get(filePath);
      containerDiv.style.display = "block"; // show container
      chartFunc(rawData);

    } catch (err) {
      containerDiv.innerHTML = `<div class="alert alert-danger">Failed to load chart: ${err.message}</div>`;
      console.error(err);
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

  // Show loading overlay
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
  const loadingContent = document.getElementById('loading-content');
  const errorContent = document.getElementById('error-content');
  if (loadingContent) loadingContent.style.display = 'flex';
  if (errorContent) errorContent.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';

  // Define files to fetch from GitHub repo
  const filesToFetch = [
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    {path: 'network/sankey.json', handler: null},
    // Add your file paths here, e.g.:
    // { path: 'data/file1.json', handler: handleFile1 },
    // { path: 'data/file2.json', handler: handleFile2 },
  ];

  const token = localStorage.getItem('github_token');
  const BASE_URL = 'https://api.github.com/repos/supernino02/BugBuster-project/contents';
  const fetchedData = new Map();

  try {
    let completed = 0;
    const total = filesToFetch.length || 1;

    // Update progress helper
    const updateProgress = () => {
      const percent = Math.round((completed / total) * 100);
      if (loadingProgress) loadingProgress.textContent = `${percent}%`;
    };

    // Fetch all files concurrently
    if (filesToFetch.length > 0) {
      await Promise.all(
        filesToFetch.map(async (file) => {
          try {
            const url = `${BASE_URL}/${file.path}`;
            const res = await fetch(url, {
              headers: token ? { Authorization: `token ${token}` } : {}
            });
            if (!res.ok) throw new Error(`Failed to fetch ${file.path}`);
            const json = await res.json();
            const data = JSON.parse(atob(json.content.replace(/\n/g, '')));
            fetchedData.set(file.path, data);
          } catch (err) {
            console.error(`Error fetching ${file.path}:`, err);
          } finally {
            completed++;
            updateProgress();
          }
        })
      );

      // Call handlers with fetched data
      for (const file of filesToFetch) {
        if (file.handler && fetchedData.has(file.path)) {
          try {
            await file.handler(fetchedData.get(file.path));
          } catch (err) {
            console.error(`Error in handler for ${file.path}:`, err);
          }
        }
      }
    } else {
      // No files to fetch, simulate brief loading
      updateProgress();
      await new Promise(resolve => setTimeout(resolve, 500));
      completed = 1;
      updateProgress();
    }

    // Hide loading, show content
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';

    // Add resize listener
    window.addEventListener('resize', setCanvasSizes);
    // Set canvas sizes dynamically
    setCanvasSizes();

  } catch (err) {
    console.error('Error during initialization:', err);
    const loadingContent = document.getElementById('loading-content');
    const errorMessage = document.getElementById('error-message');
    if (loadingContent) loadingContent.style.display = 'none';
    if (errorMessage) errorMessage.textContent = err.message;
  }
}


