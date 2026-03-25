import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "/api";

const refreshApi = axios.create({
    baseURL,
    timeout: 20000,
    withCredentials: true,
});

export default refreshApi;
