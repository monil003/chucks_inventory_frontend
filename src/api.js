const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chucks-inventory-backend.onrender.com/api';

const getActiveRestaurantId = () => {
  const saved = localStorage.getItem('activeRestaurant');
  if (saved) {
    try {
      return JSON.parse(saved)._id;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getCurrentUser = () => {
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getHeaders = (additionalHeaders = {}) => {
  const headers = { ...additionalHeaders };
  const restId = getActiveRestaurantId();
  if (restId) {
    headers['x-restaurant-id'] = restId;
  }
  const user = getCurrentUser();
  if (user) {
    headers['x-user-role'] = user.role;
  }
  return headers;
};

export const api = {
  // Raw Items
  getRawItems: async () => {
    const res = await fetch(`${API_BASE_URL}/raw-items`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  createRawItem: async (item) => {
    const res = await fetch(`${API_BASE_URL}/raw-items`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteRawItem: async (id) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  updateRawItem: async (id, item) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadOrderGuide: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/upload-order-guide`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Menu Items (autocomplete search)
  searchMenuItems: async (query) => {
    const res = await fetch(`${API_BASE_URL}/menu-items?query=${encodeURIComponent(query)}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Recipes
  getRecipes: async () => {
    const res = await fetch(`${API_BASE_URL}/recipes`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveRecipe: async (recipe) => {
    const res = await fetch(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(recipe),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteRecipe: async (id) => {
    const res = await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Sessions
  getSessions: async () => {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  getSessionByDate: async (date) => {
    const res = await fetch(`${API_BASE_URL}/sessions/by-date?date=${date}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveInitialCounts: async (date, initialInventory) => {
    const res = await fetch(`${API_BASE_URL}/sessions/save-initial`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, initialInventory }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveFinalCounts: async (date, actualFinalInventory) => {
    const res = await fetch(`${API_BASE_URL}/sessions/save-final`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, actualFinalInventory }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveSalesData: async (date, salesData, salesFile) => {
    const res = await fetch(`${API_BASE_URL}/sessions/save-sales`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, salesData, salesFile }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveDeliveries: async (date, deliveries) => {
    const res = await fetch(`${API_BASE_URL}/sessions/save-deliveries`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ date, deliveries }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadSales: async (date, formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/upload-sales?date=${date}`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadInitialCount: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/upload-initial-count`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadEndCount: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/upload-end-count`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteSession: async (id) => {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  parseInvoice: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/parse-invoice`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  parseSalesReport: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/parse-sales-report`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  generateIntervalReport: async (payload) => {
    const res = await fetch(`${API_BASE_URL}/sessions/generate-interval-report`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Auth
  login: async (username, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  register: async (username, password, restaurantName) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, restaurantName }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Admin Panel
  getAdminUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  approveUser: async (id, approved) => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ approved }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  getAdminRestaurants: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/restaurants`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  approveRestaurant: async (id, approved) => {
    const res = await fetch(`${API_BASE_URL}/admin/restaurants/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ approved }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Manager Operations
  createStaffUser: async (username, password, restaurantId, role) => {
    const res = await fetch(`${API_BASE_URL}/manager/staff`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, password, restaurantId, role }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  getStaffUsers: async (restaurantId) => {
    const res = await fetch(`${API_BASE_URL}/manager/staff?restaurantId=${restaurantId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  updateStaffUser: async (id, username, password, role) => {
    const res = await fetch(`${API_BASE_URL}/manager/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteStaffUser: async (id) => {
    const res = await fetch(`${API_BASE_URL}/manager/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  addRestaurant: async (name, managerId) => {
    const res = await fetch(`${API_BASE_URL}/manager/restaurants`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, managerId }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  updateCsvMapping: async (restaurantId, csvMapping) => {
    const res = await fetch(`${API_BASE_URL}/manager/restaurants/${restaurantId}/csv-mapping`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ csvMapping }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  getProfile: async (userId) => {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { 'x-user-id': userId }
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  }
};

const getErrorMessage = async (res) => {
  try {
    const data = await res.json();
    return data.error || 'Request failed';
  } catch (e) {
    return 'Server communication error';
  }
};
