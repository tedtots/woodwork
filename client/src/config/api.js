// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

export default API_BASE_URL;
