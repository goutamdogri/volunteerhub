import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { addHelpReq, getHelpReq, changeStatus, getHelpReqById } from "../controllers/helpReq.controller.js"

const router = Router()
router.use(verifyJWT);

router.route("/addHelpReq").post(addHelpReq)
router.route("/getHelpReq").get(getHelpReq)
router.route("/changeStatus/:helpReqID").patch(changeStatus)
router.route("/getHelpReqById/:helpReqID").get(getHelpReqById)

export default router