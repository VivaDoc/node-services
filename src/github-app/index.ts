// Base module for probot app.

// WARNING: Do not import internal modules that use mongoose here, import them below.
import { config } from "./config";
import * as UA from "../user-assessment";
import * as Probot from 'probot' // eslint-disable-line no-unused-vars
import R from "ramda"

import mongoose = require("mongoose")
import * as MongoHelpers from "../mongo-helpers";
MongoHelpers.connectMongoose(mongoose, config.mongoDbUri);
require("../models/loader");

// All imports to internal modules that require the mongoose models should be after `require("../models/loader");`
import * as Installation from "../models/Installation";
import * as CommitReview from "../models/CommitReview";
import * as PullRequestReview from "../models/PullRequestReview";
import * as Analysis from "./analysis"
import * as AppError from "../app-error"
import * as PromisesExtra from "../promises-extra"
import * as GH from "./github-helpers";


export = (app: Probot.Application) => {


  app.on("installation.created", async (context) => {
    AppError.webhookErrorWrapper("installation.created", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id
      const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

      const repoIdsAndNames: GH.RepoIdAndName[] = R.map((repo) => {
        return { repoName: repo.name, repoId: repo.id };
      }, payload.repositories);

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

      await Installation.newInstallation(installationId, owner, repoIds, "init-repo-failure");

      await analyzeAlreadyOpenPrsForRepos(installationId, context, owner, repoIdsAndNames);

    });
  });


  app.on("installation.deleted", async (context) => {
    AppError.webhookErrorWrapper("installation.deleted", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id

      const deletedInstallation: Installation.Installation = await Installation.deleteInstallation(installationId);

      await CommitReview.deleteCommitReviewsForRepos(
        installationId,
        deletedInstallation.repoIds,
        "delete-repo-delete-commit-reviews-failure"
      );

      await PullRequestReview.deletePullRequestReviewsForRepos(
        installationId,
        deletedInstallation.repoIds,
        "delete-repo-delete-pull-request-reviews-failure"
      );

    });
  });


  app.on("installation_repositories.added", async (context) => {
    AppError.webhookErrorWrapper("installation_repositories.added", async () => {

      const payload = context.payload
      const installationId = (payload.installation as any).id
      const owner = (payload.installation as any).account.login // TODO shold this be the id of the owner?

      const repoIdsAndNames: GH.RepoIdAndName[] = R.map((repoAdded) => {
        return { repoName: repoAdded.name, repoId: repoAdded.id };
      }, payload.repositories_added);

      const repoIds = R.map(({ repoId }) => repoId, repoIdsAndNames);

      await Installation.addReposToInstallation(installationId, repoIds, "add-repos-failure");

      await analyzeAlreadyOpenPrsForRepos(installationId, context, owner, repoIdsAndNames);

    });
  });


  app.on("installation_repositories.removed", async (context) => {
    AppError.webhookErrorWrapper("installation_repositories.removed", async () => {

      const payload = context.payload;
      const installationId = (payload.installation as any).id;
      const reposToRemove: number[] = R.map((repoToRemove) => {
        return repoToRemove.id
      }, payload.repositories_removed);

      await Installation.removeReposFromInstallation(installationId, reposToRemove, "remove-repos-failure");

      await CommitReview.deleteCommitReviewsForRepos(
        installationId,
        reposToRemove,
        "remove-repos-delete-commit-reviews-failure"
      );

      await PullRequestReview.deletePullRequestReviewsForRepos(
        installationId,
        reposToRemove,
        "remove-repos-delete-pull-request-reviews-failure"
      );

    });
  });


  app.on("pull_request.opened", async (context) => {
    AppError.webhookErrorWrapper("pull_request.opened", async () => {

      const prPayload = context.payload
      const { owner } = context.repo()
      const installationId = (prPayload.installation as any).id
      const repoId = (prPayload.repository as any).id
      const repoFullName: string = (prPayload.repository as any).full_name
      const repoName: string = (prPayload.repository as any).name
      const branchName: string = (prPayload.pull_request as any).head.ref
      const pullRequestId: number = (prPayload.pull_request as any).id
      const pullRequestNumber: number = (prPayload.pull_request as any).number
      const headCommitId = (prPayload.pull_request as any).head.sha

      const baseBranchName = (prPayload.pull_request as any).base.ref

      await analyzeNewPullRequest(
        installationId,
        context,
        owner,
        repoId,
        repoName,
        repoFullName,
        branchName,
        baseBranchName,
        pullRequestId,
        pullRequestNumber,
        headCommitId
      );

    });
  });


  app.on("pull_request.synchronize", async (context) => {
    AppError.webhookErrorWrapper("pull_request.synchronize", async () => {

      const syncPayload = context.payload;
      const installationId = (syncPayload.installation as any).id
      const repoId = (syncPayload.repository as any).id
      const repoName: string = (syncPayload.repository as any).name
      const { owner } = context.repo()
      const pullRequestNumber = (syncPayload.pull_request as any).number;
      const headCommitId = (syncPayload.pull_request as any).head.sha;

      await analyzeOldPullRequest(
        installationId,
        context,
        repoId,
        owner,
        repoName,
        pullRequestNumber,
        headCommitId
      );

    });
  });

}


// @THROWS either:
//  - single `AppError.LogFriendlyGithubAppError` if unable to update commit review.
//  - array of `AppError.LogFriendlyGithubAppError` for each of:
//     1. unable to update commit review
//     2. unable to remove headCommitId from pending commit analysis
const analyzeOldPullRequest =
  async ( installationId: number
        , context: Probot.Context
        , repoId: number
        , owner: string
        , repoName: string
        , pullRequestNumber: number
        , headCommitId: string
        ) : Promise<void> => {


  const { previousPullRequestReviewObject, newPullRequestReviewObject } = await PullRequestReview.updateOnPullRequestSync(
    installationId,
    repoId,
    pullRequestNumber,
    headCommitId
  );

  // No need to trigger pipeline if already analyzing commits.
  if (PullRequestReview.isAnalyzingCommits(previousPullRequestReviewObject)) { return; }

  try {

    const headCommitReviewWasPreviouslySuccessfullySaved = PullRequestReview.commitSavedSuccessfully(
      previousPullRequestReviewObject,
      previousPullRequestReviewObject.headCommitId
    );

    if (headCommitReviewWasPreviouslySuccessfullySaved) {

      await CommitReview.updateCommitReview(
        installationId,
        repoId,
        pullRequestNumber,
        previousPullRequestReviewObject.headCommitId,
        previousPullRequestReviewObject.headCommitApprovedTags as string[],
        previousPullRequestReviewObject.headCommitRejectedTags as string[],
        previousPullRequestReviewObject.headCommitUserAssessments as UA.UserAssessment[],
        "update-commit-review-failure"
      );

    }

  } catch (updateCommitReviewError) {

    await PullRequestReview.clearPendingCommitOnAnalysisFailure(
      installationId,
      repoId,
      pullRequestNumber,
      headCommitId,
      {
        commitReviewError: true,
        commitId: previousPullRequestReviewObject.headCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      },
      updateCommitReviewError
    );
  }

  await Analysis.pipeline(
    installationId,
    newPullRequestReviewObject,
    getClientUrlForCommitReview(repoId, pullRequestNumber),
    () => GH.listPullRequestCommits(installationId, context, owner, repoName, pullRequestNumber),
    GH.retrieveDiff(installationId, context, owner, repoName),
    GH.retrieveFile(installationId, context, owner, repoName),
    GH.setCommitStatus(installationId, context, owner, repoName),
    GH.getMostRecentCommonAncestor(installationId, context, owner, repoName, newPullRequestReviewObject.baseBranchName)
  );

}


// @THROWS `AppError.LogFriendlyGithubAppError` if unable to create the new pull request review.
const analyzeNewPullRequest =
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoId: number
  , repoName: string
  , repoFullName: string
  , branchName: string
  , baseBranchName: string
  , pullRequestId: number
  , pullRequestNumber: number
  , headCommitId : string
  ) : Promise<void> => {

  const pullRequestReviewObject = await PullRequestReview.newPullRequestReview(
    installationId,
    repoId,
    repoName,
    repoFullName,
    branchName,
    baseBranchName,
    pullRequestId,
    pullRequestNumber,
    headCommitId,
  );

  await Analysis.pipeline(
    installationId,
    pullRequestReviewObject,
    getClientUrlForCommitReview(repoId, pullRequestNumber),
    () => GH.listPullRequestCommits(installationId, context, owner, repoName, pullRequestNumber),
    GH.retrieveDiff(installationId, context, owner, repoName),
    GH.retrieveFile(installationId, context, owner, repoName),
    GH.setCommitStatus(installationId, context, owner, repoName),
    GH.getMostRecentCommonAncestor(installationId, context, owner, repoName, baseBranchName)
  );

}


// @THROWS An array of errors, propogated from all the calls to `analyzeAlreadyOpenPrs`.
const analyzeAlreadyOpenPrsForRepos =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoIdsAndNames: GH.RepoIdAndName[]
        ): Promise<void> => {

  const settledPromises = await PromisesExtra.settleAll(
    repoIdsAndNames.map(async (repoIdAndName) => {
      return await analyzeAlreadyOpenPrs(installationId, context, owner, repoIdAndName);
    })
  );

  const rejectedSettlements = PromisesExtra.getRejectedSettlements(settledPromises);
  if (rejectedSettlements.length > 0) { throw rejectedSettlements; }
}


// @THROWS either:
//   - GithubApp.LoggableError
//   - An array of `GithubApp.LoggableError`, propogated by calls to `analyzeNewPullRequest`.
const analyzeAlreadyOpenPrs =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoIdAndName: GH.RepoIdAndName
        ): Promise<void> => {

  const openPrs = await GH.getOpenPullRequests(installationId, context, owner, repoIdAndName);

  const settledPromises = await PromisesExtra.settleAll(
    openPrs.map(async (openPr) => {

      const repoId = openPr.head.repo.id;
      const repoName = openPr.head.repo.name;
      const repoFullName = openPr.head.repo.full_name;
      const branchName = openPr.head.ref;
      const baseBranchName = openPr.base.ref;
      const pullRequestId = openPr.id;
      const pullRequestNumber = openPr.number;
      const headCommitId = openPr.head.sha;

      await analyzeNewPullRequest(
        installationId,
        context,
        owner,
        repoId,
        repoName,
        repoFullName,
        branchName,
        baseBranchName,
        pullRequestId,
        pullRequestNumber,
        headCommitId
      );

    })
  );

  const rejectedSettlements = PromisesExtra.getRejectedSettlements(settledPromises);
  if (rejectedSettlements.length > 0) { throw rejectedSettlements; }

}


// @THROWS never.
const getClientUrlForCommitReview = R.curry((repoId: number, prNumber: number, commitId: string): string => {
  return `${config.webClientOrigin}/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
})
