import axios from 'axios';

const adminApi = axios.create();

// add JWT to every request so I don't have to do it manually each time
adminApi.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 401 means token expired — clear it and reload so the login page shows up
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
