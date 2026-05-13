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

export default adminApi;
