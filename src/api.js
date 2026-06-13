const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://chucks-inventory-backend.onrender.com/api');

export const api = {
  // Raw Items
  getRawItems: async () => {
    const res = await fetch(`${API_BASE_URL}/raw-items`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  createRawItem: async (item) => {
    const res = await fetch(`${API_BASE_URL}/raw-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteRawItem: async (id) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  updateRawItem: async (id, item) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadOrderGuide: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/raw-items/upload-order-guide`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },


  // Menu Items (autocomplete search)
  searchMenuItems: async (query) => {
    const res = await fetch(`${API_BASE_URL}/menu-items?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Recipes
  getRecipes: async () => {
    const res = await fetch(`${API_BASE_URL}/recipes`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  saveRecipe: async (recipe) => {
    const res = await fetch(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteRecipe: async (id) => {
    const res = await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },

  // Sessions
  getSessions: async () => {
    const res = await fetch(`${API_BASE_URL}/sessions`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  getActiveSession: async () => {
    const res = await fetch(`${API_BASE_URL}/sessions/active`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  startSession: async (initialInventory) => {
    const res = await fetch(`${API_BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialInventory }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadSales: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/upload-sales`, {
      method: 'POST',
      body: formData, // contains 'file' field
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  submitFinalCounts: async (actualFinalInventory) => {
    const res = await fetch(`${API_BASE_URL}/sessions/submit-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualFinalInventory }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  uploadInitialCount: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/sessions/upload-initial-count`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json();
  },
  deleteSession: async (id) => {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
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
