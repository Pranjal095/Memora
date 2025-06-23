import 'dotenv/config';

export default {
  expo: {
    name: 'Memora',
    slug: 'Memora',
    scheme: 'memora',
    extra: {
      backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://192.168.1.100:8000',
    },
  },
};