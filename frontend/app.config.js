import 'dotenv/config';

export default {
  expo: {
    extra: {
      backendUrl: process.env.BACKEND_URL,
    },
  },
};