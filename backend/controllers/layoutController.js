const { v4: uuidv4 } = require('uuid');
const model = require("../models/layoutTaskModel");

// 檢查 model 是否正確載入
if (!model) {
  console.error("Error: model is not defined. Please check layoutTaskModel.js import.");
  throw new Error("model is not defined");
}

// 控制器函數
const getProjectLayouts = (req, res) => {
  const requestId = uuidv4();
  const projectId = req.params.projectId;
  console.log(`[${requestId}] Fetching layouts for projectId: ${projectId}`);

  if (!projectId) {
    return res.status(400).json({
      success: false,
      updatedProjectData: [],
      message: "Project ID is required",
      errors: ["Project ID is required"],
      requestId
    });
  }

  model.getLayoutsByProject(projectId, (result) => {
    if (!result.success) {
      console.error(`[${requestId}] Error fetching project layouts:`, result.errors);
      return res.status(500).json({
        success: false,
        updatedProjectData: [],
        message: result.message || "Error processing project layouts",
        errors: result.errors || ["Unknown error"],
        requestId,
        debugInfo: { projectId, ...result.debugInfo }
      });
    }

    res.json({
      success: true,
      updatedProjectData: result.updatedProjectData || [],
      message: "Layouts fetched successfully",
      errors: [],
      requestId
    });
  });
};

const getAllLayouts = (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Fetching all layouts`);

  model.getGroupedByProjectId((result) => {
    if (!result.success) {
      console.error(`[${requestId}] Error fetching all layouts:`, result.errors);
      return res.status(500).json({
        success: false,
        updatedProjectData: {},
        message: result.message || "Error processing all layouts",
        errors: result.errors || ["Unknown error"],
        requestId,
        debugInfo: result.debugInfo
      });
    }

    res.json({
      success: true,
      updatedProjectData: result.updatedProjectData || {},
      message: "All layouts fetched successfully",
      errors: [],
      requestId
    });
  });
};

const submitBatchUpdate = (req, res) => {
  const requestId = uuidv4();
  const { projectId, data } = req.body;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      success: false,
      updatedProjectData: [],
      message: "Invalid project ID",
      errors: ["Project ID must be a non-empty string"],
      requestId
    });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({
      success: false,
      updatedProjectData: [],
      message: "Invalid data format",
      errors: ["Data must be a non-empty array"],
      requestId
    });
  }

  model.submitBatchUpdate(projectId, data, (result) => {
    if (!result.success) {
      console.error(`[${requestId}] Batch update failed:`, result.errors);
      return res.status(500).json({
        success: false,
        updatedProjectData: [],
        message: result.message || "Error processing batch update",
        errors: result.errors || ["Unknown error"],
        requestId,
        debugInfo: { projectId, ...result.debugInfo }
      });
    }

    res.json({
      success: true,
      updatedProjectData: result.updatedProjectData || [],
      message: "Batch update successful",
      errors: [],
      requestId
    });
  });
};

const errorHandler = (err, req, res, next) => {
  const requestId = uuidv4();
  console.error(`[${requestId}] Unhandled error:`, err);
  res.status(500).json({
    success: false,
    updatedProjectData: [],
    message: err.message || 'Unexpected server error',
    errors: [err.message || 'Unknown error'],
    requestId
  });
};

// 導出所有控制器函數
module.exports = {
  getProjectLayouts,
  getAllLayouts,
  submitBatchUpdate,
  errorHandler
};