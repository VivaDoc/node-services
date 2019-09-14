import mongoose = require("mongoose")


export interface LogError {
  errorSource: "github-app" | "api",
  error: any;
}


const LogErrorSchema = new mongoose.Schema({
  errorSource: { type: String, required: [true, "can't be blank"] },
  error: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] }
});


mongoose.model("LogError", LogErrorSchema);
