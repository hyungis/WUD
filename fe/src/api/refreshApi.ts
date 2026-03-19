import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

const refreshApi = axios.create({
    baseURL,
    timeout: 10000,
    withCredentials: true,
});

export default refreshApi;
