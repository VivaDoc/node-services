/* Module for the UserAssessment type. */

import * as R from "ramda";


export interface UserAssessment  {
  username: string;
  tagId: string;
  assessmentType: AssessmentType;
}


export type AssessmentType = "approved" | "rejected";


export const getUserAssessmentsForTagId = (userAssessments: UserAssessment[], tagId: string): UserAssessment[] => {

  return R.filter((userAssessment) => {
    return userAssessment.tagId === tagId;
  }, userAssessments);
}


export const newTagId = R.curry((tagId: string, userAssessment: UserAssessment): UserAssessment => {
  const userAssessmentCopy = R.clone(userAssessment);
  userAssessmentCopy.tagId = tagId;

  return userAssessmentCopy;
});
