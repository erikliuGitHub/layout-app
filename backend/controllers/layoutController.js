const model = require("../models/layoutTaskModel");

exports.getTasks = (req, res) => {
  model.getGroupedByProjectId((err, grouped) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log('Grouped data from DB:\n', JSON.stringify(grouped, null, 2));  // 格式化 JSON
    res.json(grouped);
  });
};

exports.createTask = (req, res) => {
  model.createTask(req.body, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Created" });
  });
};