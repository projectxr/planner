import axios from 'axios';

const apiClient = axios.create({
	headers: {
		'Content-Type': 'application/json',
	},
});

apiClient.interceptors.request.use(
	config => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers['X-AUTH-TOKEN'] = token;
		}
		return config;
	},
	error => {
		return Promise.reject(error);
	}
);

export default apiClient;
