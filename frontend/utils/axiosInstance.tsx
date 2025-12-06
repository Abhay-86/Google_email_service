import axios from "axios";

const axiosInstance = axios.create(
    {
        baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/",
        withCredentials: true,
        timeout: 10000, // 10 second timeout
    }
)

export default axiosInstance;