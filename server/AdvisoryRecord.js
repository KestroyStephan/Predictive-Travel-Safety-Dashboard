// server/models/AdvisoryRecord.js
import mongoose from "mongoose";

const AdvisorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // from Google OAuth (JWT sub)

    ipInfo: {
      query: String,
      country: String,
      countryCode: String,
      region: String,
      city: String,
      lat: Number,
      lon: Number
    },

    advisory: {
      countryCode: { type: String, required: true },
      countryName: String,
      score: Number,
      message: String,
      updated: String
    },

    meta: {
      fetchedAt: String,
      source: String
    }
  },
  {
    timestamps: true // createdAt, updatedAt
  }
);

export const AdvisoryRecord = mongoose.model("AdvisoryRecord", AdvisorySchema);
