import mongoose = require("mongoose")

import * as R from "ramda";
import * as AppError from "../app-error";
import * as F from "../functional";
import * as UA from "../user-assessment";
import * as TOG from "../tag-owner-group";
import * as CommitReview from "./CommitReview";


export interface PullRequestReview {
  repoId: number,
  repoName: string,
  repoFullName: string,
  branchName: string,
  baseBranchName: string,
  pullRequestId: number,
  pullRequestNumber: number,
  headCommitId: string,
  headCommitApprovedTags: string[] | null,
  headCommitRejectedTags: string[] | null,
  headCommitUserAssessments: UA.UserAssessment[] | null,
  headCommitTagsOwnerGroups: TOG.TagOwnerGroups[] | null,
  pendingAnalysisForCommits: string[],
  analyzedCommitsWithSuccessStatus: string[],
  analyzedCommits: string[],
  commitReviewErrors: CommitReviewError[]
}


// Errors on commit reviews with a possbile `clientExplanation` meant to be rendered to the user.
//
// @VD amilner42 block
export interface CommitReviewError {
  commitReviewError: true;
  commitId: string;
  failedToSaveCommitReview: boolean;
  clientExplanation: string;
}
// @VD end-block


const PullRequestReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  baseBranchName: { type: String, required: [true, "can't be blank"] },
  pullRequestId: { type: Number, required: [true, "can't be blank" ] },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"], index: true },
  headCommitId: { type: String, required: [true, "can't be blank"], index: true },
  headCommitApprovedTags: { type: [ String ] },
  headCommitRejectedTags: { type: [String ] },
  headCommitUserAssessments: { type: [ { _id: false, username: String, tagId: String, assessmentType: String } ] },
  headCommitTagsOwnerGroups: { type: [ { _id: false, tagId: String, groups: [ [ String ] ] } ] },
  pendingAnalysisForCommits: { type: [ String ], required: [ true, "can't be blank"] },
  analyzedCommitsWithSuccessStatus: { type: [ String ], required: [ true, "can't be blank" ] },
  analyzedCommits: { type: [ String ], required: [ true, "can't be blank"] },
  commitReviewErrors: { type:  [ mongoose.Schema.Types.Mixed ], required: [true, "can't be blank"] }
});


const PullRequestReviewModel = mongoose.model("PullRequestReview", PullRequestReviewSchema);


// @THROWS `AppError.LogFriendlyGithubAppError` if upon failure to create new PRReview.
export const newPullRequestReview =
  async ( installationId: number
        , repoId: number
        , repoName: string
        , repoFullName: string
        , branchName: string
        , baseBranchName: string
        , pullRequestId: number
        , pullRequestNumber: number
        , headCommitId: string
      ): Promise<PullRequestReview> => {

  try {

    const pullRequestReviewObject: PullRequestReview = {
      repoId,
      repoName,
      repoFullName,
      branchName,
      baseBranchName,
      pullRequestId,
      pullRequestNumber,
      headCommitId,
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitUserAssessments: null,
      headCommitTagsOwnerGroups: null,
      pendingAnalysisForCommits: [ headCommitId ],
      analyzedCommitsWithSuccessStatus: [],
      analyzedCommits: [],
      commitReviewErrors: [],
    };

    const pullRequestReview = new PullRequestReviewModel(pullRequestReviewObject);

    await pullRequestReview.save();

    return pullRequestReviewObject;

  } catch (err) {

    const newPRLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "create-new-pull-request-failure",
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        repoName,
        repoFullName,
        branchName,
        baseBranchName,
        pullRequestId,
        pullRequestNumber,
        headCommitId
      }
    };

    throw newPRLoggableError;
  }

}


// Deletes all PullRequestReviews which have a repoId in `repoIds`.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed deletion.
export const deletePullRequestReviewsForRepos =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ) : Promise<void> => {

  try {

    const deletePullRequestReviewsResult =
      await PullRequestReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

    if (deletePullRequestReviewsResult.ok !== 1) {
      throw `delete pull request result not ok: ${deletePullRequestReviewsResult.ok}`;
    }

  } catch (err) {

    const deletePullRequestReviewLoggableError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack()
    }

    throw deletePullRequestReviewLoggableError;
  }

}


// Handles updating the PullRequestReview for a call from the PR sync webhook.
//
// @RETURNS The previous (prior to update) and new pull request object.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure.
export const updateOnPullRequestSync =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
      ): Promise<{ previousPullRequestReviewObject: PullRequestReview, newPullRequestReviewObject: PullRequestReview }> => {

  try {

    // In case of rebase we may need to fetch old commit review fields if theyve already been calculated.
    const { headCommitApprovedTags
          , headCommitRejectedTags
          , headCommitUserAssessments
          , headCommitTagsOwnerGroups } =
      await CommitReview.getPullRequestReviewHeadXXXDataFromPossiblyExistantCommitReview(
        installationId,
        repoId,
        headCommitId
      );

    const pullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $push: { "pendingAnalysisForCommits": headCommitId },
        headCommitId: headCommitId,
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups,
      },
      {
        new: false
      }
    ).exec();

    if (pullRequestReview === null) {
      const errMessage =
        `Missing PullRequestReview object for --- repoId: ${repoId}, prNumber: ${pullRequestNumber}`

      throw errMessage;
    }

    const previousPullRequestReviewObject: PullRequestReview = pullRequestReview.toObject();

    const newPullRequestReviewObject: PullRequestReview = {
      ...previousPullRequestReviewObject,
      ...{
        headCommitId,
        pendingAnalysisForCommits: previousPullRequestReviewObject.pendingAnalysisForCommits.concat(headCommitId),
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups
      }
    }

    return { previousPullRequestReviewObject, newPullRequestReviewObject };

  } catch (err) {

    const updateHeadCommitOnPullRequestReviewLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "update-pull-request-review-sync-failure",
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack()
    }

    throw updateHeadCommitOnPullRequestReviewLoggableError;
  }

}


// Updates the PullRequestReview given that the analysis completed for a commit that is no longer the head commit.
//
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure.
export const updateOnCompleteAnalysisForNonHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , analyzedCommitId: string
        , currentCommitIsSuccess: boolean
        ): Promise<PullRequestReview> => {

  const mongoPushObject =
    currentCommitIsSuccess
      ? { "analyzedCommits": analyzedCommitId, "analyzedCommitsWithSuccessStatus": analyzedCommitId }
      : { "analyzedCommits": analyzedCommitId  }

  try {

    const updatedPullRequestReview = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      {
        $pull: { pendingAnalysisForCommits: analyzedCommitId },
        $push: mongoPushObject
      },
      {
        new: true
      }
    ).exec();

    if (updatedPullRequestReview === null) {
      throw `Failed to find pull request review`
    }

    return updatedPullRequestReview.toObject();

  } catch (err) {

    const updatePullRequestLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "update-non-head-fields-on-pr-failed",
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        analyzedCommitId
      }
    };

    throw updatePullRequestLoggableError;
  }

}


// Updates the PullRequestReview assuming it is still the head commit.
//
// If it worked, returns "success", if it was no longer the head commit, returns "no-longer-head-commit".
//
// @THROWS `AppError.LogFriendlyGithubAppError` if the mongo query failed to execute properly.
export const updateOnCompleteAnalysisForHeadCommit =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , headCommitId: string
        , headCommitApprovedTags: string[]
        , headCommitRejectedTags: string[]
        , headCommitUserAssessments: UA.UserAssessment[]
        , headCommitTagsOwnerGroups: TOG.TagOwnerGroups[]
        ): Promise<"success" | "no-longer-head-commit"> => {

  try {

    const totalNumberOfTags = headCommitTagsOwnerGroups.length;
    const currentCommitIsSuccess = headCommitApprovedTags.length === totalNumberOfTags;

    const mongoPushObject =
      currentCommitIsSuccess
        ? { analyzedCommits: headCommitId, analyzedCommitsWithSuccessStatus: headCommitId }
        : { analyzedCommits: headCommitId }

    const updatePullRequestReviewResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId
      },
      {
        headCommitApprovedTags,
        headCommitRejectedTags,
        headCommitUserAssessments,
        headCommitTagsOwnerGroups,
        $pull: { pendingAnalysisForCommits: headCommitId },
        $push: mongoPushObject
      }
    ).exec();

    if (updatePullRequestReviewResult.ok !== 1) {
      throw `mongo query was not ok: ${updatePullRequestReviewResult.ok}`;
    }

    if (updatePullRequestReviewResult.n === 1 && updatePullRequestReviewResult.nModified === 1) {
      return "success";
    }
    return "no-longer-head-commit";

  } catch (err) {

    const updatePRLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "update-pr-head-commit-fields-failure",
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        headCommitId
      }
    };

    throw updatePRLoggableError;
  }
}


// Clears a commit from the `pendingAnalysisForCommits` and optionally add err to `commitReviewErrors`.
//
// @THROWS
//  if `andThrowError` is not null then it will always throw, either:
//   - Just `andThrowError` if successfully cleared pending commit.
//   - Array with [ `andThrowError`, `AppError.LogFriendlyGithubAppError` from the failure ]
// else:
//    will throw `AppError.LogFriendlyGithubAppError` if it errors to clear the pending commit.
export const clearPendingCommitOnAnalysisFailure =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , commitId: string
        , commitReviewError: F.Maybe<CommitReviewError>
        , andThrowError: F.Maybe<any>
      ): Promise<PullRequestReview>  => {

  let pullRequestReviewDoc: mongoose.Document | null;

  try {

    const updateFields =
      commitReviewError !== null
        ? {
            $pull: { pendingAnalysisForCommits: commitId },
            $addToSet: { "commitReviewErrors": commitReviewError }
          }
        : {
            $pull: { pendingAnalysisForCommits: commitId }
          }

    pullRequestReviewDoc = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      updateFields,
      { new: true }
    ).exec();

    if (pullRequestReviewDoc === null) {
      throw `Unable to find pull request review.`
    }

  } catch (err) {

    const clearPendingAnalysisOnFailureLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "clear-pending-analysis-on-analysis-failure-failure",
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        commitId
      }
    };

    if (andThrowError !== null) {
      throw [ andThrowError, clearPendingAnalysisOnFailureLoggableError ];
    } else {
      throw clearPendingAnalysisOnFailureLoggableError;
    }
  }

  if (andThrowError !== null) {
    throw andThrowError;
  }

  return pullRequestReviewDoc.toObject();
}


export const clearPendingCommitOnAnalysisSkip =
  async (installationId: number
  , repoId: number
  , pullRequestNumber: number
  , commitId: string
  ): Promise<PullRequestReview>=> {

  try {

    const newPullRequestReviewDoc = await PullRequestReviewModel.findOneAndUpdate(
      { repoId, pullRequestNumber },
      { $pull: { pendingAnalysisForCommits: commitId } },
      { new: true }
    );

    if (newPullRequestReviewDoc === null) {
      throw `Unable to find pull request review.`
    }

    return newPullRequestReviewDoc.toObject();

  } catch (err) {

    const clearPendingCommitOnAnalysisSkipLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "clear-pending-commit-on-analysis-skip-failure",
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        pullRequestNumber,
        commitId
      }
    };

    throw clearPendingCommitOnAnalysisSkipLoggableError;
  }
}


export const isAnalyzingCommits = (pullRequestReview: PullRequestReview): boolean => {
  return pullRequestReview.pendingAnalysisForCommits.length !== 0;
}


export const getErrorForCommitReview =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): F.Maybe<CommitReviewError> => {

  const err = R.find(R.propEq("commitId", commitId), pullRequestReview.commitReviewErrors);

  if (err === undefined) { return null; }

  return err;
}


export const hasErrorForCommitReview =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): boolean => {

  const err = getErrorForCommitReview(pullRequestReview, commitId);

  return F.isJust(err);
}


export const commitSavedSuccessfully =
  ( pullRequestReview: PullRequestReview
  , commitId: string
  ): boolean => {

  const err = getErrorForCommitReview(pullRequestReview, commitId);

  if (err === null) { return true; }

  return !err.failedToSaveCommitReview;
}


export const COMMIT_REVIEW_ERROR_MESSAGES = {
  internal: "An internal error occurred, Arie has been notified to review the problem.",
  githubIssue: "The github API was not responding to our queries so we couldn't analyze this commit..."
}
