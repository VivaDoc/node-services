import mongoose = require("mongoose")

import * as TOG from "../tag-owner-group";
import { FileReviewWithMetadata } from "../github-app/review";
import * as AppError from "../app-error";
import * as F from "../functional";
import * as UA from "../user-assessment";


export interface CommitReview {
  repoId: number,
  repoName: string,
  repoFullName: string,
  branchName: string,
  commitId: string,
  pullRequestNumber: number,
  fileReviews: FileReviewWithMetadata[],
  approvedTags: string[],
  rejectedTags: string[],
  userAssessments: UA.UserAssessment[],
  tagsOwnerGroups: TOG.TagOwnerGroups[],
}


const CommitReviewSchema = new mongoose.Schema({
  repoId: { type: Number, required: [true, "can't be blank"], index: true },
  repoName: { type: String, required: [true, "can't be blank"] },
  repoFullName: { type: String, required: [true, "can't be blank"] },
  branchName: { type: String, required: [true, "can't be blank"] },
  commitId: { type: String, required: [true, "can't be blank"], index: true },
  pullRequestNumber: { type: Number, required: [true, "can't be blank"] },
  fileReviews: { type: mongoose.Schema.Types.Mixed, required: [true, "can't be blank"] },
  approvedTags: { type: [ String ], required: [true, "can't be blank"] },
  rejectedTags: { type: [ String ], required: [true, "can't be blank"] },
  userAssessments: { type: [ { _id: false, username: String, tagId: String, assessmentType: String } ], required: [true, "can't be blank"] },
  tagsOwnerGroups: { type: [ { _id: false, tagId: String, groups: [ [ String ] ] } ], required: [true, "can't be blank"]},
});


const CommitReviewModel = mongoose.model("CommitReview", CommitReviewSchema);


/* DB HELPER FUNCTIONS */


// Saves a new commit review.
//
// @THROWS `AppError.LogFriendlyGithubAppError` upon failure to save new commit.
export const newCommitReview = async (installationId: number, commitReviewObject: CommitReview): Promise<void> => {

  try {
    const commitReview = new CommitReviewModel(commitReviewObject);
    await commitReview.save();

  } catch (err) {

    const saveCommitLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "save-new-commit-review-failure",
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        commitReviewObject
      }
    }

    throw saveCommitLoggableError;
  }

}


// Retrieve a commit review that should already exist.
//
// @THROWS `AppError.LogFriendlyGithubAppError` upon failure to find/retrieve commit review.
export const getExistantCommitReview = async (installationId: number, repoId: number, commitId: string): Promise<CommitReview> => {

  try {

    const commitReview = await CommitReviewModel.findOne({ repoId, commitId }).exec();

    if (commitReview === null) {
      throw "Query executed but commit review not found";
    }

    return commitReview.toObject();

  } catch (getCommitReviewErr) {

    const getCommitReviewLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "get-existant-commit-review-failure",
      installationId,
      stack: AppError.getStack(),
      isSevere: false,
      data: {
        getCommitReviewErr,
        repoId,
        commitId
      }
    };

    throw getCommitReviewLoggableError;
  }
}


// Returns a commit review if it exists, `null` otherwise.
// @THROWS `AppError.LogFriendlyGithubAppError` upon failure to execute mongo query.
export const getPossiblyExistantCommitReview =
  async ( installationId: number
        , repoId: number
        , commitId: string
        ): Promise<F.Maybe<CommitReview>> => {

  try {
    const commitReview = await CommitReviewModel.findOne({ repoId, commitId }).exec();

    if (commitReview === null) { return null; }

    return commitReview.toObject();

  } catch (err) {

    const getCommitReviewLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "get-possibly-existant-commit-review-failure",
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        repoId,
        commitId
      }
    };

    throw getCommitReviewLoggableError;
  }
}


// The fields on the `PullRequestReview` that are updated directly and only ported to the `CommitReview` once the head
// head commit pushes forward.
interface PullRequestReviewHeadXXXFields {
  headCommitApprovedTags: string[] | null;
  headCommitRejectedTags: string[] | null;
  headCommitUserAssessments: UA.UserAssessment[] | null;
  headCommitTagsOwnerGroups: TOG.TagOwnerGroups[] | null;
}


// Returns all the `PullRequestReviewHeadXXXFields` fields for a possibly existant commit review. If the commit review
// does not exist they will all be `null`, otherwise they will be the respective values from the commit review.
//
// @THROWS `AppError.LogFriendlyGithubAppError` upon failure to execute mongo query.
export const getPullRequestReviewHeadXXXDataFromPossiblyExistantCommitReview =
  async ( installationId: number
        , repoId: number
        , commitId: string
        ): Promise<PullRequestReviewHeadXXXFields> => {

  const maybeCommitReview = await getPossiblyExistantCommitReview(installationId, repoId, commitId);

  if (maybeCommitReview === null) {
    return {
      headCommitApprovedTags: null,
      headCommitRejectedTags: null,
      headCommitUserAssessments: null,
      headCommitTagsOwnerGroups: null
    };
  }

  return {
    headCommitApprovedTags: maybeCommitReview.approvedTags,
    headCommitRejectedTags: maybeCommitReview.rejectedTags,
    headCommitUserAssessments: maybeCommitReview.userAssessments,
    headCommitTagsOwnerGroups: maybeCommitReview.tagsOwnerGroups
  };
}


// Delete commit reviews which have a repoId in `repoIds`.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed deletion.
export const deleteCommitReviewsForRepos =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ): Promise<void> => {

  try {

    const deleteCommitReviewsResult = await CommitReviewModel.deleteMany({ repoId: { $in: repoIds } }).exec();

    if (deleteCommitReviewsResult.ok !== 1) {
      throw `delete commit review result not ok: ${deleteCommitReviewsResult.ok}`;
    }

  } catch (err) {

    const deleteCommitReviewsLoggableError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: err
    }

    throw deleteCommitReviewsLoggableError;
  }

}


// Save some data to a commit review.
//
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed update.
export const updateCommitReview =
  async ( installationId: number
        , repoId: number
        , pullRequestNumber: number
        , commitId: string
        , finalApprovedTags: string[]
        , finalRejectedTags: string[]
        , finalUserAssessments: UA.UserAssessment[]
        , errorName: string
        ) => {

  try {

    const commitReviewUpdateResult = await CommitReviewModel.update(
      { repoId, pullRequestNumber, commitId },
      {
        approvedTags: finalApprovedTags,
        rejectedTags: finalRejectedTags,
        userAssessments: finalUserAssessments,
      }
    ).exec();

    if ( commitReviewUpdateResult.ok !== 1 || commitReviewUpdateResult.n !== 1 ) {

      throw { updateQueryFailure: true
            , ok: commitReviewUpdateResult.ok
            , n: commitReviewUpdateResult.n
            , nModified: commitReviewUpdateResult.nModified
            }
    }

  } catch (err) {

    const updateCommitReviewLoggableError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
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

    throw updateCommitReviewLoggableError;
  }

}
