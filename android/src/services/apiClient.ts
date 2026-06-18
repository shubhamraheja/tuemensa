import axios, {AxiosInstance} from 'axios';
import {API_BASE_URL, API_TIMEOUT} from '@/constants/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {'Content-Type': 'application/json'},
});

export default apiClient;
