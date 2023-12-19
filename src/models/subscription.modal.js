import mongoose, { Schema } from "mongoose";

const subscriptionSchema = mongoose.Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
    },
    channels: {
      type: Schema.Types.ObjectId, // channels which user is subscriber -- channels is also a user
      ref: "User",
    },
  },
  { timestamps: true }
);
