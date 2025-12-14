import axios from "axios";

// Function to get the correct API URL based on environment
const getApiBaseUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Client-side: Use the current domain for API requests
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/api/`;
  } else {
    // Server-side: Use container name or environment variable
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://backend:8000/api/";
  }
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Add request interceptor to log requests for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default axiosInstance;