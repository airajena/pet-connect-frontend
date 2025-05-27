const API_URL = 'http://localhost:5000/api';

// Global variables
let allAnimals = [];
let filteredAnimals = [];
let currentPage = 1;
const itemsPerPage = 12;
let userLocation = null;

// Admin variables
let allAdoptionsData = [];
let allAnimalsData = [];
let currentAction = null;
let currentAdoptionId = null;

// Page load handler
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  updateNavLinks(token);
  console.log('Page loaded:', window.location.pathname);
  
  // Initialize page-specific functionality
  initializePage();
});

// Initialize page-specific functionality
async function initializePage() {
  const pathname = window.location.pathname;
  
  if (pathname.endsWith('index.html') || pathname === '/') {
    fetchFeaturedAnimals();
  } else if (pathname.endsWith('find.html')) {
    await initializeFindPage();
  } else if (pathname.endsWith('adopt.html')) {
    fetchAnimalDetails();
    setupAdoptionForm();
  } else if (pathname.endsWith('list.html')) {
    setupListAnimalForm();
  } else if (pathname.endsWith('profile.html')) {
    fetchProfile();
  } else if (pathname.endsWith('contact.html')) {
    setupContactForm();
  } else if (pathname.endsWith('donate.html')) {
    setupDonateButton();
  } else if (pathname.endsWith('admin.html')) {
    checkAdminAccess();
  }
}

// Initialize Find a Pet page
async function initializeFindPage() {
  try {
    // Get user location if available
    await getUserLocationForSearch();
    
    // Fetch all animals initially
    await fetchAllAnimals();
    
    // Setup event listeners
    setupSearchForm();
    setupQuickFilters();
    setupAdvancedFilters();
    setupSortingAndPagination();
    
    console.log('Find page initialized successfully');
  } catch (error) {
    console.error('Error initializing find page:', error);
    showErrorMessage('Failed to load pets. Please refresh the page.');
  }
}

// Enhanced navigation update to show admin link for admins
function updateNavLinks(token) {
  const profileLink = document.getElementById('profileLink');
  const logoutLink = document.getElementById('logoutLink');
  const loginLink = document.getElementById('loginLink');
  const adminLink = document.getElementById('adminLink');

  if (token) {
    profileLink?.classList.remove('hidden');
    logoutLink?.classList.remove('hidden');
    loginLink?.classList.add('hidden');
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'admin' && adminLink) {
      adminLink.classList.remove('hidden');
    } else if (adminLink) {
      adminLink.classList.add('hidden');
    }
  } else {
    profileLink?.classList.add('hidden');
    logoutLink?.classList.add('hidden');
    loginLink?.classList.remove('hidden');
    if (adminLink) {
      adminLink.classList.add('hidden');
    }
  }
}

// Logout
function logout() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userLocation');
  updateNavLinks(null);
  window.location.href = 'index.html';
}

// Login modal
function showLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function hideLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

// Signup modal
function showSignupModal() {
  hideLoginModal();
  document.getElementById('signupModal').classList.remove('hidden');
}

function hideSignupModal() {
  document.getElementById('signupModal').classList.add('hidden');
}

// Get user location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          localStorage.setItem('userLocation', JSON.stringify(location));
          resolve(location);
        },
        (error) => {
          console.log('Geolocation error:', error);
          reject(error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      reject(new Error('Geolocation not supported'));
    }
  });
}

// Get user location for search functionality
async function getUserLocationForSearch() {
  try {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      userLocation = JSON.parse(savedLocation);
      return;
    }

    if (navigator.geolocation) {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });
      
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      localStorage.setItem('userLocation', JSON.stringify(userLocation));
      console.log('User location obtained:', userLocation);
    }
  } catch (error) {
    console.log('Location access denied or failed:', error);
  }
}

// Handle login
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('jwtToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          updateNavLinks(data.token);
          hideLoginModal();
          alert('Login successful!');
          
          // Try to get user location after login
          try {
            await getUserLocation();
          } catch (error) {
            console.log('Location access denied');
          }
          
          if (window.location.pathname.endsWith('list.html') || 
              window.location.pathname.endsWith('profile.html') || 
              window.location.pathname.endsWith('admin.html')) {
            window.location.reload();
          }
        } else {
          alert(data.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Error: ' + error.message);
      }
    });
  }
});

// Handle signup
document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;

      try {
        let signupData = { name, email, password };
        
        // Try to get location for signup
        try {
          const location = await getUserLocation();
          signupData.location = location;
        } catch (error) {
          console.log('Signing up without location');
        }

        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData),
        });
        
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('jwtToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          updateNavLinks(data.token);
          hideSignupModal();
          alert('Signup successful!');
          
          if (window.location.pathname.endsWith('list.html') || 
              window.location.pathname.endsWith('profile.html') || 
              window.location.pathname.endsWith('admin.html')) {
            window.location.reload();
          }
        } else {
          alert(data.message || 'Signup failed');
        }
      } catch (error) {
        console.error('Signup error:', error);
        alert('Error: ' + error.message);
      }
    });
  }
});

// Fetch featured animals (Home page)
async function fetchFeaturedAnimals() {
  try {
    console.log('Fetching featured animals...');
    const response = await fetch(`${API_URL}/animals?limit=3`);
    const data = await response.json();
    
    // Handle both old and new response formats
    const animals = data.animals || data;
    console.log('Animals data:', animals);
    
    if (typeof displayFeaturedAnimals === 'function') {
      displayFeaturedAnimals(animals);
    } else {
      const container = document.getElementById('featuredAnimals');
      if (container) {
        container.innerHTML = animals.length ? animals.map(animal => `
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden card-hover">
            <div class="relative">
              <img src="${animal.images && animal.images[0] || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" 
                   alt="${animal.name}" class="w-full h-64 object-cover">
              <div class="absolute top-4 left-4">
                <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  ${animal.species}
                </span>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-2xl font-bold text-gray-800 mb-2">${animal.name}</h3>
              <p class="text-gray-600 mb-2">
                <i class="fas fa-map-marker-alt mr-2"></i>${animal.address || 'Location not specified'}
              </p>
              <p class="text-gray-600 mb-4">
                ${animal.age ? Math.floor(animal.age / 12) + ' years ' + (animal.age % 12) + ' months' : 'Age unknown'} • ${animal.gender || 'Unknown'} • ${animal.breed || 'Mixed'}
              </p>
              <a href="adopt.html?id=${animal._id}" 
                 class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300 inline-block text-center">
                <i class="fas fa-heart mr-2"></i>Adopt ${animal.name}
              </a>
            </div>
          </div>
        `).join('') : '<div class="col-span-full text-center py-12"><p class="text-gray-600">No animals found.</p></div>';
      }
    }
  } catch (error) {
    console.error('Error fetching animals:', error);
    const container = document.getElementById('featuredAnimals');
    if (container) {
      container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-600">Error loading animals.</p></div>';
    }
  }
}



// Fetch all available animals (Find a Pet page)
async function fetchAllAnimals(queryParams = '') {
  try {
    console.log('Fetching animals with params:', queryParams);
    
    const response = await fetch(`${API_URL}/animals${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Animals API response:', data);
    
    // Handle both old and new response formats
    const animals = data.animals || data;
    allAnimals = animals;
    filteredAnimals = animals;
    
    displayAnimals(animals);
    updateResultsCount(animals.length);
    
  } catch (error) {
    console.error('Error fetching animals:', error);
    showErrorMessage('Failed to load pets. Please try again.');
  }
}

// Enhanced displayAnimals function with beautiful cards
function displayAnimals(animals) {
  const container = document.getElementById('animalList');
  
  if (!container) {
    console.error('Animal list container not found');
    return;
  }
  
  if (animals.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-search text-6xl text-gray-300 mb-6"></i>
        <h3 class="text-2xl font-bold text-gray-600 mb-4">No pets found</h3>
        <p class="text-gray-500 mb-8">Try adjusting your search filters to find more pets</p>
        <button onclick="clearFilters()" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = animals.map(animal => {
    const age = animal.age ? `${Math.floor(animal.age / 12)} years ${animal.age % 12} months` : 'Unknown age';
    const location = animal.address || 'Location not specified';
    const imageUrl = (animal.images && animal.images[0]) || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
    
    return `
      <div class="pet-card card-hover">
        <div class="relative">
          <img src="${imageUrl}" 
               alt="${animal.name}" 
               class="w-full h-64 object-cover"
               onerror="this.src='https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'">
          
          <!-- Status Badge -->
          <div class="absolute top-4 left-4">
            <span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
              Available
            </span>
          </div>
          
          <!-- Heart Button -->
          <button onclick="toggleFavorite('${animal._id}')" 
                  class="heart-btn absolute top-4 right-4 bg-white bg-opacity-90 p-3 rounded-full shadow-lg hover:bg-opacity-100">
            <i class="fas fa-heart text-gray-400 text-lg"></i>
          </button>
          
          <!-- Species Icon -->
          <div class="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-full">
            <span class="text-sm font-semibold text-gray-700">
              ${animal.species === 'dog' ? '🐕' : animal.species === 'cat' ? '🐱' : '🐾'} ${animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
            </span>
          </div>
        </div>
        
        <div class="p-6">
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-2xl font-bold text-gray-800">${animal.name}</h3>
            <span class="text-sm font-medium text-gray-500">${animal.gender || 'Unknown'}</span>
          </div>
          
          <div class="space-y-2 mb-4">
            <div class="flex items-center text-gray-600">
              <i class="fas fa-birthday-cake mr-2 text-blue-600"></i>
              <span>${age}</span>
            </div>
            <div class="flex items-center text-gray-600">
              <i class="fas fa-map-marker-alt mr-2 text-blue-600"></i>
              <span>${location}</span>
            </div>
            ${animal.breed ? `
            <div class="flex items-center text-gray-600">
              <i class="fas fa-dna mr-2 text-blue-600"></i>
              <span>${animal.breed}</span>
            </div>
            ` : ''}
            ${animal.healthStatus ? `
            <div class="flex items-center text-gray-600">
              <i class="fas fa-heartbeat mr-2 text-blue-600"></i>
              <span>${animal.healthStatus}</span>
            </div>
            ` : ''}
          </div>
          
          <p class="text-gray-700 mb-6 leading-relaxed line-clamp-3">
            ${animal.description ? animal.description.substring(0, 120) + '...' : 'A wonderful pet looking for a loving home.'}
          </p>
          
          <div class="flex space-x-3">
            <a href="adopt.html?id=${animal._id}" 
               class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300 text-center">
              <i class="fas fa-heart mr-2"></i>Adopt ${animal.name}
            </a>
            <button onclick="viewDetails('${animal._id}')" 
                    class="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition duration-300">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Setup search form functionality
function setupSearchForm() {
  const form = document.getElementById('searchForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const species = document.getElementById('species')?.value || '';
    const gender = document.getElementById('gender')?.value || '';
    const ageRange = document.getElementById('ageRange')?.value || '';
    const breed = document.getElementById('breed')?.value || '';
    const healthStatus = document.getElementById('healthStatus')?.value || '';

    let queryParams = '?';
    const params = [];
    
    if (species) params.push(`species=${encodeURIComponent(species)}`);
    if (gender) params.push(`gender=${encodeURIComponent(gender)}`);
    if (breed) params.push(`breed=${encodeURIComponent(breed)}`);
    if (healthStatus) params.push(`healthStatus=${encodeURIComponent(healthStatus)}`);
    
    // Handle age range
    if (ageRange) {
      const [minAge, maxAge] = ageRange.split('-').map(Number);
      if (maxAge && maxAge !== 999) {
        params.push(`age=${maxAge}`);
      }
    }

    queryParams += params.join('&');

    try {
      console.log('Searching animals with query:', queryParams);
      await fetchAllAnimals(queryParams);
    } catch (error) {
      console.error('Error searching animals:', error);
      showErrorMessage('Error searching animals. Please try again.');
    }
  });
}

// Setup quick filter functionality
function setupQuickFilters() {
  // Quick filters are handled by onclick attributes in HTML
}

// Setup advanced filters
function setupAdvancedFilters() {
  const toggleBtn = document.getElementById('advancedToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleAdvancedSearch);
  }
}

// Setup sorting and pagination
function setupSortingAndPagination() {
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', sortAnimals);
  }
}

// Search nearby animals
async function searchNearbyAnimals() {
  try {
    if (!userLocation) {
      await getUserLocationForSearch();
    }
    
    if (!userLocation) {
      alert('Unable to get your location. Please enable location services and try again.');
      return;
    }
    
    const queryParams = `?lat=${userLocation.lat}&lng=${userLocation.lng}&maxDistance=10000`;
    await fetchAllAnimals(queryParams);
    
    // Update UI to show nearby search is active
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
      resultsCount.textContent = `Showing pets within 10km of your location`;
    }
    
  } catch (error) {
    console.error('Error searching nearby animals:', error);
    alert('Unable to search nearby pets. Please try again.');
  }
}

// Quick filter functions
function quickFilter(type) {
  // Update active filter chip
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active', 'bg-blue-600', 'text-white');
    chip.classList.add('bg-gray-100', 'text-gray-700');
  });
  
  event.target.classList.add('active', 'bg-blue-600', 'text-white');
  event.target.classList.remove('bg-gray-100', 'text-gray-700');
  
  let queryParams = '';
  
  switch(type) {
    case 'dog':
      queryParams = '?species=dog';
      break;
    case 'cat':
      queryParams = '?species=cat';
      break;
    case 'young':
      queryParams = '?age=12'; // Less than 12 months
      break;
    case 'senior':
      queryParams = '?age=84'; // More than 7 years (84 months)
      break;
    default:
      queryParams = '';
  }
  
  fetchAllAnimals(queryParams);
}

// Toggle advanced search
function toggleAdvancedSearch() {
  const advancedFilters = document.getElementById('advancedFilters');
  const toggleBtn = document.getElementById('advancedToggle');
  
  if (!advancedFilters || !toggleBtn) return;
  
  if (advancedFilters.classList.contains('hidden')) {
    advancedFilters.classList.remove('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-chevron-up mr-2"></i>Hide Advanced';
  } else {
    advancedFilters.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-sliders-h mr-2"></i>Advanced Filters';
  }
}

// Sort animals
function sortAnimals() {
  const sortBy = document.getElementById('sortBy')?.value;
  if (!sortBy) return;
  
  let sorted = [...filteredAnimals];
  
  switch(sortBy) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'age-young':
      sorted.sort((a, b) => (a.age || 0) - (b.age || 0));
      break;
    case 'age-old':
      sorted.sort((a, b) => (b.age || 0) - (a.age || 0));
      break;
  }
  
  displayAnimals(sorted);
}

// Clear all filters
function clearFilters() {
  const form = document.getElementById('searchForm');
  if (form) {
    form.reset();
  }
  
  // Reset quick filter chips
  document.querySelectorAll('.filter-chip').forEach((chip, index) => {
    chip.classList.remove('active', 'bg-blue-600', 'text-white');
    chip.classList.add('bg-gray-100', 'text-gray-700');
    if (index === 0) {
      chip.classList.add('active', 'bg-blue-600', 'text-white');
      chip.classList.remove('bg-gray-100', 'text-gray-700');
    }
  });
  
  // Reset sort
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.value = 'newest';
  }
  
  // Fetch all animals
  fetchAllAnimals();
}

// Fetch animal details (Adopt a Pet page)
async function fetchAnimalDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const animalId = urlParams.get('id');
  
  console.log('URL params:', window.location.search);
  console.log('Extracted animal ID:', animalId);
  
  if (!animalId || animalId === 'undefined' || animalId === 'null') {
    const container = document.getElementById('animalDetails');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-16">
          <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-6"></i>
          <h3 class="text-2xl font-bold text-red-600 mb-4">No Pet Selected</h3>
          <p class="text-gray-500 mb-8">Please select a pet from the Find a Pet page</p>
          <a href="find.html" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300">
            Browse Pets
          </a>
        </div>
      `;
    }
    return;
  }

  try {
    console.log('Fetching animal details for ID:', animalId);
    const response = await fetch(`${API_URL}/animals/${animalId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const animal = await response.json();
    console.log('Animal data received:', animal);
    
    const container = document.getElementById('animalDetails');
    if (container) {
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img src="${animal.images && animal.images[0] || 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}" 
                 alt="${animal.name}" class="rounded-2xl w-full h-96 object-cover">
          </div>
          <div class="space-y-4">
            <h2 class="text-4xl font-bold text-gray-800">${animal.name}</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-gray-600 font-medium">Species:</span>
                <p class="text-lg">${animal.species}</p>
              </div>
              <div>
                <span class="text-gray-600 font-medium">Breed:</span>
                <p class="text-lg">${animal.breed || 'Mixed'}</p>
              </div>
              <div>
                <span class="text-gray-600 font-medium">Age:</span>
                <p class="text-lg">${animal.age ? Math.floor(animal.age / 12) + ' years ' + (animal.age % 12) + ' months' : 'Unknown'}</p>
              </div>
              <div>
                <span class="text-gray-600 font-medium">Gender:</span>
                <p class="text-lg">${animal.gender || 'Unknown'}</p>
              </div>
              <div>
                <span class="text-gray-600 font-medium">Health Status:</span>
                <p class="text-lg">${animal.healthStatus || 'Unknown'}</p>
              </div>
              <div>
                <span class="text-gray-600 font-medium">Location:</span>
                <p class="text-lg">${animal.address || 'Location not specified'}</p>
              </div>
            </div>
            <div>
              <span class="text-gray-600 font-medium">Description:</span>
              <p class="text-lg leading-relaxed">${animal.description || 'No description provided.'}</p>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching animal:', error);
    const container = document.getElementById('animalDetails');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-16">
          <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-6"></i>
          <h3 class="text-2xl font-bold text-red-600 mb-4">Error Loading Pet Details</h3>
          <p class="text-gray-500 mb-8">${error.message}</p>
          <button onclick="window.location.reload()" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300">
            Try Again
          </button>
        </div>
      `;
    }
  }
}

// Setup adoption form (Adopt a Pet page)
function setupAdoptionForm() {
  const form = document.getElementById('adoptionForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        showLoginModal();
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const animalId = urlParams.get('id');
      
      console.log('Form submission - Animal ID:', animalId);
      
      if (!animalId || animalId === 'undefined' || animalId === 'null') {
        alert('Error: No pet selected. Please go back and select a pet.');
        return;
      }

      const reason = document.getElementById('reason').value;
      const experience = document.getElementById('experience')?.value || '';
      const housing = document.getElementById('housing')?.value || '';
      const otherPets = document.getElementById('otherPets')?.value || '';
      const timeCommitment = document.getElementById('timeCommitment')?.value || '';
      const emergencyContact = document.getElementById('emergencyContact')?.value || '';

      // Combine all form data into the reason field
      const fullReason = `
Adoption Reason: ${reason}

Experience Level: ${experience}
Housing Situation: ${housing}
Other Pets: ${otherPets}
Time Commitment: ${timeCommitment}
Emergency Contact: ${emergencyContact}
      `.trim();

      try {
        console.log('Submitting adoption for animal ID:', animalId);
        const response = await fetch(`${API_URL}/adoptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            animalId: animalId, 
            reason: fullReason 
          }),
        });
        
        const data = await response.json();
        if (response.ok) {
          alert('Adoption request submitted successfully! We will review your application and contact you soon.');
          form.reset();
          // Optionally redirect to profile page
          window.location.href = 'profile.html';
        } else {
          alert(data.message || 'Failed to submit adoption request');
        }
      } catch (error) {
        console.error('Error submitting adoption:', error);
        alert('Error: ' + error.message);
      }
    });
  }
}

// Setup list animal form (List an Animal page) - FIXED
function setupListAnimalForm() {
  const form = document.getElementById('listAnimalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        showLoginModal();
        return;
      }

      // Get the location input value from the form
      const locationInput = document.getElementById('location').value;
      
      if (!locationInput.trim()) {
        alert('Please enter a location for the animal');
        return;
      }

      const formData = new FormData();
      formData.append('name', document.getElementById('name').value);
      formData.append('species', document.getElementById('species').value);
      formData.append('breed', document.getElementById('breed').value || '');
      formData.append('age', document.getElementById('age').value || '');
      formData.append('gender', document.getElementById('gender').value || '');
      formData.append('healthStatus', document.getElementById('healthStatus').value || '');
      formData.append('description', document.getElementById('description').value || '');
      
      // Use the location input from the form instead of geolocation
      formData.append('address', locationInput);
      
      // Try to geocode the address to get coordinates
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`,
          {
            headers: {
              'User-Agent': 'PetConnect/1.0'
            }
          }
        );
        
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          const result = geocodeData[0];
          formData.append('location', JSON.stringify({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          }));
        } else {
          // If geocoding fails, use default coordinates (Delhi)
          console.warn('Geocoding failed, using default location');
          formData.append('location', JSON.stringify({
            lat: 28.6139,
            lng: 77.2090
          }));
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Use default location if geocoding fails
        formData.append('location', JSON.stringify({
          lat: 28.6139,
          lng: 77.2090
        }));
      }
      
      // Handle image uploads
      const images = document.getElementById('images').files;
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }

      try {
        console.log('Listing animal with location:', locationInput);
        const response = await fetch(`${API_URL}/animals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        const data = await response.json();
        console.log('Response data:', data);
        if (response.ok) {
          alert('Animal listed successfully!');
          form.reset();
          // Reset the image preview if exists
          const imagePreview = document.getElementById('imagePreview');
          if (imagePreview) {
            imagePreview.innerHTML = '';
          }
        } else {
          alert(data.message || 'Failed to list animal');
        }
      } catch (error) {
        console.error('Error listing animal:', error);
        alert('Error: ' + error.message);
      }
    });
  }
}

// Function to select a location from suggestions
function selectLocation(locationName) {
  const locationInput = document.getElementById('location');
  const suggestionsDiv = document.getElementById('locationSuggestions');
  if (locationInput && suggestionsDiv) {
    locationInput.value = locationName;
    suggestionsDiv.classList.add('hidden');
  }
}

// Fetch profile and adoption history (Profile page)
async function fetchProfile() {
  const token = localStorage.getItem('jwtToken');
  const user = JSON.parse(localStorage.getItem('user'));
  if (!token || !user) {
    window.location.href = 'index.html';
    return;
  }

  // Update user info display
  const userInfoContainer = document.getElementById('userInfo');
  if (userInfoContainer) {
    userInfoContainer.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-2">${user.name}</h2>
      <p class="text-gray-600 mb-1"><i class="fas fa-envelope mr-2"></i>${user.email}</p>
      <p class="text-gray-600 mb-4"><i class="fas fa-user-tag mr-2"></i>Role: ${user.role}</p>
      <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <i class="fas fa-check-circle mr-2"></i>Verified Account
      </div>
    `;
  }

  try {
    console.log('Fetching adoption history...');
    const response = await fetch(`${API_URL}/adoptions/my-adoptions`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const adoptions = await response.json();
    console.log('Adoptions data:', adoptions);
    
    const container = document.getElementById('adoptionHistory');
    if (container) {
      container.innerHTML = adoptions.length ? adoptions.map(adoption => `
        <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="text-xl font-bold text-gray-800">${adoption.animalId.name}</h4>
              <p class="text-gray-600">${adoption.animalId.species} • ${adoption.animalId.breed || 'Mixed'}</p>
              <p class="text-gray-700 mt-2"><strong>Reason:</strong> ${adoption.reason}</p>
              <p class="text-sm text-gray-500 mt-2">Submitted: ${new Date(adoption.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="ml-4">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                adoption.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                adoption.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }">
                ${adoption.status.charAt(0).toUpperCase() + adoption.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      `).join('') : '<p class="text-center text-gray-600">No adoptions yet.</p>';
    }
  } catch (error) {
    console.error('Error fetching adoptions:', error);
    const container = document.getElementById('adoptionHistory');
    if (container) {
      container.innerHTML = '<p class="text-center text-red-600">Error loading adoption history.</p>';
    }
  }
}

// Setup contact form (Contact Us page)
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Contact form submitted! (Email integration needed)');
      form.reset();
    });
  }
}

// Setup donate button (Donate page)
function setupDonateButton() {
  const donateButton = document.getElementById('donateButton');
  const donationDetails = document.getElementById('donationDetails');
  if (donateButton && donationDetails) {
    donateButton.addEventListener('click', () => {
      donationDetails.classList.toggle('hidden');
    });
  }
}

// ADMIN FUNCTIONS
function checkAdminAccess() {
  const token = localStorage.getItem('jwtToken');
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!token || !user || user.role !== 'admin') {
    alert('Admin access required. Please login as an administrator.');
    window.location.href = 'index.html';
    return;
  }
  
  loadAdminData();
}

async function loadAdminData() {
  try {
    await Promise.all([
      loadStats(),
      loadPendingAdoptions(),
      loadAllAdoptions(),
      loadAllAnimals()
    ]);
  } catch (error) {
    console.error('Error loading admin data:', error);
    alert('Error loading dashboard data. Please refresh the page.');
  }
}

async function loadStats() {
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${API_URL}/adoptions/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const stats = await response.json();
    
    document.getElementById('pendingCount').textContent = stats.adoptions.pending || 0;
    document.getElementById('approvedCount').textContent = stats.adoptions.approved || 0;
    document.getElementById('availablePets').textContent = stats.animals.available || 0;
    document.getElementById('totalPets').textContent = stats.animals.total || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadPendingAdoptions() {
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${API_URL}/adoptions/pending`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const adoptions = await response.json();
    displayPendingAdoptions(adoptions);
  } catch (error) {
    console.error('Error loading pending adoptions:', error);
    document.getElementById('pendingAdoptions').innerHTML = '<p class="text-red-600">Error loading pending adoptions.</p>';
  }
}

async function loadAllAdoptions() {
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${API_URL}/adoptions/admin/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    allAdoptionsData = data.adoptions || data;
    displayAllAdoptions(allAdoptionsData);
  } catch (error) {
    console.error('Error loading all adoptions:', error);
    document.getElementById('allAdoptions').innerHTML = '<p class="text-red-600">Error loading adoptions.</p>';
  }
}

async function loadAllAnimals() {
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${API_URL}/animals/admin/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    allAnimalsData = data.animals || data;
    displayAllAnimals(allAnimalsData);
  } catch (error) {
    console.error('Error loading all animals:', error);
    document.getElementById('allAnimals').innerHTML = '<p class="text-red-600">Error loading animals.</p>';
  }
}

function displayPendingAdoptions(adoptions) {
  const container = document.getElementById('pendingAdoptions');
  
  if (adoptions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-check-circle text-6xl text-green-300 mb-4"></i>
        <h4 class="text-xl font-semibold text-gray-600 mb-2">No Pending Adoptions</h4>
        <p class="text-gray-500">All adoption requests have been processed!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = adoptions.map(adoption => {
    // Safe access to nested properties
    const animalId = adoption.animalId || {};
    const userId = adoption.userId || {};
    const animalImages = animalId.images || [];
    const defaultImage = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';
    const animalImage = animalImages.length > 0 ? animalImages[0] : defaultImage;

    return `
      <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div class="flex-1">
            <div class="flex items-start mb-4">
              <img src="${animalImage}" 
                   alt="${animalId.name || 'Pet'}" 
                   class="w-16 h-16 rounded-lg object-cover mr-4"
                   onerror="this.src='${defaultImage}'">
              <div>
                <h4 class="text-xl font-bold text-gray-800">${animalId.name || 'Unknown Pet'}</h4>
                <p class="text-gray-600">${animalId.species || 'Unknown'} • ${animalId.breed || 'Mixed'}</p>
                <p class="text-sm text-gray-500">${animalId.address || 'Location not specified'}</p>
              </div>
            </div>
            
            <div class="mb-4">
              <h5 class="font-semibold text-gray-800 mb-2">Adopter Information</h5>
              <p class="text-gray-700 font-medium">${userId.name || 'Unknown User'}</p>
              <p class="text-gray-600 text-sm">${userId.email || 'No email'}</p>
            </div>
            
            <div class="mb-4">
              <h5 class="font-semibold text-gray-800 mb-2">Application Details</h5>
              <p class="text-gray-700 text-sm leading-relaxed">${adoption.reason || 'No reason provided'}</p>
            </div>
            
            <div class="text-sm text-gray-500">
              <p>Submitted: ${new Date(adoption.createdAt).toLocaleDateString()} at ${new Date(adoption.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
          
          <div class="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-3 lg:w-48">
            <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <i class="fas fa-clock mr-2"></i>Pending Review
            </span>
            <button onclick="approveAdoption('${adoption._id}')" 
                    class="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300">
              <i class="fas fa-check mr-2"></i>Approve
            </button>
            <button onclick="rejectAdoption('${adoption._id}')" 
                    class="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition duration-300">
              <i class="fas fa-times mr-2"></i>Reject
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function displayAllAdoptions(adoptions) {
  const container = document.getElementById('allAdoptions');
  
  if (adoptions.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-600 py-8">No adoptions found.</p>';
    return;
  }

  container.innerHTML = adoptions.map(adoption => {
    // Safe access to nested properties
    const animalId = adoption.animalId || {};
    const userId = adoption.userId || {};
    const animalImages = animalId.images || [];
    const defaultImage = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80';
    const animalImage = animalImages.length > 0 ? animalImages[0] : defaultImage;

    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const statusIcons = {
      pending: 'fas fa-clock',
      approved: 'fas fa-check-circle',
      rejected: 'fas fa-times-circle'
    };

    return `
      <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-start">
            <img src="${animalImage}" 
                 alt="${animalId.name || 'Pet'}" 
                 class="w-12 h-12 rounded-lg object-cover mr-3"
                 onerror="this.src='${defaultImage}'">
            <div>
              <h4 class="font-bold text-gray-800">${animalId.name || 'Unknown Pet'}</h4>
              <p class="text-gray-600 text-sm">${animalId.species || 'Unknown'} • ${animalId.breed || 'Mixed'}</p>
              <p class="text-gray-700 font-medium">${userId.name || 'Unknown User'}</p>
              <p class="text-gray-500 text-sm">${userId.email || 'No email'}</p>
            </div>
          </div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[adoption.status] || 'bg-gray-100 text-gray-800'}">
            <i class="${statusIcons[adoption.status] || 'fas fa-question'} mr-2"></i>
            ${adoption.status ? adoption.status.charAt(0).toUpperCase() + adoption.status.slice(1) : 'Unknown'}
          </span>
        </div>
        
        <div class="text-sm text-gray-500">
          <p>Submitted: ${new Date(adoption.createdAt).toLocaleDateString()}</p>
          ${adoption.reviewedAt ? `<p>Reviewed: ${new Date(adoption.reviewedAt).toLocaleDateString()}</p>` : ''}
          ${adoption.adminNotes ? `<p class="mt-2 text-gray-700"><strong>Admin Notes:</strong> ${adoption.adminNotes}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function displayAllAnimals(animals) {
  const container = document.getElementById('allAnimals');
  
  if (animals.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-600 py-8 col-span-full">No animals found.</p>';
    return;
  }

  container.innerHTML = animals.map(animal => {
    // Safe access to images
    const animalImages = animal.images || [];
    const defaultImage = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
    const animalImage = animalImages.length > 0 ? animalImages[0] : defaultImage;

    const statusColors = {
      available: 'bg-green-100 text-green-800',
      adopted: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return `
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <img src="${animalImage}" 
             alt="${animal.name || 'Pet'}" 
             class="w-full h-48 object-cover"
             onerror="this.src='${defaultImage}'">
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-lg font-bold text-gray-800">${animal.name || 'Unknown Pet'}</h4>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[animal.status] || 'bg-gray-100 text-gray-800'}">
              ${animal.status ? animal.status.charAt(0).toUpperCase() + animal.status.slice(1) : 'Unknown'}
            </span>
          </div>
          <p class="text-gray-600 text-sm mb-2">${animal.species || 'Unknown'} • ${animal.breed || 'Mixed'}</p>
          <p class="text-gray-500 text-sm mb-2">${animal.address || 'Location not specified'}</p>
          <p class="text-gray-500 text-xs">Listed: ${new Date(animal.createdAt).toLocaleDateString()}</p>
          
          ${animal.status === 'available' ? `
            <button onclick="changeAnimalStatus('${animal._id}', 'adopted')" 
                    class="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition duration-300">
              Mark as Adopted
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Approve adoption (Admin)
async function approveAdoption(adoptionId) {
  const token = localStorage.getItem('jwtToken');
  const adminNotes = prompt('Add any notes for this approval (optional):') || '';
  
  try {
    const response = await fetch(`${API_URL}/adoptions/approve/${adoptionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ adminNotes }),
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('Adoption approved successfully!');
      loadAdminData();
    } else {
      alert(data.message || 'Failed to approve adoption');
    }
  } catch (error) {
    console.error('Error approving adoption:', error);
    alert('Error: ' + error.message);
  }
}

// Reject adoption (Admin)
async function rejectAdoption(adoptionId) {
  const adminNotes = prompt('Please provide a reason for rejection:');
  if (!adminNotes) {
    alert('Rejection reason is required');
    return;
  }
  
  const token = localStorage.getItem('jwtToken');
  try {
    const response = await fetch(`${API_URL}/adoptions/reject/${adoptionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ adminNotes }),
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('Adoption rejected.');
      loadAdminData();
    } else {
      alert(data.message || 'Failed to reject adoption');
    }
  } catch (error) {
    console.error('Error rejecting adoption:', error);
    alert('Error: ' + error.message);
  }
}

async function changeAnimalStatus(animalId, newStatus) {
  if (!confirm(`Are you sure you want to mark this animal as ${newStatus}?`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${API_URL}/animals/${animalId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('Animal status updated successfully!');
      loadAdminData();
    } else {
      alert(data.message || 'Failed to update animal status');
    }
  } catch (error) {
    console.error('Error updating animal status:', error);
    alert('Error: ' + error.message);
  }
}

function filterAdoptions() {
  const status = document.getElementById('statusFilter').value;
  const filtered = status ? allAdoptionsData.filter(adoption => adoption.status === status) : allAdoptionsData;
  displayAllAdoptions(filtered);
}

function filterAnimals() {
  const status = document.getElementById('animalStatusFilter').value;
  const filtered = status ? allAnimalsData.filter(animal => animal.status === status) : allAnimalsData;
  displayAllAnimals(filtered);
}

async function refreshData() {
  try {
    await loadAdminData();
    alert('Data refreshed successfully!');
  } catch (error) {
    console.error('Error refreshing data:', error);
    alert('Error refreshing data. Please try again.');
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  if (tabName === 'pending') {
    document.getElementById('pendingTab').classList.remove('hidden');
  } else if (tabName === 'all') {
    document.getElementById('allTab').classList.remove('hidden');
  } else if (tabName === 'animals') {
    document.getElementById('animalsTab').classList.remove('hidden');
  }
}

// Toggle favorite
function toggleFavorite(animalId) {
  const heartBtn = event.target;
  heartBtn.classList.toggle('liked');
  
  if (heartBtn.classList.contains('liked')) {
    heartBtn.style.color = '#ef4444';
    console.log('Added to favorites:', animalId);
  } else {
    heartBtn.style.color = '#9ca3af';
    console.log('Removed from favorites:', animalId);
  }
}

// View details modal
function viewDetails(animalId) {
  window.location.href = `adopt.html?id=${animalId}`;
}

// Update results count
function updateResultsCount(count) {
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `Found ${count} amazing pet${count !== 1 ? 's' : ''}`;
  }
}

// Show error message
function showErrorMessage(message) {
  const container = document.getElementById('animalList');
  if (container) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-6"></i>
        <h3 class="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h3>
        <p class="text-gray-500 mb-8">${message}</p>
        <button onclick="window.location.reload()" class="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition duration-300">
          Try Again
        </button>
      </div>
    `;
  }
}

// Global functions for page-specific features
window.quickFilter = quickFilter;
window.approveAdoption = approveAdoption;
window.rejectAdoption = rejectAdoption;
window.searchNearbyAnimals = searchNearbyAnimals;
window.toggleAdvancedSearch = toggleAdvancedSearch;
window.clearFilters = clearFilters;
window.sortAnimals = sortAnimals;
window.toggleFavorite = toggleFavorite;
window.viewDetails = viewDetails;
window.selectLocation = selectLocation;
window.switchTab = switchTab;
window.filterAdoptions = filterAdoptions;
window.filterAnimals = filterAnimals;
window.refreshData = refreshData;
window.changeAnimalStatus = changeAnimalStatus;
