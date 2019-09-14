// Module for github helpers.

import * as R from "ramda";

import * as Probot from 'probot';
import * as T from "../types";
import * as AppError from "../app-error";
import { config } from "./config";


// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to retrieve open PRs.
export const getOpenPullRequests =
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , { repoName }: RepoIdAndName
        ) => {

  try {

    const response = await context.github.pulls.list({
      repo: repoName,
      owner,
      state: "open"
    })

    return response.data;

  } catch (err) {

    const getPullRequestsLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "github-retrieve-open-pull-requests-failure",
      isSevere: true,
      installationId,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName
      }
    };

    throw getPullRequestsLoggableError;
  }

}


// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to retrieve diff.
// @REFER https://developer.github.com/v3/repos/commits/#compare-two-commits
//     - Refer to GitHub API to see format of `baseRef` and `headRef`
export const retrieveDiff = R.curry(
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , baseRef: string
  , headRef: string
  ) : Promise<string> => {

  try {

    // Need the correct accept header to get the diff:
    // Refer: https://developer.github.com/v3/media/#commits-commit-comparison-and-pull-requests
    const diffAcceptHeader = { accept: "application/vnd.github.v3.diff"}
    // Unfortunetly the typings are wrong, and they don't include `headers` even though octokit (which this wraps)
    // has that field, and of course we need to pass the correct header to get the correct media type. This is
    // why I have a `as any` at the end here, it is only because the typings are wrong.
    const diffResponse = await context.github.repos.compareCommits({
      headers: diffAcceptHeader,
      owner,
      repo: repoName,
      base: baseRef,
      head: headRef
    } as any);

    return diffResponse.data;

  } catch (err) {

    const retrieveDiffLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "retrieve-diff-failure",
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName,
        baseRef,
        headRef
      }
    };

    throw retrieveDiffLoggableError;
  }

});


// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to retrieve file.
// @REFER https://developer.github.com/v3/repos/contents/#get-contents
export const retrieveFile = R.curry(
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoName: string
        , commitId: string
        , filePath: string
        ) : Promise<string> => {

  try {

    return await context.github.repos.getContents({
      owner,
      repo: repoName,
      path: filePath,
      ref: commitId
    })
    .then(R.path<any>(["data"]))
    .then((data) => {
      return (new Buffer(data.content, data.encoding)).toString("ascii")
    })

  } catch (err) {

    const failureToRetrieveFileLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "github-retrieve-file-failure",
      isSevere: false,
      data: {
        err,
        repoName,
        commitId,
        filePath
      },
      installationId,
      stack: AppError.getStack()
    }

    throw failureToRetrieveFileLoggableError;
  }

});


// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to set status.
export const setCommitStatus = R.curry(
  async (installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , commitId: string
  , statusState: "success" | "failure" | "pending"
  , optional: { description?: string, target_url?: string }
  ): Promise<void> => {

  try {

    const requiredSettings = {
      owner,
      repo: repoName,
      sha: commitId,
      context: config.commitStatusName,
      state: statusState
    }

    const settings = optional ? { ...requiredSettings, ...optional } : requiredSettings

    await context.github.repos.createStatus(settings);

  } catch (err) {

    const setStatusLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "github-set-status-failure",
      installationId,
      isSevere: true,
      stack: AppError.getStack(),
      data: {
        err,
        repoName,
        owner,
        commitId,
        statusState
      }
    }

    throw setStatusLoggableError;
  }

});


export type PullRequestCommits = T.Unpacked<ReturnType<typeof listPullRequestCommits>>


// TODO Check if pagination works when >250 commits, DOCS OUT OF DATE.
// @REFER https://developer.github.com/v3/pulls/#list-commits-on-a-pull-request
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to get pull request commits.
export const listPullRequestCommits =
  async ( installationId: number
  , context: Probot.Context
  , owner: string
  , repoName: string
  , pullRequestNumber: number
  ) => {

  try {

    const allCommits = [];
    const per_page = 100; // max allowed
    let page = 1;

    // Get all commits one page at a time.
    while (true) {

      const pullRequestCommitsResponse = await context.github.pulls.listCommits({
        owner,
        repo: repoName,
        number: pullRequestNumber,
        per_page,
        page
      });

      const commits = pullRequestCommitsResponse.data;
      allCommits.push(...commits);

      // Could be more results on future pages.
      if (commits.length === 100) {
        page++;
      } else {
        break;
      }
    }

    return allCommits;

  } catch (err) {

    const getPullRequestCommitsLoggableError: AppError.LogFriendlyGithubAppError = {
      name: "github-get-pull-request-commits-failure",
      installationId,
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName,
        pullRequestNumber
      }
    };

    throw getPullRequestCommitsLoggableError;
  }
}


// @THROWS only `AppError.LogFriendlyGithubAppError` upon failure to find the common ancestor.
export const getMostRecentCommonAncestor = R.curry(
  async ( installationId: number
        , context: Probot.Context
        , owner: string
        , repoName: string
        , branchNameOrCommitId1: string
        , branchNameOrCommitId2: string
        ): Promise<string> => {

  const max_per_page = 100;
  let page = 1;

  const listCommits = async (shaOrCommitId: string) => {
    return (await context.github.repos.listCommits({
      owner,
      repo: repoName,
      sha: shaOrCommitId,
      per_page: max_per_page,
      page
    })).data;
  }

  const commitHashmap: { [commitHash: string]: true } = { };

  const checkAndAdd = (sha: string): boolean => {
    if (commitHashmap[sha]) {
      return true;
    }

    commitHashmap[sha] = true;
    return false;
  }

  try {

    let commitList1HasCommits = true, commitList2HasCommits = true;

    while (commitList1HasCommits && commitList2HasCommits) {

      const commitList1 = await listCommits(branchNameOrCommitId1);
      const commitList2 = await listCommits(branchNameOrCommitId2);

      for (let index = 0; index < max_per_page; index++) {

        const commitFromList1 = commitList1[index];
        const commitFromList2 = commitList2[index];

        if (commitFromList1 === undefined) {
          commitList1HasCommits = false;
        } else {
          if (checkAndAdd(commitFromList1.sha)) { return commitFromList1.sha; }
        }

        if (commitFromList2 === undefined) {
          commitList2HasCommits = false;
        } else {
          if (checkAndAdd(commitFromList2.sha)) { return commitFromList2.sha; }
        }

      }

      page++;

    }

    throw "Ran out of commits and was unable to find a common ancestor.";

  } catch (err) {

    const cannotFindAncestorLoggableError: AppError.LogFriendlyGithubAppError = {
      installationId,
      name: "cannot-find-ancestor",
      isSevere: false,
      stack: AppError.getStack(),
      data: {
        err,
        owner,
        repoName,
        branchNameOrCommitId1,
        branchNameOrCommitId2
      }
    };

    throw cannotFindAncestorLoggableError;
  }

});


export interface RepoIdAndName {
  repoId: number;
  repoName: string;
}
