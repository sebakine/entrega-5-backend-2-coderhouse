import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async (url = env.MONGO_URL) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(url);
  return mongoose.connection;
};

export const disconnectDB = () => mongoose.disconnect();
