import axios from 'axios';

const adminApi = axios.create();

// Automatically attach the admin JWT token to every request
adminApi.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If any admin request returns 401 (expired or invalid token), clear the session
// and reload the page so the login screen is shown
adminApi.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default adminApi;
