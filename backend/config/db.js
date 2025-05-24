const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./layout.db");

module.exports = db;