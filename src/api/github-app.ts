// Module for github app helpers

const createApp = require('github-app'); // no types
import fs from 'fs';
import * as config from './config';


const app = createApp({
  id: config.githubAppId,
  cert: fs.readFileSync(config.githubAppCertPath)
});


export const putSuccessStatusOnCommit =
  async ( installationId: number
        , owner: string
        , repoName: string
        , repoId: number
        , prNumber: number
        , commitId: string ): Promise<void> => {

  const github = await app.asInstallation(installationId);

  await github.repos.createStatus({
    owner,
    repo: repoName,
    sha: commitId,
    context: config.commitStatusName,
    state: "success",
    description: "All tags have been approved",
    target_url: `${config.webClientOrigin}/review/repo/${repoId}/pr/${prNumber}/commit/${commitId}`
  });
}


export interface BasicPullRequestInfo {
  number: number;
  title: string;
  headCommitId: string;
  htmlUrl: string;
}


export const getOpenPullRequests =
  async ( installationId: number
        , owner: string
        , repoName: string
      ) : Promise<BasicPullRequestInfo[]> => {

  const github = await app.asInstallation(installationId);

  const pullsResponse = await github.pullRequests.list({
    owner,
    repo: repoName,
    state: "open"
  });

  return pullsResponse.data.map((pull: any) => {
    const basicPullRequestInfo: BasicPullRequestInfo = {
      number: pull.number,
      title: pull.title,
      headCommitId: pull.head.sha,
      htmlUrl: pull.html_url
    };

    return basicPullRequestInfo;
  });

}
