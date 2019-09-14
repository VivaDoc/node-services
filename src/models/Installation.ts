import mongoose = require("mongoose")

import * as AppError from "../app-error";


export interface Installation {
  installationId: number;
  owner: string;
  repoIds: number[];
}


const InstallationSchema = new mongoose.Schema({
  installationId: { type: Number, required: [true, "can't be blank"], index: true },
  owner: { type: String, required: [true, "can't be blank"] },
  repoIds: { type: [ Number ], required: [true, "can't be blank"], index: true }
});


const InstallationModel = mongoose.model("Installation", InstallationSchema);


/* DB HELPER FUNCTIONS */


// Initialize a new installation.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed creation.
export const newInstallation = async (installationId: number, owner: string, repoIds: number[], errorName: string) => {
  try {

    const installationObject: Installation = {
      installationId,
      owner,
      repoIds
    };
    const installation = new InstallationModel(installationObject);

    await installation.save();

  } catch (err) {

    const initInstallationError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
      isSevere: true,
      installationId,
      stack: AppError.getStack(),
      data: err
    }

    throw initInstallationError;
  }
}


// Delete an installation and return it.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed deletion.
export const deleteInstallation = async (installationId: number): Promise<Installation> => {

  try {

    const deletedInstallation = await InstallationModel.findOneAndDelete({ installationId }).exec();

    if (deletedInstallation === null) throw "not-found";

    return deletedInstallation.toObject();

  } catch (err) {

    const deleteInstallationError: AppError.LogFriendlyGithubAppError = {
      name: "delete-repo-failure",
      isSevere: false,
      installationId,
      data: err,
      stack: AppError.getStack()
    };

    throw deleteInstallationError;
  }

}


// Adds repos to an insallation.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed insertion.
export const addReposToInstallation =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
        ): Promise<void> => {

  try {

    const installationUpdateResult = await InstallationModel.update(
      { installationId },
      { $addToSet: { "repoIds": { $each: repoIds } }}
    ).exec();

    if ( installationUpdateResult.ok !== 1
          || installationUpdateResult.n !== 1
          || installationUpdateResult.nModified !== 1
    ) {

      throw { updateQueryFailure: true
            , ok: installationUpdateResult.ok
            , n: installationUpdateResult.n
            , nModified: installationUpdateResult.nModified
            }
    }

  } catch (err) {

    const addReposLoggableError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
      isSevere: true,
      data: err,
      stack: AppError.getStack(),
      installationId
    }

    throw addReposLoggableError;
  }

}


// Remove `repoIds` from the given installation.
// @THROWS only `AppError.LogFriendlyGithubAppError` upon failed deletion.
export const removeReposFromInstallation =
  async ( installationId: number
        , repoIds: number[]
        , errorName: string
      ): Promise<void> => {

  try {

    const installationUpdateResult = await InstallationModel.update(
      { installationId },
      { $pull: { "repoIds": { $in: repoIds } } }
    ).exec();

    if ( installationUpdateResult.ok !== 1
          || installationUpdateResult.n !== 1
          || installationUpdateResult.nModified !== 1
    ) {

      throw { updateQueryFailed: true
            , ok: installationUpdateResult.ok
            , n: installationUpdateResult.n
            , nModified: installationUpdateResult.nModified
            }
    }

  } catch (err) {

    const removeReposLoggableError: AppError.LogFriendlyGithubAppError = {
      name: errorName,
      isSevere: false,
      data: err,
      installationId,
      stack: AppError.getStack(),
    };

    throw removeReposLoggableError;
  }

}


export const getInstalledRepoMap = async (repoIdList: number[]): Promise<{ [repoId: string]: true | undefined }> => {

  const findInstallations = await InstallationModel.find(
    { repoIds: { $in: repoIdList } },
    { repoIds: true }
  ).exec();

  const result: { [repoId: string]: true | undefined } = { };

  for (let installation of findInstallations) {
    for (let repoId of installation.toObject().repoIds) {
      result[repoId] = true;
    }
  }

  return result;
}
