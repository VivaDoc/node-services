import * as ClientErrors from "../client-errors";
import * as GithubApp from "../github-app";
import * as GithubApi from "../github-api";
import * as Verify from "../verify";
import Express from "express";


const expressRouter = Express.Router();


expressRouter.get('/repo/:repoId/open-pull-requests'
, async function (req, res, next) {

  const repoId = Verify.isInt(req.params.repoId, ClientErrors.invalidUrlParams("Repo ID must be a number."));

  const user = Verify.getLoggedInUser(req);
  const basicUserData = await GithubApi.getBasicUserData(user.username, user.accessToken);
  const basicRepoInfo = Verify.hasAccessToRepo(basicUserData, repoId);

  const installationObject = await Verify.getInstallationObject(repoId);

  const openPullRequests = await GithubApp.getOpenPullRequests(
    installationObject.installationId,
    installationObject.owner,
    basicRepoInfo.full_name.split("/")[1]
  );

  return res.json(openPullRequests);
});


export = expressRouter;
