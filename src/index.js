import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import userRoutes from './routes/userRoutes.js';
import 'dotenv/config'
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import { protect } from "./middleware/authMiddleware.js"
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 8080;

connectDB();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.get('/', (req, res) => {
  res.send('YO!!! Hello World!');
});

app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieParser());

app.use(authRoutes);
app.use(protect, userRoutes);


app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
