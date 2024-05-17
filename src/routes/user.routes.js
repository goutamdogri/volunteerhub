import { Router } from 'express';
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getVolunteer
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
// import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(upload.single("avatar"),registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-route").post(refreshAccessToken)

// secured routes
router.route("/logout").post(logoutUser)
router.route("/change-password").post(changeCurrentPassword)
router.route("/current-user").get(getCurrentUser)
router.route("/update-account").patch(updateAccountDetails)
router.route("/avatar").patch(upload.single("avatar"), updateUserAvatar)
router.route("/getVolunteer").get(getVolunteer)

export default router