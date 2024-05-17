import { HelpReq } from "../models/helpReq.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandeler.js";
import mongoose from "mongoose";

const addHelpReq = asyncHandler(async (req, res) => {
  const {
    disaster,
    addressLine1,
    addressLine2,
    state,
    pincode,
    message,
  } = req.body;

  if (
    !disaster ||
    disaster?.trim() === "" ||
    !addressLine1 ||
    addressLine1.trim() === "" ||
    !state ||
    state.trim() === "" ||
    !pincode ||
    pincode.trim() === ""
  )
    throw new ApiError(400, "Please fill required fields");

  const helpReq = await HelpReq.create({
    seeker: req.user?._id,
    disaster,
    address: {
      addressLine1,
      addressLine2,
      state,
      pincode,
    },
    message,
  });

  if (!helpReq) throw new ApiError(500, "something went wrong");

  return res
    .status(200)
    .json(new ApiResponse(200, helpReq, "Help request added successfully"));
});

const getHelpReq = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { pincode, disaster } = req.body;

  let myMatch = {};
  if (pincode && pincode.trim() != "") {
    myMatch["address.pincode"] = {
      $gte: Number(pincode) - 3,
      $lte: Number(pincode) + 3,
    };
  }
  if (disaster && disaster.trim() != "") myMatch.disaster = disaster;

  let myAggregate = HelpReq.aggregate([
    {
      $match: myMatch,
    },
    {
      $lookup: {
        from: "users",
        localField: "seeker",
        foreignField: "_id",
        as: "seeker",
        pipeline: [
          {
            $project: {
              username: 1,
              email: 1,
              fullName: 1,
              avatar: 1,
              isVolunteer: 1,
              gender: 1,
              DOB: 1,
              interest: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        seeker: {
          $first: "$seeker",
        },
      },
    },
  ]);

  let options = {
    page,
    limit,
  };

  let helps;
  await HelpReq.aggregatePaginate(myAggregate, options, (err, results) => {
    if (err) {
      throw new ApiError(500, err);
    }

    if (results) {
      helps = results;
    }
  });

  if (!helps) throw new ApiError(500, "something went wrong");

  return res
    .status(200)
    .json(new ApiResponse(200, helps, "Help request fetched successfully"));
});

const changeStatus = asyncHandler(async (req, res) => {
  const { helpReqID } = req.params;

  if (!helpReqID) throw new ApiError(404, "helpReqID is required");

  const helpReq = await HelpReq.findById(helpReqID);
  if (!helpReq) throw new ApiError(404, "Help request not found");

  const help = await HelpReq.findByIdAndUpdate(
    helpReqID,
    { isAccepted: true, volunteer: req.user?._id },
    { new: true }
  );

  if (!help) throw new ApiError(500, "something went wrong");

  return res
    .status(200)
    .json(new ApiResponse(200, help, "Help request accepted successfully"));
});

const getHelpReqById = asyncHandler(async (req, res) => {
  const { helpReqID } = req.params;

  if (!helpReqID) throw new ApiError(404, "helpReqID is required");

  const helpReq = await HelpReq.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(helpReqID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "seeker",
        foreignField: "_id",
        as: "seeker",
				pipeline: [
					{
						$project: {
							username: 1,
							email: 1,
							fullName: 1,
							avatar: 1,
							isVolunteer: 1,
							gender: 1,
							DOB: 1,
							interest: 1
						}
					}
				]
      },
    },
    {
      $addFields: {
        seeker: {
          $first: "$seeker",
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "volunteer",
        foreignField: "_id",
        as: "volunteer",
				pipeline: [
					{
						$project: {
							username: 1,
							email: 1,
							fullName: 1,
							avatar: 1,
							isVolunteer: 1,
							gender: 1,
							DOB: 1,
							interest: 1
						}
					}
				]
      },
    },
    {
      $addFields: {
        volunteer: {
          $first: "$volunteer",
        },
      },
    },
  ]);
  if (!helpReq) throw new ApiError(404, "Help request not found");

  return res
    .status(200)
    .json(new ApiResponse(200, helpReq, "Help request fetched successfully"));
});

export { addHelpReq, getHelpReq, changeStatus, getHelpReqById };
