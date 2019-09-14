/* Module for the TagOwnerGroups type. */

export interface TagOwnerGroups {
  tagId: string;
  groups: Group[];
}

export type Group = string[];


export const parseGroupsFromString = (ownerGroupsAsString: string): Group[] => {

  return ownerGroupsAsString.split(",").map((groupAsString) => {
    return groupAsString.split("|");
  });
}
