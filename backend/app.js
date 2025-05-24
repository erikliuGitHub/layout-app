const express = require("express");
const cors = require("cors");
const app = express();
const layoutRoutes = require("./routes/layoutRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/layouts", layoutRoutes);

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));