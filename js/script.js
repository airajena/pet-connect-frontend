const API_URL = 'http://localhost:5000/api';

// Page load handler
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  updateNavLinks(token);
  console.log('Page loaded:', window.location.pathname);
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    fetchFeaturedAnimals();
    setupChatbot();
  } else if (window.location.pathname.endsWith('find.html')) {
    fetchAllAnimals();
    setupSearchForm();
  } else if (window.location.pathname.endsWith('adopt.html')) {
    fetchAnimalDetails();
    setupAdoptionForm();
  } else if (window.location.pathname.endsWith('list.html')) {
    setupListAnimalForm();
  } else if (window.location.pathname.endsWith('profile.html')) {
    fetchProfile();
  } else if (window.location.pathname.endsWith('contact.html')) {
    setupContactForm();
  }
});

// Update navigation links
function updateNavLinks(token) {
  const profileLink = document.getElementById('profileLink');
  const logoutLink = document.getElementById('logoutLink');
  const loginLink = document.getElementById('loginLink');
  if (token) {
    profileLink.classList.remove('hidden');
    logoutLink.classList.remove('hidden');
    loginLink.classList.add('hidden');
  } else {
    profileLink.classList.add('hidden');
    logoutLink.classList.add('hidden');
    loginLink.classList.remove('hidden');
  }
}

// Logout
function logout() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('user');
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

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    console.log('Login response:', response);
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      updateNavLinks(data.token);
      hideLoginModal();
      alert('Login successful!');
      if (window.location.pathname.endsWith('list.html') || window.location.pathname.endsWith('profile.html')) {
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

// Handle signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    console.log('Signup response:', response);
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      updateNavLinks(data.token);
      hideSignupModal();
      alert('Signup successful!');
      if (window.location.pathname.endsWith('list.html') || window.location.pathname.endsWith('profile.html')) {
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

// Fetch featured animals (Home page)
async function fetchFeaturedAnimals() {
  try {
    console.log('Fetching featured animals...');
    const response = await fetch(`${API_URL}/animals?limit=3`);
    console.log('Featured animals response:', response);
    const animals = await response.json();
    console.log('Animals data:', animals);
    const container = document.getElementById('featuredAnimals');
    container.innerHTML = animals.length ? animals.map(animal => `
      <div class="animal-card bg-white rounded-lg shadow-md p-4">
        <img src="${animal.images[0] || 'assets/images/pet-placeholder.jpg'}" alt="${animal.name}" class="rounded">
        <h3 class="text-xl font-bold">${animal.name}</h3>
        <p>Species: ${animal.species}</p>
        <p>Location: (${animal.location.coordinates[1]}, ${animal.location.coordinates[0]})</p>
        <a href="adopt.html?animalId=${animal._id}" class="bg-blue-600 text-white px-4 py-2 rounded mt-2 inline-block hover:bg-blue-700">Adopt</a>
      </div>
    `).join('') : '<p class="text-center">No animals found.</p>';
  } catch (error) {
    console.error('Error fetching animals:', error);
    document.getElementById('featuredAnimals').innerHTML = '<p class="text-center">Error loading animals.</p>';
  }
}

// Fetch all animals (Find a Pet page)
async function fetchAllAnimals() {
  try {
    console.log('Fetching all animals...');
    const response = await fetch(`${API_URL}/animals`);
    console.log('All animals response:', response);
    const animals = await response.json();
    console.log('All animals data:', animals);
    const container = document.getElementById('animalList');
    container.innerHTML = animals.length ? animals.map(animal => `
      <div class="animal-card bg-white rounded-lg shadow-md p-4">
        <img src="${animal.images[0] || 'assets/images/pet-placeholder.jpg'}" alt="${animal.name}" class="rounded">
        <h3 class="text-xl font-bold">${animal.name}</h3>
        <p>Species: ${animal.species}</p>
        <p>Location: (${animal.location.coordinates[1]}, ${animal.location.coordinates[0]})</p>
        <a href="adopt.html?animalId=${animal._id}" class="bg-blue-600 text-white px-4 py-2 rounded mt-2 inline-block hover:bg-blue-700">Adopt</a>
      </div>
    `).join('') : '<p class="text-center">No animals found.</p>';
  } catch (error) {
    console.error('Error fetching animals:', error);
    document.getElementById('animalList').innerHTML = '<p class="text-center">Error loading animals.</p>';
  }
}

// Setup search form (Find a Pet page)
function setupSearchForm() {
  fetchAllAnimals();
  const form = document.getElementById('searchForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const species = document.getElementById('species').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const location = document.getElementById('location').value;

    let query = `?`;
    if (species) query += `species=${species}&`;
    if (age) query += `age=${age}&`;
    if (gender) query += `gender=${gender}&`;
    if (location) {
      const coordinates = location.toLowerCase().includes('delhi') ? [77.2187, 28.6328] :
                         location.toLowerCase().includes('mumbai') ? [72.8777, 19.0760] :
                         [77.2187, 28.6328];
      query += `lat=${coordinates[1]}&lng=${coordinates[0]}&maxDistance=10000`;
    }

    try {
      console.log('Searching animals with query:', query);
      const response = await fetch(`${API_URL}/animals${query}`);
      console.log('Search response:', response);
      const animals = await response.json();
      console.log('Search animals data:', animals);
      const container = document.getElementById('animalList');
      container.innerHTML = animals.length ? animals.map(animal => `
        <div class="animal-card bg-white rounded-lg shadow-md p-4">
          <img src="${animal.images[0] || 'assets/images/pet-placeholder.jpg'}" alt="${animal.name}" class="rounded">
          <h3 class="text-xl font-bold">${animal.name}</h3>
          <p>Species: ${animal.species}</p>
          <p>Location: (${animal.location.coordinates[1]}, ${animal.location.coordinates[0]})</p>
          <a href="adopt.html?animalId=${animal._id}" class="bg-blue-600 text-white px-4 py-2 rounded mt-2 inline-block hover:bg-blue-700">Adopt</a>
        </div>
      `).join('') : '<p class="text-center">No animals found.</p>';
    } catch (error) {
      console.error('Error fetching animals:', error);
      document.getElementById('animalList').innerHTML = '<p class="text-center">Error loading animals.</p>';
    }
  });
}

// Fetch animal details (Adopt a Pet page)
async function fetchAnimalDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const animalId = urlParams.get('animalId');
  if (!animalId) {
    document.getElementById('animalDetails').innerHTML = '<p class="text-center">No animal selected.</p>';
    return;
  }

  try {
    console.log('Fetching animal details for ID:', animalId);
    const response = await fetch(`${API_URL}/animals/${animalId}`);
    console.log('Animal details response:', response);
    const animal = await response.json();
    console.log('Animal data:', animal);
    document.getElementById('animalDetails').innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <img src="${animal.images[0] || 'assets/images/pet-placeholder.jpg'}" alt="${animal.name}" class="rounded w-full">
        <div>
          <h3 class="text-xl font-bold">${animal.name}</h3>
          <p>Species: ${animal.species}</p>
          <p>Breed: ${animal.breed || 'Unknown'}</p>
          <p>Age: ${animal.age || 'Unknown'}</p>
          <p>Gender: ${animal.gender}</p>
          <p>Health Status: ${animal.healthStatus || 'Unknown'}</p>
          <p>Description: ${animal.description || 'No description provided.'}</p>
          <p>Location: (${animal.location.coordinates[1]}, ${animal.location.coordinates[0]})</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching animal:', error);
    document.getElementById('animalDetails').innerHTML = '<p class="text-center">Error loading animal details.</p>';
  }
}

// Setup adoption form (Adopt a Pet page)
function setupAdoptionForm() {
  const form = document.getElementById('adoptionForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      showLoginModal();
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const animalId = urlParams.get('animalId');
    const reason = document.getElementById('reason').value;

    try {
      console.log('Submitting adoption for animal ID:', animalId);
      const response = await fetch(`${API_URL}/adoptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ animalId, reason }),
      });
      console.log('Adoption response:', response);
      const data = await response.json();
      if (response.ok) {
        alert('Adoption request submitted successfully!');
        form.reset();
      } else {
        alert(data.message || 'Failed to submit adoption request');
      }
    } catch (error) {
      console.error('Error submitting adoption:', error);
      alert('Error: ' + error.message);
    }
  });
}

// Setup list animal form (List an Animal page)
function setupListAnimalForm() {
  const form = document.getElementById('listAnimalForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      showLoginModal();
      return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('species', document.getElementById('species').value);
    formData.append('breed', document.getElementById('breed').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('gender', document.getElementById('gender').value);
    formData.append('healthStatus', document.getElementById('healthStatus').value);
    formData.append('description', document.getElementById('description').value);
    const location = document.getElementById('location').value;
    const coordinates = location.toLowerCase().includes('delhi') ? [77.2187, 28.6328] :
                       location.toLowerCase().includes('mumbai') ? [72.8777, 19.0760] :
                       [77.2187, 28.6328];
    formData.append('location', JSON.stringify({ lat: coordinates[1], lng: coordinates[0] }));
    const images = document.getElementById('images').files;
    for (let i = 0; i < images.length; i++) {
      formData.append('images', images[i]);
    }

    // Debug FormData
    for (let [key, value] of formData.entries()) {
      console.log(`FormData ${key}:`, value);
    }

    try {
      console.log('Listing animal with form data');
      const response = await fetch(`${API_URL}/animals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      console.log('List animal response:', response);
      const data = await response.json();
      console.log('Response data:', data); // Debug
      if (response.ok) {
        alert('Animal listed successfully!');
        form.reset();
      } else {
        alert(data.message || 'Failed to list animal');
      }
    } catch (error) {
      console.error('Error listing animal:', error);
      alert('Error: ' + error.message);
    }
  });
}

// Fetch profile and adoption history (Profile page)
async function fetchProfile() {
  const token = localStorage.getItem('jwtToken');
  const user = JSON.parse(localStorage.getItem('user'));
  if (!token || !user) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('userInfo').innerHTML = `
    <p>Name: ${user.name}</p>
    <p>Email: ${user.email}</p>
  `;

  try {
    console.log('Fetching adoption history...');
    const response = await fetch(`${API_URL}/adoptions/my-adoptions`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('Adoption history response:', response);
    const adoptions = await response.json();
    console.log('Adoptions data:', adoptions);
    const container = document.getElementById('adoptionHistory');
    container.innerHTML = adoptions.length ? adoptions.map(adoption => `
      <div class="bg-gray-50 p-4 rounded-lg">
        <p>Animal: ${adoption.animalId.name}</p>
        <p>Status: ${adoption.status}</p>
        <p>Reason: ${adoption.reason}</p>
        <p>Submitted: ${new Date(adoption.createdAt).toLocaleDateString()}</p>
      </div>
    `).join('') : '<p>No adoptions yet.</p>';
  } catch (error) {
    console.error('Error fetching adoptions:', error);
    document.getElementById('adoptionHistory').innerHTML = '<p>Error loading adoption history.</p>';
  }
}

// Setup contact form (Contact Us page)
function setupContactForm() {
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Contact form submitted! (Not integrated with backend yet)');
    form.reset();
  });
}

// Dummy chatbot (Home page)
function setupChatbot() {
  const chatbotToggle = document.getElementById('chatbotToggle');
  const chatbot = document.getElementById('chatbot');
  const chatbotAnswer = document.getElementById('chatbotAnswer');

  if (!chatbotToggle) return;

  const responses = {
    'How can I adopt a pet?': 'Visit the Adopt a Pet page, choose a pet, and fill out the adoption form!',
    'What animals are available?': 'Check the Find a Pet page to see all available animals.',
    'How to list a stray animal?': 'Log in, go to the List an Animal page, and submit details about the stray.'
  };

  chatbotToggle.addEventListener('click', () => {
    chatbot.classList.toggle('hidden');
  });

  window.showChatbotAnswer = (question) => {
    chatbotAnswer.innerHTML = `<p class="text-sm">${responses[question]}</p>`;
  };
}