import { asyncHandler } from "../utils/asyncHandeler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import fs from "fs";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong"
    );
  }
};

const checkInput = (req) => {
	const { fullName, email, username, isVolunteer, gender, DOB, interest, password } = req.body;
	const avatarLocalPath = req.file?.path;

	const arr = [fullName, email, username, isVolunteer, gender, DOB, interest, password, avatarLocalPath];
	const fields = ["fullName", "email", "username", "isVolunteer", "gender", "DOB", "interest", "password", "avatarLocalPath"]

	let result = {};

	for (let i = 0; i < arr.length; i++) {
    const fieldName = fields[i];
		if(arr[i] && arr[i]?.trim() != "") {
			result[fieldName] = arr[i].trim();
		} else {
			result[fieldName] = false
		}
	}

	return result
}

const registerUser = asyncHandler(async (req, res) => {
  const {fullName, email, username, isVolunteer, gender, DOB, interest, password, avatarLocalPath} = checkInput(req);

  async function deleteLocalFile(avatar) {
    if (avatar) fs.unlinkSync(avatar);
  }

  if (!(fullName || email || username || isVolunteer || gender || DOB || password || avatarLocalPath)) {
    deleteLocalFile(avatarLocalPath);
    throw new ApiError(400, "Please fill required fields");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    deleteLocalFile(avatarLocalPath);
    throw new ApiError(409, "user with email or username already exists");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "avatar cloud url does not get");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.secure_url,
    email,
    password,
    username: username.toLowerCase(),
		isVolunteer,
		gender,
    DOB,
    interest: interest || "",
  });

  const createduser = await User.findById(user._id).select(
    "-password -refreshToken" // syntax hi aisa hai. iske andar jo field name rahega usko chodke sara select ho jayega
  );

  if (!createduser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const { accessToken, refreshToken } = await generateTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: createduser,
          accessToken,
          refreshToken,
        },
        "User registered Successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = checkInput(req);

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credential");
  }

  const { accessToken, refreshToken } = await generateTokens(
    user._id
  );

  // send token to secure cookie
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // by default cookie sab modify kar sakte hai. below code karne se humara cookie only server se modify hoga.
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // token bhej rahe hai agar user ki jarorat ho.
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; // mobile se cookies body mai ate hai

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken, // token bhej rahe hai agar user ki jarorat ho.
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullName, email, username, isVolunteer, gender, DOB, interest} = checkInput(req);

  if (fullName) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        fullName,
      },
    });
  }

  if (email) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        email,
      },
    });
  }

  if (username) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        username,
      },
    });
  }

  if (isVolunteer) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        isVolunteer,
      },
    });
  }
  if (gender) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        gender,
      },
    });
  }
  if (DOB) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        DOB,
      },
    });
  }
  if (interest) {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: {
        interest: interest || "",
      },
    });
  }

  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  await deleteFromCloudinary(req.user?.avatar);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar
};