const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const YAML = require("yamljs")
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'swagger.yaml'));

// Import Routes
const userRoutes = require('./routes/userRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

dotenv.config();
connectDB();
const app = express();

app.use(express.json());





app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Use Routes
app.use('/users', userRoutes);
app.use('/slots', slotRoutes);
app.use('/bookings', bookingRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));