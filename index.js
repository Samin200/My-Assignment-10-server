const express = require('express');
const app = express();
const port = 5020;
const cors = require('cors');

express.json();
app.use(cors());

app.get('/', (req, res) => {
    res.send('My assignment 10 server is running');
});

app.listen(port, () => {
    console.log(`My assignment 10 server is running on port: ${port}`);
});