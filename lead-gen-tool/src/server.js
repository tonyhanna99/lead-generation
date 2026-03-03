const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const placesRouter = require('./routes/places');
const leadsRouter = require('./routes/leads');
const searchesRouter = require('./routes/searches');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());
app.use(express.static('public'));

app.use('/api/places', placesRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/searches', searchesRouter);

// Named page routes
app.get('/lead-gen', (req, res) => res.sendFile(path.join(__dirname, '../public/lead-gen.html')));
app.get('/tracker', (req, res) => res.sendFile(path.join(__dirname, '../public/tracker.html')));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});