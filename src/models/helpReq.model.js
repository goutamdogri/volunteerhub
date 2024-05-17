import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const helpReqSchema = new Schema(
  {
    seeker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    disaster: {
      type: String,
      required: true,
    },
    address: {
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: {
        type: String,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: Number,
        required: true,
      },
    },
    message: {
      type: String,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    volunteer: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

helpReqSchema.plugin(mongooseAggregatePaginate);

export const HelpReq = mongoose.model("HelpReq", helpReqSchema);
