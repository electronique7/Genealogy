import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const getMe     = ()           => api.get('/auth/me').then(r => r.data);
export const login     = (u, p)       => api.post('/auth/login', { username: u, password: p }).then(r => r.data);
export const register  = (data)       => api.post('/auth/register', data).then(r => r.data);
export const logout    = ()           => api.post('/auth/logout').then(r => r.data);
export const getUsers  = ()           => api.get('/auth/users').then(r => r.data);
export const createUser = (data)      => api.post('/auth/users', data).then(r => r.data);
export const updateUser = (id, data)  => api.put(`/auth/users/${id}`, data).then(r => r.data);
export const deleteUser = (id)        => api.delete(`/auth/users/${id}`).then(r => r.data);

// Admin activity log
export const getActivitySummary = ()       => api.get('/admin/activity/summary').then(r => r.data);
export const getActivityUsers   = ()       => api.get('/admin/activity/users').then(r => r.data);
export const getActivityLog     = (params) => api.get('/admin/activity', { params }).then(r => r.data);

// People
export const getPeople = (params) => api.get('/people', { params }).then(r => r.data);
export const getSurnames = () => api.get('/people/surnames').then(r => r.data);
export const getPerson = (id) => api.get(`/people/${id}`).then(r => r.data);
export const createPerson = (data) => api.post('/people', data).then(r => r.data);
export const updatePerson = (id, data) => api.put(`/people/${id}`, data).then(r => r.data);
export const deletePerson = (id) => api.delete(`/people/${id}`).then(r => r.data);

// Families
export const getFamilies = (params) => api.get('/families', { params }).then(r => r.data);
export const getFamily = (id) => api.get(`/families/${id}`).then(r => r.data);
export const createFamily = (data) => api.post('/families', data).then(r => r.data);
export const updateFamily = (id, data) => api.put(`/families/${id}`, data).then(r => r.data);
export const deleteFamily = (id) => api.delete(`/families/${id}`).then(r => r.data);
export const addChild = (famId, individual_id) => api.post(`/families/${famId}/children`, { individual_id }).then(r => r.data);
export const removeChild = (famId, personId) => api.delete(`/families/${famId}/children/${personId}`).then(r => r.data);

// Events
export const createEvent = (data) => api.post('/events', data).then(r => r.data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data).then(r => r.data);
export const deleteEvent = (id) => api.delete(`/events/${id}`).then(r => r.data);

// Notes
export const createNote = (data) => api.post('/notes', data).then(r => r.data);
export const updateNote = (id, data) => api.put(`/notes/${id}`, data).then(r => r.data);
export const deleteNote = (id) => api.delete(`/notes/${id}`).then(r => r.data);

// Sources
export const getSources = () => api.get('/sources').then(r => r.data);

// Tree
export const getAncestors = (id, generations) => api.get(`/tree/ancestors/${id}`, { params: { generations } }).then(r => r.data);
export const getDescendants = (id, generations) => api.get(`/tree/descendants/${id}`, { params: { generations } }).then(r => r.data);
export const searchTree = (q) => api.get('/tree/search', { params: { q } }).then(r => r.data);
