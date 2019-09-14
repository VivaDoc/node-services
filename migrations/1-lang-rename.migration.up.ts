/// We've changed the names of languages.

import * as config from "../src/api/config";

const mongoose = require("mongoose");
import * as MongoHelpers from "../src/mongo-helpers";
require("../src/models/loader");
MongoHelpers.connectMongoose(mongoose, config.mongoDbUri);

import * as CommitReview from "../src/models/CommitReview"
const CommitReviewModel = mongoose.model('CommitReview');


const runMigration = async () => {

  const allCommitReviews: CommitReview.CommitReview[] = await CommitReviewModel.find({}).exec();


  for ( let commitReview of allCommitReviews ) {
    for ( let fileReview of commitReview.fileReviews ) {

      const beforeMigrationCurrentLanguage: string = fileReview.currentLanguage;

      if ( beforeMigrationCurrentLanguage === "Javascript" ) {
        console.log("Renaming current language to JavaScript");
        fileReview.currentLanguage = "JavaScript";
      } else if ( beforeMigrationCurrentLanguage === "Typescript") {
        console.log("Renaming current language to TypeScript");
        fileReview.currentLanguage = "TypeScript";
      } else if ( beforeMigrationCurrentLanguage === "CPlusPlus") {
        console.log("Renaming current language to C++");
        fileReview.currentLanguage = "C++";
      }

      if ( fileReview.fileReviewType !== "renamed-file" ) {
        continue;
      }

      const beforeMigrationPreviousLanguage: string = fileReview.previousLanguage;

      if ( beforeMigrationPreviousLanguage === "Javascript" ) {
        console.log("Renaming previous language to JavaScript");
        fileReview.previousLanguage = "JavaScript";
      } else if ( beforeMigrationPreviousLanguage === "Typescript") {
        console.log("Renaming previous language to TypeScript");
        fileReview.previousLanguage = "TypeScript";
      } else if ( beforeMigrationPreviousLanguage === "CPlusPlus") {
        console.log("Renaming previous language to C++");
        fileReview.previousLanguage = "C++";
      }

    }

    try {
      const updatedCommitReview = new CommitReviewModel(commitReview);
      await updatedCommitReview.save();
    } catch (err) {
      console.log(err);
    }

  }

  console.log("complete");
  return 1;
}


runMigration();
