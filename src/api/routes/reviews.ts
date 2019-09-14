import * as R from "ramda";
import Express from "express";

import * as Verify from "../verify";
import * as ClientErrors from "../client-errors";
import * as GithubApp from "../github-app";
import * as GithubApi from "../github-api";
import * as MongoHelpers from "../../mongo-helpers";
import * as UA from "../../user-assessment";
import * as TOG from "../../tag-owner-group";


const mongoose = require('mongoose');
const PullRequestReviewModel = mongoose.model('PullRequestReview');


const expressRouter = Express.Router();


expressRouter.get('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = Verify.isInt(req.params.repoId, ClientErrors.invalidUrlParams("Repo ID must be a number."));

    const user = Verify.getLoggedInUser(req);
    const basicUserData = await GithubApi.getBasicUserData(user.username, user.accessToken);
    Verify.hasAccessToRepo(basicUserData, repoId);

    const pullRequestReviewObject = await Verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    if (R.contains(commitId, pullRequestReviewObject.pendingAnalysisForCommits)) {
      return res.json(
        {
          responseTag: "pending",
          headCommitId: pullRequestReviewObject.headCommitId,
          forCommits: pullRequestReviewObject.pendingAnalysisForCommits
        }
      );
    }

    const err = R.find(R.propEq("commitId", commitId), pullRequestReviewObject.commitReviewErrors);
    if (err !== undefined) {
      return res.json(
        {
          responseTag: "analysis-failed",
          headCommitId: pullRequestReviewObject.headCommitId,
          clientExplanation: err.clientExplanation
        }
      );
    }

    const commitReviewObject = await Verify.getCommitReviewObject(repoId, pullRequestNumber, commitId);

    if (pullRequestReviewObject.headCommitId === commitId) {
      // Casting here because we know it's not undefined given it is not still pending analysis.
      commitReviewObject.approvedTags = pullRequestReviewObject.headCommitApprovedTags as string[];
      commitReviewObject.rejectedTags = pullRequestReviewObject.headCommitRejectedTags as string[];
      commitReviewObject.userAssessments = pullRequestReviewObject.headCommitUserAssessments as UA.UserAssessment[];
    }

    return res.json({
      responseTag: "complete",
      headCommitId: pullRequestReviewObject.headCommitId,
      commitReview: commitReviewObject
    });

  } catch (err) {
    return next(err);
  }
});


expressRouter.post('/review/repo/:repoId/pr/:pullRequestNumber/commit/:commitId/userassessments'
, async function (req, res, next) {

  try {

    const { pullRequestNumber, commitId } = req.params;
    const repoId = Verify.isInt(req.params.repoId, ClientErrors.invalidUrlParams("Repo ID must be a number."));
    const tagIdsToApprove = Verify.isArrayOfString(
      req.body.approveTags, ClientErrors.invalidRequestBodyType(`Field 'approveTags' must contain an array of string.`)
    );
    const tagIdsToReject = Verify.isArrayOfString(
      req.body.rejectTags, ClientErrors.invalidRequestBodyType(`Field 'rejectTags' must contain an array of string.`)
    );
    const allTagIds = [ ...tagIdsToReject, ...tagIdsToApprove ];

    const user = Verify.getLoggedInUser(req);
    const username = user.username;
    const basicUserData = await GithubApi.getBasicUserData(username, user.accessToken);
    Verify.hasAccessToRepo(basicUserData, repoId);

    const newUserApprovalAssessments = createAssessments("approved", username, tagIdsToApprove);
    const newUserRejectionAssessments = createAssessments("rejected", username, tagIdsToReject);
    const newUserAssessments = [ ...newUserApprovalAssessments, ...newUserRejectionAssessments ];

    const pullRequestReviewObject = await Verify.getPullRequestReviewObject(repoId, pullRequestNumber);

    Verify.isLoadedHeadCommit(pullRequestReviewObject, commitId);
    Verify.ownsTags(pullRequestReviewObject.headCommitTagsOwnerGroups as TOG.TagOwnerGroups[], allTagIds, username);
    Verify.assessmentsAreForDifferentTags(allTagIds);

    const addUserAssessmentsResults = await addUserAssessments(
      repoId,
      pullRequestNumber,
      commitId,
      newUserAssessments,
      pullRequestReviewObject.headCommitTagsOwnerGroups as TOG.TagOwnerGroups[]
    );

    if ( allTagsApproved(
          (pullRequestReviewObject.headCommitTagsOwnerGroups as TOG.TagOwnerGroups[]).length,
          (pullRequestReviewObject.headCommitApprovedTags as string[]).length,
          addUserAssessmentsResults
         )
    ) {

      // TODO wrap in try-catch and handle error
      const repoName = pullRequestReviewObject.repoName;

      const installationObject = await Verify.getInstallationObject(repoId);
      await GithubApp.putSuccessStatusOnCommit(
        installationObject.installationId,
        installationObject.owner,
        repoName,
        repoId,
        pullRequestNumber,
        commitId
      );

    }

    return res.json(addUserAssessmentsResults);

  } catch (err) {
    return next(err);
  }

});


export = expressRouter;


// INTERNAL


// TODO Move
const createAssessments =
  ( assessmentType: UA.AssessmentType
  , username: string
  , tagIds: string[]
  ): UA.UserAssessment[] => {

  return tagIds.map(createAssessment(assessmentType, username));
}


// TODO Move
const createAssessment = R.curry(
  ( assessmentType: UA.AssessmentType
  , username: string
  , tagId: string
  ): UA.UserAssessment => {

  return { tagId, assessmentType, username };
});


// TODO Move
// TODO DOC
const allTagsApproved =
  ( totalTags: number
  , initialApprovedTags: number
  , addUserAssessmentsResults: any[]
  ) => {

  const numberOfNewApprovedTags = R.filter((addUserAssessmentResult) => {
    return addUserAssessmentResult.status === "approval-success" && addUserAssessmentResult.tagApproved;
  }, addUserAssessmentsResults).length;

  return (initialApprovedTags + numberOfNewApprovedTags) === totalTags;
}


type AddUserAssessmentResult = AddUserRejectionAssessmentResult | AddUserApprovalAssessmentResult;

type AddUserRejectionAssessmentResult = AddUserRejectionAssessmentSuccess | AddUserRejectionAssessmentFailure;

type AddUserApprovalAssessmentResult = AddUserApprovalAssessmentSuccess | AddUserApprovalAssessmentFailure;

interface AddUserRejectionAssessmentSuccess {
  status: "rejection-success";
  tagId: string;
}

interface AddUserRejectionAssessmentFailure {
  status: "rejection-failure";
  tagId: string;
  error: ClientErrors.ClientError<any>;
}

interface AddUserApprovalAssessmentSuccess {
  tagId: string;
  status: "approval-success";
  tagApproved: boolean;
}

interface AddUserApprovalAssessmentFailure {
  tagId: string;
  status: "approval-failure";
  error: ClientErrors.ClientError<any>;
}


// TODO Move
// TODO DOC
const addRejectionUserAssessment =
  async ( repoId: number
        , pullRequestNumber: number
        , commitId: string
        , userAssessment: UA.UserAssessment
        ): Promise<AddUserRejectionAssessmentResult> => {

  const tagId = userAssessment.tagId;

  try {

    const addRejectionUpdateResult = await PullRequestReviewModel.update(
      {
        repoId,
        pullRequestNumber,
        headCommitId: commitId,
        headCommitApprovedTags: { $nin: [ tagId ] },
        headCommitRejectedTags: { $nin: [ tagId ] },
        headCommitUserAssessments: { $nin: [ userAssessment ] }
      },
      {
        $push: {
          "headCommitUserAssessments": userAssessment,
          "headCommitRejectedTags": tagId
        },
      }
    ).exec();

    // TODO log error if needed.
    // TODO make these errors better (priority: for the head commit updating / tag already being approved/rejected)
    if ( !MongoHelpers.updateOk(addRejectionUpdateResult)
          || !MongoHelpers.updateMatchedOneResult(addRejectionUpdateResult)
          || !MongoHelpers.updateModifiedOneResult(addRejectionUpdateResult)
    ) {
      return { tagId, status: "rejection-failure", error: ClientErrors.internalServerError }
    }

    return { tagId, status: "rejection-success" };

  } catch (updateErr) {

    // TODO log error
    return { tagId, status: "rejection-failure", error: ClientErrors.internalServerError }
  }
}


// TODO Move
// TODO DOC
const addApprovalUserAssessment =
  async ( repoId: number
        , pullRequestNumber: number
        , commitId: string
        , userAssessment: UA.UserAssessment
        , tagsOwnerGroups: TOG.TagOwnerGroups[]
        ) : Promise<AddUserApprovalAssessmentResult> => {

  const { username, tagId } = userAssessment;
  // Casting because we know it will be found, we've already checked before this function.
  const tagOwnerGroups =
    R.find((tagOwnerGroup => tagOwnerGroup.tagId === tagId), tagsOwnerGroups) as TOG.TagOwnerGroups;

  // In the case that the user approval may or may not cause the tag to be approved we do two updates. We do this
  // because we want everything to be atomic, so we try multiple atomic operations to cover all cases.
  //  - first doing an update with query settings assuming that the approval will not cause the tag to be approved
  //  - second, if that fails, we try again this time with query settings assuming this update will cause the tag to be
  //    approved.
  //      - Here again we have to do two atomic updates, one assuming this is the last tag to be approved and one
  //        assuming this is not the last tag to be approved.

  const userApprovalGuaranteesTagApproval = R.all((owners) => {
    return R.contains(username, owners);
  }, tagOwnerGroups.groups);

  const groupsWithoutUser = R.filter((owners) => {
    return !R.contains(username, owners);
  }, tagOwnerGroups.groups);

  const createMongoQueryFilterForUpdate = (andAdditionalQueryFilter: object) => {

    const baseFilter = {
      repoId,
      pullRequestNumber,
      headCommitId: commitId,
      headCommitApprovedTags: { $nin: [ userAssessment.tagId ] },
      headCommitRejectedTags: { $nin: [ userAssessment.tagId ] },
      headCommitUserAssessments: { $nin: [ userAssessment ] }
    };

    return {
      ...baseFilter,
      $and: [ andAdditionalQueryFilter ]
    }
  }

  if (!userApprovalGuaranteesTagApproval) {

    // First try an atomic update assuming that this assessment will NOT cause the tag to be approved.
    try {

      const mongoQueryFilterAtLeastOneGroupOutsideUserLacksApproval = {
        $or: groupsWithoutUser.map((owners) => {
          return {
            headCommitUserAssessments: {
              $nin: owners.map((owner) => {
                return createAssessment("approved", owner, tagId);
              })
            }
          }
        })
      };

      const completeQueryFilter =
        createMongoQueryFilterForUpdate(mongoQueryFilterAtLeastOneGroupOutsideUserLacksApproval);

      const addAssessmentUpdateResult = await PullRequestReviewModel.update(
        completeQueryFilter,
        {
          $push: { "headCommitUserAssessments": userAssessment }
        }
      ).exec();

      if ( !MongoHelpers.updateOk(addAssessmentUpdateResult)
            || !MongoHelpers.updateMatchedOneResult(addAssessmentUpdateResult)
            || !MongoHelpers.updateModifiedOneResult(addAssessmentUpdateResult)
      ) {
        throw "value-meaningless error to move to next atomic update";
      }

      return { tagId, status: "approval-success", tagApproved: false };

    } catch { /* Error ignored to try second atomic update.*/ }

  }

  const totalTags = tagsOwnerGroups.length;

  const mongoQueryFilterAllGroupsOutsideUserHaveApproval =
    userApprovalGuaranteesTagApproval
      ? { }
      : {
          $and: groupsWithoutUser.map((owners) => {
            return {
              headCommitUserAssessments: {
                $in: owners.map((owner) => {
                  return createAssessment("approved", owner, tagId);
                })
              }
            }
          })
        }

  // Second, try an atomic update assuming that this assessment will cause the tag to be approved but that this is NOT
  // the last tag needing approval in the commit.
  try {

    const completeQuery = createMongoQueryFilterForUpdate({
      headCommitApprovedTags: { $not: { $size: totalTags - 1 } },
      ...mongoQueryFilterAllGroupsOutsideUserHaveApproval
    });

    const addApprovalUpdateResult = await PullRequestReviewModel.update(
      completeQuery,
      {
        $push: {
          "headCommitUserAssessments": userAssessment,
          "headCommitApprovedTags": tagId
        }
      }
    ).exec();

    if ( !MongoHelpers.updateOk(addApprovalUpdateResult)
          || !MongoHelpers.updateMatchedOneResult(addApprovalUpdateResult)
          || !MongoHelpers.updateModifiedOneResult(addApprovalUpdateResult)
    ) {
      throw "value-meaningless error to move to next atomic update";
    }

    return { tagId, status: "approval-success", tagApproved: true };

  } catch { /* Error ignored to try third atomic update. */  }


  // Third, try an atomic update assuming this will cause the tag to be approved and that this is the last tag needing
  // approval.
  try {

    const completeQuery = createMongoQueryFilterForUpdate({
      headCommitApprovedTags: { $size: totalTags - 1 },
      ...mongoQueryFilterAllGroupsOutsideUserHaveApproval
    });

    const addApprovalOnLastTagUpdateResult = await PullRequestReviewModel.update(
      completeQuery,
      {
        $push: {
          "headCommitUserAssessments": userAssessment,
          "headCommitApprovedTags": tagId,
          "analyzedCommitsWithSuccessStatus": commitId
        }
      }
    ).exec();

    // TODO log error if needed.
    // TODO make these errors better (priority: for the head commit updating / tag already being approved/rejected)
    if ( !MongoHelpers.updateOk(addApprovalOnLastTagUpdateResult)
          || !MongoHelpers.updateMatchedOneResult(addApprovalOnLastTagUpdateResult)
          || !MongoHelpers.updateModifiedOneResult(addApprovalOnLastTagUpdateResult)
    ) {
      return { tagId, status: "approval-failure", error: ClientErrors.internalServerError };
    }

    return { tagId, status: "approval-success", tagApproved: true };

  } catch (updateErr) {

    try {
      // TODO log error better?
      console.log(updateErr);
      console.log(JSON.stringify(updateErr));
    } catch { }

    return { tagId, status: "approval-failure", error: ClientErrors.internalServerError };
  }
}


// TODO Move
// TODO DOC
const addUserAssessment =
  async ( repoId: number
        , pullRequestNumber: number
        , commitId: string
        , userAssessment: UA.UserAssessment
        , tagsOwnerGroups: TOG.TagOwnerGroups[]
        ) : Promise<AddUserAssessmentResult>  => {

  if (userAssessment.assessmentType === "rejected") {
    return await addRejectionUserAssessment(repoId, pullRequestNumber, commitId, userAssessment);
  }

  return await addApprovalUserAssessment(repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups);
}


// TODO Move
// TODO DOC
// @REQUIRED tagsOwnerGroups has been checked to contain that tag for that user.
const addUserAssessments =
  async ( repoId: number
        , pullRequestNumber: number
        , commitId: string
        , userAssessments: UA.UserAssessment[]
        , tagsOwnerGroups: TOG.TagOwnerGroups[]
        ): Promise<AddUserAssessmentResult[]> => {
  return Promise.all(userAssessments.map((userAssessment) => {
    return addUserAssessment(repoId, pullRequestNumber, commitId, userAssessment, tagsOwnerGroups);
  }));
}
