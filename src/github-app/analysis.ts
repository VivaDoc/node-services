// Top level module for the analysis pipeline.

import R from "ramda"

import * as AppError from "../app-error"
import * as Diff from "./diff"
import * as Tag from "./tag"
import * as Review from "./review"
import * as F from "../functional"
import * as UA from "../user-assessment"

import * as PullRequestReview from "../models/PullRequestReview"
import * as CommitReview from "../models/CommitReview"

// Don't use this for anything but types, I've been passing functions into the pipeline for DI purposes.
import * as GH from "./github-helpers";


// TODO DOC
// @THROWS never. Will handle all errors internally (including logging).
export const pipeline = async (
  installationId: number,
  pullRequestReview: PullRequestReview.PullRequestReview,
  getClientUrlForCommitReview: (commitId: string) => string,
  retrievePullRequestCommits: () => Promise<GH.PullRequestCommits>,
  retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>,
  retrieveFile: (commitId: string, filePath: string) => Promise<string>,
  setCommitStatus: (commitId: string, statusState: "success" | "failure" | "pending", optional?: { description?: string, target_url?: string }) => Promise<any>,
  getMostRecentCommonAncestor: (currentCommitOnPR: string) => Promise<string>
) => {

  // [PIPELINE] Set `analyzingCommitId` or return if no commits need analysis.

  if (pullRequestReview.pendingAnalysisForCommits.length === 0) { return }
  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0];

  // Helper for recovering from an error while analyzing a commit.
  const recoverFromError =
    async ( maybeErr: F.Maybe<any>
    , maybeStatus: F.Maybe<"failure">
    , commitReviewError: PullRequestReview.CommitReviewError
    ): Promise<void> => {

    recoverFromErrorInPipeline(
      maybeErr,
      maybeStatus,
      commitReviewError,
      installationId,
      pullRequestReview,
      getClientUrlForCommitReview,
      retrievePullRequestCommits,
      retrieveDiff,
      retrieveFile,
      setCommitStatus,
      getMostRecentCommonAncestor
    );
  }


  // Helper for skipping the analysis of a commit.
  const skipToNextCommitToAnalyze = async () => {

    let newPullRequestReview: PullRequestReview.PullRequestReview;

    try {

      newPullRequestReview = await PullRequestReview.clearPendingCommitOnAnalysisSkip(
        installationId,
        pullRequestReview.repoId,
        pullRequestReview.pullRequestNumber,
        analyzingCommitId
      );

    } catch (clearPendingCommitOnAnalysisSkipErr) {
      // If we errored skipping a commit, we'll be unable to proceed because pending commits will have this commit.
      // This is fine for now, it'll be logged as a severe error and reviewed. In the meantime the PR will not perform
      // analysis because pending commits will be backed-up.
      AppError.logErrors(clearPendingCommitOnAnalysisSkipErr, "github-app", null);
      return;
    }

    pipeline(
      installationId,
      newPullRequestReview,
      getClientUrlForCommitReview,
      retrievePullRequestCommits,
      retrieveDiff,
      retrieveFile,
      setCommitStatus,
      getMostRecentCommonAncestor
    );

    return;
  }


  // [PIPELINE] Check if this commit has already been analyzed or produced an error in the past.
  //     - Can occur if you drop commits and go back to a previous commit on a force push.
  if ( R.contains(analyzingCommitId, pullRequestReview.analyzedCommits)
        || PullRequestReview.hasErrorForCommitReview(pullRequestReview, analyzingCommitId) ) {
    skipToNextCommitToAnalyze();
    return;
  }

  let pullRequestCommits: GH.PullRequestCommits;

  try {

    pullRequestCommits = await retrievePullRequestCommits();

  } catch (getPullRequestCommitsError) {

    await recoverFromError(
      getPullRequestCommitsError,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: true
      }
    );

    return;
  }

  // [PIPELINE] Get the last analyzed commit and the analysis base commit.

  let maybeBaseAndLastAnalyzedCommit: ReturnType<typeof getBaseAndLastAnalyzedCommit>;

  try {

    const prBaseCommitIdForAnalyzingCommit = await getMostRecentCommonAncestor(analyzingCommitId);

    maybeBaseAndLastAnalyzedCommit = getBaseAndLastAnalyzedCommit(
      installationId,
      pullRequestCommits,
      prBaseCommitIdForAnalyzingCommit,
      pullRequestReview.analyzedCommits,
      pullRequestReview.analyzedCommitsWithSuccessStatus,
      analyzingCommitId
    );

  } catch (getBaseAndLastAnalyzedCommitErr) {

    await recoverFromError(
      getBaseAndLastAnalyzedCommitErr,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: true
      }
    );

    return;
  }

  // Commit rebased, no longer exists in pull request commits.
  if (maybeBaseAndLastAnalyzedCommit === null) {
    skipToNextCommitToAnalyze();
    return;
  }

  const { analysisBaseCommitId, intermediateAnalyzedCommitId } = maybeBaseAndLastAnalyzedCommit;

  // [PIPELINE] Set commit status to pending.

  try {

    await setCommitStatus(
      analyzingCommitId,
      "pending",
      {
        description: `Analyzing documentation against ${pullRequestReview.baseBranchName} branch...`,
        target_url: getClientUrlForCommitReview(analyzingCommitId)
      }
    );

  } catch (setCommitStatusError) {

    await recoverFromError(
      setCommitStatusError,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // [PIPELINE] Get file reviews.

  let fileReviewsNeedingApprovalIncludingSwallowedTags: Review.FileReviewWithMetadata[];

  try {

    fileReviewsNeedingApprovalIncludingSwallowedTags = await
      getFileReviewsWithMetadataNeedingApproval(
        async () => { return retrieveDiff(analysisBaseCommitId, analyzingCommitId) },
        async (previousfilePath: string, currentFilePath: string): Promise<[string, string]> => {
          const previousFileContent = await retrieveFile(analysisBaseCommitId, previousfilePath)
          const currentFileContent = await retrieveFile(analyzingCommitId, currentFilePath)

          return [ previousFileContent, currentFileContent ]
        }
      );

  } catch (err) { 

    const maybeParseTagError = AppError.isGithubAppParseTagError(err);

    if (maybeParseTagError !== null) {
      await recoverFromError(
        null,
        "failure",
        {
          commitReviewError: true,
          commitId: analyzingCommitId,
          clientExplanation: maybeParseTagError.clientExplanation,
          failedToSaveCommitReview: true
        }
      );
      return;
    }

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal, // TODO could be made better.
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // [PIPELINE] Calculate carry overs.

  /* May all have carry-overs from lastAnalyzedCommitId */
  let approvedTags: string[];
  let rejectedTags: string[];
  // `tagsSwallowedInPreviousSuccessCommit` is specifically needed for merges where the base commit is not behind the
  // intermediate commit.
  let tagsSwallowedInPreviousSuccessCommit: string[];
  let userAssessments: UA.UserAssessment[];

  try {

    const carryOverResult: CarryOverResult = await calculateCarryOversFromLastAnalyzedCommit(
      intermediateAnalyzedCommitId,
      analyzingCommitId,
      retrieveDiff,
      retrieveFile,
      async (commitId) => {
        return CommitReview.getExistantCommitReview(installationId, pullRequestReview.repoId, commitId )
      },
      fileReviewsNeedingApprovalIncludingSwallowedTags
    );

    ({ approvedTags, rejectedTags, userAssessments, tagsSwallowedInPreviousSuccessCommit } = carryOverResult);

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal, // TODO could be better error.
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // [PIPELINE] Save new CommitReview.

  const fileReviewsNeedingApproval = filterOutTagsSwallowedInPreviousSuccessCommit(
    fileReviewsNeedingApprovalIncludingSwallowedTags,
    tagsSwallowedInPreviousSuccessCommit
  );

  const tagsOwnerGroups = Review.getTagsOwnerGroups(fileReviewsNeedingApproval);

  const currentCommitIsSuccess = approvedTags.length === tagsOwnerGroups.length;

  try {

    await CommitReview.newCommitReview(installationId, {
      repoId: pullRequestReview.repoId,
      repoName: pullRequestReview.repoName,
      repoFullName: pullRequestReview.repoFullName,
      branchName: pullRequestReview.branchName,
      commitId: analyzingCommitId,
      pullRequestNumber: pullRequestReview.pullRequestNumber,
      fileReviews: fileReviewsNeedingApproval,
      approvedTags,
      rejectedTags,
      userAssessments,
      tagsOwnerGroups
    });

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: true
      }
    );
    return;
  }

  // [PIPELINE] Attempt to update PullRequestReview assuming this commit is still the most recent commit in the PR.

  let atomicUpdateStatus: "success" | "no-longer-head-commit";

  try {

    atomicUpdateStatus = await PullRequestReview.updateOnCompleteAnalysisForHeadCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      approvedTags,
      rejectedTags,
      userAssessments,
      tagsOwnerGroups
    );

  } catch (err) {

    await recoverFromError(
      err,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      }
    );
    return;
  }

  if ( atomicUpdateStatus === "success" ) {

    try {

      if (currentCommitIsSuccess) {
        await setCommitStatus(
          analyzingCommitId,
          "success",
          {
            description: "No tags required approval",
            target_url: getClientUrlForCommitReview(analyzingCommitId)
          }
        );
      } else {
        await setCommitStatus(
          analyzingCommitId,
          "failure",
          {
            description: "Documentation requires approval",
            target_url: getClientUrlForCommitReview(analyzingCommitId)
          }
        )
      }

      return;

    } catch (err) {

      await recoverFromError(
        err,
        null,
        {
          commitReviewError: true,
          commitId: analyzingCommitId,
          clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
          failedToSaveCommitReview: false
        }
      );

      return;
    }

  }

  // [PIPELINE] Otherwise, the atomic update failed because this is no longer the head commit.
  // This means we must:
  //   - update PR with non headXXX fields
  //   - set commit status
  //   - retrigger pipeline

  let updatedPullRequestReviewObject: PullRequestReview.PullRequestReview;

  try {

    updatedPullRequestReviewObject = await PullRequestReview.updateOnCompleteAnalysisForNonHeadCommit(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      currentCommitIsSuccess
    );

  } catch (err) {

    await recoverFromError(
      err,
      "failure",
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.internal,
        failedToSaveCommitReview: false
      }
    );
    return;
  }

  try {

    if (currentCommitIsSuccess) {
      await setCommitStatus(
        analyzingCommitId,
        "success",
        {
          description: "No tags required approval",
          target_url: getClientUrlForCommitReview(analyzingCommitId)
        }
      );
    } else {
      await setCommitStatus(
        analyzingCommitId,
        "failure",
        {
          description: "Documentation requires approval",
          target_url: getClientUrlForCommitReview(analyzingCommitId)
        }
      );
    }

  } catch (err) {

    await recoverFromError(
      err,
      null,
      {
        commitReviewError: true,
        commitId: analyzingCommitId,
        clientExplanation: PullRequestReview.COMMIT_REVIEW_ERROR_MESSAGES.githubIssue,
        failedToSaveCommitReview: false
      }
    );
  }

  // [PIPELINE] Re-trigger pipeline for further analysis.

  pipeline(
    installationId,
    updatedPullRequestReviewObject,
    getClientUrlForCommitReview,
    retrievePullRequestCommits,
    retrieveDiff,
    retrieveFile,
    setCommitStatus,
    getMostRecentCommonAncestor
  );

}


export const getFileReviewsWithMetadataNeedingApproval = async (
  retrieveDiff: () => Promise<any>,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
): Promise<Review.FileReviewWithMetadata[]> => {

  const fileDiffs: Diff.FileDiff[] = Diff.parseDiff(await retrieveDiff())
  const filesDiffsToAnalyze: Diff.FileDiffWithLanguage[] = Diff.toFileDiffsWithLanguage(fileDiffs);

  if (filesDiffsToAnalyze.length === 0) {
    return []
  }

  const fileDiffsWithCode: Tag.FileDiffWithCode[] = await Promise.all(
    filesDiffsToAnalyze.map((fileDiff) => { return attachCode(fileDiff, retrieveFiles) })
  )

  // An array of reviews for each file.
  const fileReviews: Review.FileReviewWithMetadata[] =
    R.pipe<
      Tag.FileDiffWithCode[],
      Tag.FileDiffWithCodeAndTags[],
      Review.FileReview[],
      Review.FileReview[],
      Review.FileReviewWithMetadata[]
    >(
      R.map(Tag.parseTags),
      R.map(Review.getReviews),
      R.filter(Review.fileReviewNeedsApproval),
      R.map(Review.initFileReviewMetadata)
    )(fileDiffsWithCode)

  return fileReviews;
}


const filterOutTagsSwallowedInPreviousSuccessCommit =
  ( fileReviews: Review.FileReviewWithMetadata[]
  , tagsSwallowedInPreviousSuccessCommit: string[]
  ): Review.FileReviewWithMetadata[] => {

  return Review.filterFileReviewTags(
    (tag) => {
      return !R.contains(tag.tagId.toString(), tagsSwallowedInPreviousSuccessCommit);
    },
    fileReviews
  );
}


const getUnalteredTagsAcrossDiff =
  async ( tagsAgainstBase: Review.TagWithMetadata[]
        , diffAgainstIntermediate: Diff.ModifiedFileDiffWithLanguage | Diff.RenamedFileDiffWithLanguage | undefined
        , retrieveIntermediateFileContent: () => Promise<string>
        , intermediateFilePath: string
        ) : Promise<Review.TagWithMetadata[]> => {

  const unalteredTagsAcrossDiff: Review.TagWithMetadata[] = [];

  if (diffAgainstIntermediate === undefined) { return tagsAgainstBase; }

  const intermediateFileContent = await retrieveIntermediateFileContent();
  const intermediateFileTags = Tag.getFileTags(
    diffAgainstIntermediate.currentLanguage,
    intermediateFileContent,
    intermediateFilePath
  );

  const tagLinks = Review.getTagLinksBetweenSomeTags(
    intermediateFileTags,
    tagsAgainstBase,
    diffAgainstIntermediate.alteredLines
  );

  for (let index = 0; index < tagLinks.length; index++) {

    const tagLink = tagLinks[index];
    if (tagLink === null) { continue; }

    const linkFromTag = intermediateFileTags[index];
    const linkToTag = tagsAgainstBase[tagLink];

    const tagPair: R.KeyValuePair<Tag.VdTag, Review.TagWithMetadata> = [ linkFromTag, linkToTag ];

    const tagPairUpdated = R.any(Review.alteredLineInTagPairOwnership(tagPair), diffAgainstIntermediate.alteredLines);

    if (!tagPairUpdated) { unalteredTagsAcrossDiff.push(linkToTag); }
  }

  return unalteredTagsAcrossDiff;
}


interface GetCarryOverTagsFromIntermediateCommitPerFileResult {
  approvedTagsForFile: string[];
  rejectedTagsForFile: string[];
  userAssessmentsForFile: UA.UserAssessment[];
  tagsSwallowedInPreviousSuccessCommitForFile: string[];
}


const getCarryOverTagsFromIntermediateCommitReviewTagsPerFile =
  ( intermediateCommitReviewTags: Review.CommitReviewTagsPerFile
  , intermediateCommitReviewUserAssessments: UA.UserAssessment[]
  , unalteredTagsSinceIntermediateCommit: Review.TagWithMetadata[]
  , diffAgainstIntermediate: Diff.ModifiedFileDiffWithLanguage | Diff.RenamedFileDiffWithLanguage | undefined
  ) : GetCarryOverTagsFromIntermediateCommitPerFileResult => {

  const alteredLines = diffAgainstIntermediate === undefined ? [] : diffAgainstIntermediate.alteredLines;

  const tagLinks = Review.getTagLinksBetweenSomeTags(
    intermediateCommitReviewTags.all,
    unalteredTagsSinceIntermediateCommit,
    alteredLines
  );

  const newTagsToPreviousApprovalStateMap: {
    [newTagId: string]:
      {
        previousTagId: string,
        previousApprovalState: "approved" | "rejected" | "unresolved"
      }
      | undefined
  } = { };

  for (let index = 0; index < tagLinks.length; index++) {
    const tagLink = tagLinks[index];
    if (tagLink === null) { continue; }

    const linkFromTag = intermediateCommitReviewTags.all[index];
    const linkToTag = unalteredTagsSinceIntermediateCommit[tagLink];

    const currentTagId = linkToTag.tagId.toString();
    const previousTagId = linkFromTag.tagId.toString();

    newTagsToPreviousApprovalStateMap[currentTagId] =
      {
        previousTagId,
        previousApprovalState: Review.getTagApprovalState(previousTagId, intermediateCommitReviewTags)
      }
  }

  const approvedTagsForFile = [];
  const rejectedTagsForFile = [];
  const tagsSwallowedInPreviousSuccessCommitForFile = [];
  const userAssessmentsForFile = [];

  for (let unalteredTag of unalteredTagsSinceIntermediateCommit) {

    const tagId = unalteredTag.tagId.toString();
    const previousApprovalStateAndTagId = newTagsToPreviousApprovalStateMap[tagId];

    if (previousApprovalStateAndTagId === undefined) {
      tagsSwallowedInPreviousSuccessCommitForFile.push(tagId);
      continue;
    }

    const { previousApprovalState, previousTagId } = previousApprovalStateAndTagId;

    const portedUserAssessmentsForCurrentTag =
      UA.getUserAssessmentsForTagId(intermediateCommitReviewUserAssessments, previousTagId).map(UA.newTagId(tagId));

    userAssessmentsForFile.push(...portedUserAssessmentsForCurrentTag);

    if (previousApprovalState === "approved") {
      approvedTagsForFile.push(tagId);
      continue;
    }

    if (previousApprovalState === "rejected") {
      rejectedTagsForFile.push(tagId);
      continue;
    }
  }

  return {
    approvedTagsForFile,
    rejectedTagsForFile,
    tagsSwallowedInPreviousSuccessCommitForFile,
    userAssessmentsForFile
  };
}


interface CarryOverResult {
  approvedTags: string[];
  rejectedTags: string[];
  tagsSwallowedInPreviousSuccessCommit: string[];
  userAssessments: UA.UserAssessment[];
}


export const calculateCarryOversFromLastAnalyzedCommit =
  async ( intermediateAnalyzedCommitId: string | null
        , currentCommitId: string
        , retrieveDiff: (baseId: string, headId: string) => Promise<any>
        , retrieveFile: (commitId: string, filePath: string) => Promise<string>
        , getCommitReview: (commitId: string) => Promise<CommitReview.CommitReview>
        , fileReviewsAgainstBase: Review.FileReviewWithMetadata[]
        ): Promise<CarryOverResult> => {

  if (fileReviewsAgainstBase.length === 0 || intermediateAnalyzedCommitId === null) {
    return {
      approvedTags: [],
      rejectedTags: [],
      tagsSwallowedInPreviousSuccessCommit: [],
      userAssessments: []
    }
  }

  // Otherwise we may have actual carry-overs to compute.
  const intermediateCommitReview: CommitReview.CommitReview = await getCommitReview(intermediateAnalyzedCommitId);
  const intermediateCommitReviewTagsPerFileHashMap = Review.getTagsPerFileHashMap(
    intermediateCommitReview.approvedTags,
    intermediateCommitReview.rejectedTags,
    intermediateCommitReview.fileReviews
  );

  const intermediateDiff = await retrieveDiff(intermediateAnalyzedCommitId, currentCommitId);

  const fileDiffsAgainstIntermediateCommit = Diff.parseDiff(intermediateDiff);
  const fileDiffsToAnalyzeAgainstIntermediateCommit = Diff.toFileDiffsWithLanguage(fileDiffsAgainstIntermediateCommit);

  const carryOverApprovedTags: string[] = [];
  const carryOverRejectedTags: string[] = [];
  const carryOverUserAssessments: UA.UserAssessment[] = [];
  const carryOverTagsSwallowedInPreviousSuccessCommit: string[] = [];

  for (let fileReviewAgainstBase of fileReviewsAgainstBase) {

    const currentFilePath = fileReviewAgainstBase.currentFilePath;
    const diffAgainstIntermediateCommit: Diff.FileDiffWithLanguage | undefined = R.find(
      (fileDiff) => { return fileDiff.currentFilePath === currentFilePath },
      fileDiffsToAnalyzeAgainstIntermediateCommit
    );

    // If the file is new/deleted since the intermediate commit, there will be no carry-overs.

    if (diffAgainstIntermediateCommit !== undefined) {
      switch (diffAgainstIntermediateCommit.diffType) {

        case "new":
        case "deleted":
          continue;

        case "renamed":
        case "modified":
          break;
      }
    }

    // Otherwise there may be carry-overs.

    const intermediateFilePath: string = (() => {
      if (diffAgainstIntermediateCommit === undefined) {
        return currentFilePath;
      }

      switch (diffAgainstIntermediateCommit.diffType) {
        case "modified":
          return currentFilePath;

        case "renamed":
          return diffAgainstIntermediateCommit.previousFilePath;
      }
    })();
    const existantTagsAgainstBase = Review.getExistantTagsWithMetadata(fileReviewAgainstBase);
    const unalteredTagsSinceIntermediateCommit = await getUnalteredTagsAcrossDiff(
      existantTagsAgainstBase,
      diffAgainstIntermediateCommit,
      () => { return retrieveFile(intermediateAnalyzedCommitId, intermediateFilePath); },
      intermediateFilePath
    );
    const intermediateCommitReviewTagsPerFile = intermediateCommitReviewTagsPerFileHashMap[intermediateFilePath];

    if (intermediateCommitReviewTagsPerFile === undefined) {
      const unalteredTagIdsSinceIntermediateCommit =
        unalteredTagsSinceIntermediateCommit.map((tag) => { return tag.tagId.toString(); });

      carryOverTagsSwallowedInPreviousSuccessCommit.push(...unalteredTagIdsSinceIntermediateCommit);
      continue;
    }

    const { approvedTagsForFile, rejectedTagsForFile, userAssessmentsForFile, tagsSwallowedInPreviousSuccessCommitForFile } =
      getCarryOverTagsFromIntermediateCommitReviewTagsPerFile(
        intermediateCommitReviewTagsPerFile,
        intermediateCommitReview.userAssessments,
        unalteredTagsSinceIntermediateCommit,
        diffAgainstIntermediateCommit
      );

    carryOverApprovedTags.push(...approvedTagsForFile);
    carryOverRejectedTags.push(...rejectedTagsForFile);
    carryOverTagsSwallowedInPreviousSuccessCommit.push(...tagsSwallowedInPreviousSuccessCommitForFile);
    carryOverUserAssessments.push(...userAssessmentsForFile);
  }

  return {
    approvedTags: carryOverApprovedTags,
    rejectedTags: carryOverRejectedTags,
    userAssessments: carryOverUserAssessments,
    tagsSwallowedInPreviousSuccessCommit: carryOverTagsSwallowedInPreviousSuccessCommit
  };

}


type CommitHashMap<T> = {
  [commitId: string]: CommitHashMapValue<T>
}


type CommitHashMapValue<T> = {
  parentCommitIds: string[],
  metadata: T
}


const getCommitHashMap = <T>(pullRequestCommits: GH.PullRequestCommits, initMetadata: T): CommitHashMap<T> => {

  let commitHashMap: CommitHashMap<T> = { };

  for (let commit of pullRequestCommits) {
    commitHashMap[commit.sha] = {
      parentCommitIds: R.map((parent) => { return parent.sha }, commit.parents),
      metadata: initMetadata
    }
  }

  return commitHashMap;
}


const hasParent = ( commitHashMapValue: CommitHashMapValue<any>, searchForParentWithId: string ): boolean => {
  return R.contains(searchForParentWithId, commitHashMapValue.parentCommitIds);
}


const copyCommitHashMapAndInitMetadata =
  <T>( commitHashMap: CommitHashMap<any>
      , initMetadata: T
      ): CommitHashMap<T> => {

  const newCommitHashMap: CommitHashMap<T> = { };

  for (let commitId in commitHashMap) {

    newCommitHashMap[commitId] = {
      parentCommitIds: R.clone(commitHashMap[commitId].parentCommitIds),
      metadata: initMetadata
    }
  }

  return newCommitHashMap;
}


type ShortestPathResult = { resultType: "no-path" }
                        | { resultType: "found", path: string[], crossedCommit: F.Maybe<string> };


const bestShortestPathResult =
  ( path1: ShortestPathResult
  , path2: ShortestPathResult
  , crossCommits: string[]
  ): ShortestPathResult => {

  if (path1.resultType === "no-path") { return path2; }
  if (path2.resultType === "no-path") { return path1; }

  if (path1.crossedCommit === null) {
    if (path2.crossedCommit === null) {
      return (path1.path.length < path2.path.length) ? path1 : path2;
    }

    return path2;
  }

  if (path2.crossedCommit === null) {
    return path1;
  }

  if (path1.crossedCommit === path2.crossedCommit) {
    return (path1.path.length < path2.path.length) ? path1 : path2;
  }

  const indexOfPath1Cross = crossCommits.indexOf(path1.crossedCommit);
  const indexOfPath2Cross = crossCommits.indexOf(path2.crossedCommit);

  return (indexOfPath1Cross > indexOfPath2Cross) ? path1 : path2;
};


// If the optional `optionalCrossCommits` is passed, it will prioritize any path that crosses any commit inside that
// list. Paths that cross commits later in the list will be put above paths that cross commits earlier in the list or
// don't cross those commits at all.
//
// Given two paths that both cross the same cross commit/don't cross, shorter paths will be prioritized.
const getShortestPathToCommit =
  <T>( commitHashMap: CommitHashMap<T>
     , fromCommitId: string
     , toCommitId: string
     , prioritizePathsCrossingCommits?: string[]
     ): ShortestPathResult  => {

  type SearchMetadata =   { state: "not-calculated" }
                        | { state: "no-path" }
                        | { state: "found", crossedCommit: F.Maybe<string>, path: string[] };

  const initSearchMetadata: SearchMetadata = { state: "not-calculated" };
  const searchCommitHashMap: CommitHashMap<SearchMetadata> = copyCommitHashMapAndInitMetadata(commitHashMap, initSearchMetadata);
  const crossCommits: string[] = prioritizePathsCrossingCommits === undefined ? [] : prioritizePathsCrossingCommits;

  const go = (currentCommitId: string): ShortestPathResult => {

    const currentCommitSearchNode = searchCommitHashMap[currentCommitId];

    // Base case 1, non-existant
    if (currentCommitSearchNode === undefined) {
      return { resultType: "no-path" };
    }

    // Base case 2, parent is the node we are searching for
    if (hasParent(currentCommitSearchNode, toCommitId)) {

      const crossedCommit = R.contains(currentCommitId, crossCommits) ? currentCommitId : null;

      return { resultType: "found", crossedCommit, path: [ currentCommitId ] };
    }

    switch (currentCommitSearchNode.metadata.state) {

      case "no-path":
        return { resultType: "no-path" };

      case "found":
        return {
          resultType: "found",
          crossedCommit: currentCommitSearchNode.metadata.crossedCommit,
          path: currentCommitSearchNode.metadata.path
        };

      case "not-calculated":

        const currentCommitParentIds = searchCommitHashMap[currentCommitId].parentCommitIds;
        let shortestPathFromParent: ShortestPathResult = { resultType: "no-path" };

        for (let parentId of currentCommitParentIds) {
          shortestPathFromParent = bestShortestPathResult(shortestPathFromParent, go(parentId), crossCommits);
        }

        if (shortestPathFromParent.resultType === "no-path") {
          currentCommitSearchNode.metadata = { state: "no-path" };
          return shortestPathFromParent;
        }

        const pathIncludingCurrentCommit = [ currentCommitId, ...shortestPathFromParent.path ];
        const crossedCommitIncludingCurrentCommit = (() => {

          if (R.contains(currentCommitId, crossCommits)) { return currentCommitId; }

          return shortestPathFromParent.crossedCommit;
        })();

        currentCommitSearchNode.metadata = {
          state: "found",
          crossedCommit: crossedCommitIncludingCurrentCommit,
          path: pathIncludingCurrentCommit
        };

        return {
          resultType: "found",
          crossedCommit: crossedCommitIncludingCurrentCommit,
          path: pathIncludingCurrentCommit
        };

    }

  }

  return go(fromCommitId);
}


// @REFER `getBaseAndLastAnalyzedCommit`
const getIntermediateCommit =
  ( commitHashMap: CommitHashMap<any>
  , analyzedCommits: string[]
  , baseCommitId: string
  ): F.Maybe<string> => {

  for (let i = analyzedCommits.length - 1; i >= 0; i--) {
    const analyzedCommitId = analyzedCommits[i];

    if (commitHashMap[analyzedCommitId] !== undefined && analyzedCommitId !== baseCommitId) {

      if (getShortestPathToCommit(commitHashMap, baseCommitId, analyzedCommitId).resultType === "no-path") {
        return analyzedCommitId;
      }

      return null;
    }
  }

  return null;
}


// Returns:
// If: `analyzingCommitId` is in the pull request commits, then returns an object with:
//     - the last commit before `analyzingCommitId` with a success status or the base commit that the PR is against if
//       no analyzed commits with a success status exist between the `analyzingCommitId` and the `prBaseCommitId`.
//     - an intermediate commit to carry-over tags from that is not behind the returned base commit. The intermediate
//       commit may not be between the base commit and the current commit.
//
// Else: `null`. This means the `analyzingCommitId` is no longer in the PR so it must have been rebased before the
//       analysis got here. This is unlikely but possible.
//
// @THROWS only `AppError.LogFriendlyGithubAppError` if it can't find the shortest path from the head commit to the pr BASE commit.
const getBaseAndLastAnalyzedCommit =
  ( installationId: number
  , pullRequestCommits: GH.PullRequestCommits
  , prBaseCommitId: string
  , analyzedCommits: string[]
  , analyzedCommitsWithSuccessStatus: string[]
  , analyzingCommitId: string
  ) : F.Maybe<{ analysisBaseCommitId: string, intermediateAnalyzedCommitId: F.Maybe<string> }> => {

  const commitHashMap = getCommitHashMap(pullRequestCommits, null);

  if (commitHashMap[analyzingCommitId] === undefined) { return null; }

  const shortestPathToPrBaseCommit = getShortestPathToCommit(
    commitHashMap,
    analyzingCommitId,
    prBaseCommitId,
    analyzedCommitsWithSuccessStatus
  );

  if (shortestPathToPrBaseCommit.resultType === "no-path") {
    const calculateShortestPathLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "calculate-shortest-path-failure",
      isSevere: false,
      installationId,
      stack: AppError.getStack(),
      data: {
        pullRequestCommits,
        prBaseCommitId,
        analyzingCommitId
      }
    };

    throw calculateShortestPathLoggableError;
  }

  const maybeSuccessCommitAfterPrBaseCommit = shortestPathToPrBaseCommit.crossedCommit;
  const analysisBaseCommitId =
    maybeSuccessCommitAfterPrBaseCommit === null ? prBaseCommitId : maybeSuccessCommitAfterPrBaseCommit;

  const intermediateAnalyzedCommitId = getIntermediateCommit(commitHashMap, analyzedCommits, analysisBaseCommitId);

  return { analysisBaseCommitId, intermediateAnalyzedCommitId };

}


// Handles logging errors, clearing pending commit, optionally set commit status, and continue analysis of other
// commits if there are more pendingAnalysisForCommits.
//
// Note `err` is optional because it may be the case that nothing in the app errored, we simply have just a
//       `commitReviewError` because the user mis-used the app.
//
// @VD amilner42 start
const recoverFromErrorInPipeline =
  async ( err: F.Maybe<any>
        , setStatusTo: F.Maybe<"failure">
        , commitReviewError: PullRequestReview.CommitReviewError
        , installationId: number
        , pullRequestReview: PullRequestReview.PullRequestReview
        , getClientUrlForCommitReview: (commitId: string) => string
        , retrievePullRequestCommits: () => Promise<any>
        , retrieveDiff: (baseCommitId: string, headCommitId: string) => Promise<string>
        , retrieveFile: (commitId: string, filePath: string) => Promise<string>
        , setCommitStatus: ( commitId: string
                           , statusState: "success" | "failure" | "pending"
                           , optional?: { description?: string, target_url?: string }
                           ) => Promise<any>
        , getMostRecentCommonAncestor: (currentCommitOnPR: string) => Promise<string>
        ): Promise<void> => {

  const analyzingCommitId = pullRequestReview.pendingAnalysisForCommits[0];

  if (F.isJust(err)) {
    await AppError.logErrors(err, "github-app", null);
  }

  let newPullRequestReview: PullRequestReview.PullRequestReview;

  try {

    newPullRequestReview = await PullRequestReview.clearPendingCommitOnAnalysisFailure(
      installationId,
      pullRequestReview.repoId,
      pullRequestReview.pullRequestNumber,
      analyzingCommitId,
      commitReviewError,
      null
    );

  } catch (clearPendingCommitError) {

    await AppError.logErrors(clearPendingCommitError, "github-app", null);

    if (setStatusTo !== null) {

      try {

        const description =
          "VivaDoc had an internal issue and is in an errored state, it won't work on this PR. Arie has been notified for review.";

        await setCommitStatus(
          analyzingCommitId,
          setStatusTo,
          { description }
        );

      } catch (setCommitStatusError) {

        await AppError.logErrors(setCommitStatusError, "github-app", null);
      }
    }

    // If we can't clear the pending commit, something is really going wrong and there's no point in continuing
    // analyzing other commits.
    return;
  }

  if (setStatusTo !== null) {

    const description = "VivaDoc failed to process this commit."

    try {

      await setCommitStatus(
        analyzingCommitId,
        setStatusTo,
        { description, target_url: getClientUrlForCommitReview(analyzingCommitId) }
      );

    } catch (setCommitStatusError) {

      await AppError.logErrors(setCommitStatusError, "github-app", null);

    }
  }

  pipeline(
    installationId,
    newPullRequestReview,
    getClientUrlForCommitReview,
    retrievePullRequestCommits,
    retrieveDiff,
    retrieveFile,
    setCommitStatus,
    getMostRecentCommonAncestor
  );

}
// @VD end


const attachCode = async (
  fileDiff: Diff.FileDiffWithLanguage,
  retrieveFiles: (previousFilePath: string, currentFilePath: string) => Promise<[string, string]>
  ): Promise<Tag.FileDiffWithCode> => {

  let previousFileContent;
  let currentFileContent;

  switch (fileDiff.diffType) {

    case "modified":
      [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.currentFilePath, fileDiff.currentFilePath)
      return R.merge(fileDiff, {  previousFileContent, currentFileContent })

    case "renamed":
      [ previousFileContent, currentFileContent ] = await retrieveFiles(fileDiff.previousFilePath, fileDiff.currentFilePath)
      return R.merge(fileDiff, { previousFileContent, currentFileContent })

    case "deleted":
      return fileDiff

    case "new":
      return fileDiff
  }
}
