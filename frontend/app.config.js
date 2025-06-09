import 'dotenv/config';

export default {
  expo: {
    name: 'EchoCast',
    slug: 'EchoCast',
    scheme: 'echocast',
    extra: {
      backendUrl: process.env.BACKEND_URL || 'http://YOUR_BACKEND_HOST:8000',
    },
  },
};