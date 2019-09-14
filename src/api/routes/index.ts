import Express from "express";

import UserRoutes from "./users";
import ReviewRoutes from "./reviews";
import RepoRoutes from "./repo";


const apiBase = "/api";
const expressRouter = Express.Router();

expressRouter.use(apiBase, UserRoutes);
expressRouter.use(apiBase, ReviewRoutes);
expressRouter.use(apiBase, RepoRoutes);


export = expressRouter;
