// Module for handling the generation of reviews.

import R from "ramda"
import mongoose from "mongoose"

import * as Lang from "./languages/"
import * as LangUtil from "./languages/util"
import * as Diff from "./diff"
import * as Tag from "./tag"
import * as T from "../types"
import * as TOG from "../tag-owner-group"


/** EXTERNAL */

/** COMPOSITION TYPES */

export interface HasTags {
  tags: Tag.VdTag[];
}

export interface HasReviews {
  reviews: Review[];
}

/**
 * The review for every file paired with all metadata related to the user.
 *
 * Currently all tags are updated to be of type `TagWithMetadata`.
 *
 * @VD amilner42 block
 */
export type FileReviewWithMetadata =
  T.ReplaceTypeIfExsits<
    T.ReplaceTypeIfExsits<FileReview, "tags", TagWithMetadata[]>,
    "reviews",
    ReviewWithMetadata[]
  >
// @VD end-block

/** The review needed for every file. */
export type FileReview = NewFileReview | DeletedFileReview | RenamedFileReview | ModifiedFileReview

export interface BaseFileReview {
  fileReviewType: "new-file" | "deleted-file" | "renamed-file" | "modified-file";
}

/** A new file review contains a list of tags because all tags in a new file are entirely new. */
export type NewFileReview = BaseFileReview & HasTags & Diff.HasCurrentFilePath & Lang.HasCurrentLanguage & {
  fileReviewType: "new-file";
}

/** A deleted file review contains a list of tags because all tags in a deleted file are entirely deleted. */
export type DeletedFileReview = BaseFileReview & HasTags & Diff.HasCurrentFilePath & Lang.HasCurrentLanguage & {
  fileReviewType: "deleted-file";
}

/** A renamed file `HasReviews` to specify exactly what needs review due to what changes. */
export type RenamedFileReview =
  BaseFileReview
  & Diff.HasPreviousFilePath
  & Diff.HasCurrentFilePath
  & HasReviews
  & Lang.HasCurrentLanguage
  & Lang.HasPreviousLanguage
  & {
  fileReviewType: "renamed-file";
}

/** A modified file `HasReviews` to specify exactly what needs review due to what changes. */
export type ModifiedFileReview =
  BaseFileReview
  & Diff.HasCurrentFilePath
  & HasReviews
  & Lang.HasCurrentLanguage
  & {
  fileReviewType: "modified-file";
}

// A review indicates that a certain `VdTag` must be reviewed.
export type Review = ReviewNewTag | ReviewDeletedTag | ReviewModifiedTag

// A tag can be new, deleted, or modified in some way.
export type ReviewType = "new" | "deleted" | "modified"

// All Reviews should have these properties.
export type BaseReview = Diff.HasAlteredLines & {
  reviewType: ReviewType;
  tag: Tag.VdTag;
}

/** A `ReviewNew` is pointing to a newly created tag.

  The tag annotation would be a green line in the git diff.

  The `tag` will be from the current file, and so have current line numbers.
  */
export type ReviewNewTag = BaseReview & {
  reviewType: "new";
}

/** A `ReviewDeleted` is pointing to a deleted tag.

  The tag annotation would be a red line in the git diff.

  The `tag` will be from the deleted file, and so have previous line numbers. Due to this, the field
  `currentFileStartLineNumber` is present to indicate what the first line number (whether it be added/removed/neutral)
  of the previous tag would be in the new file.
 */
export type ReviewDeletedTag = BaseReview & {
  reviewType: "deleted";
  currentFileStartLineNumber: number;
}

/** A `ReviewModified` is pointing to a modified tag.

  The tag annotation would not be red or green in the git diff, only the code/comment changed.

  The `tag` will be from the current file, and so have current line numbers.
*/
export type ReviewModifiedTag = BaseReview & {
  reviewType: "modified";
}


// Get reviews from all the parsed information
export const getReviews = (diffWCAT: Tag.FileDiffWithCodeAndTags): FileReview => {

  switch ( diffWCAT.diffType ) {

    case "new":
      // Simple case, all tags are new tags
      return {
        fileReviewType: "new-file",
        currentFilePath: diffWCAT.currentFilePath,
        tags: diffWCAT.currentFileTags,
        currentLanguage: diffWCAT.currentLanguage
      }

    case "deleted":
      // Simple case, all tags are deleted tags
      return {
        fileReviewType: "deleted-file",
        currentFilePath: diffWCAT.currentFilePath,
        tags: diffWCAT.currentFileTags,
        currentLanguage: diffWCAT.currentLanguage
      }

    case "renamed":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "renamed-file",
        currentFilePath: diffWCAT.currentFilePath,
        previousFilePath: diffWCAT.previousFilePath,
        currentLanguage: diffWCAT.currentLanguage,
        previousLanguage: diffWCAT.previousLanguage,
        reviews: calculateReviewsFromModification(
          diffWCAT.previousFileTags,
          diffWCAT.currentFileTags,
          diffWCAT.alteredLines,
          diffWCAT.currentFilePath
        )
      }

    case "modified":
      // Tricky case, need to calculate reviews from modification
      return {
        fileReviewType: "modified-file",
        currentFilePath: diffWCAT.currentFilePath,
        currentLanguage: diffWCAT.currentLanguage,
        reviews: calculateReviewsFromModification(
          diffWCAT.previousFileTags,
          diffWCAT.currentFileTags,
          diffWCAT.alteredLines,
          diffWCAT.currentFilePath
        )
      }

  } // end switch
}

export const fileReviewNeedsApproval = (fileReview: FileReview): boolean => {
  switch (fileReview.fileReviewType) {

    case "new-file":
      return fileReview.tags.length > 0

    case "deleted-file":
      return fileReview.tags.length > 0

    case "modified-file":
    case "renamed-file":
      return fileReview.reviews.length > 0
  }
}

export const initFileReviewMetadata = (fileReview: FileReview): FileReviewWithMetadata => {
  switch (fileReview.fileReviewType) {
    case "renamed-file":
    case "modified-file":
      return {
        ...fileReview,
        reviews: R.map((review) => {
          return { ...review, tag: addMetadataToTag(review.tag) }
        }, fileReview.reviews)
      }

    case "deleted-file":
    case "new-file":
      return {
        ...fileReview,
        tags: R.map((tag => addMetadataToTag(tag)), fileReview.tags)
      }
  }
}


export const getTagsOwnerGroups =
  (fileReviewsWithMetadata: FileReviewWithMetadata[]): TOG.TagOwnerGroups[] => {

  return R.reduce<FileReviewWithMetadata, TOG.TagOwnerGroups[]>((allTagsOwnerGroups, fileReview) => {
    return R.reduce<TagWithMetadata, TOG.TagOwnerGroups[]>((fileReviewTagsOwnerGroups, tag) => {

      return fileReviewTagsOwnerGroups.concat(
        [ { groups: tag.ownerGroups, tagId: tag.tagId.toString() } ]
      );

    }, allTagsOwnerGroups, getTagsWithMetadata(fileReview));
  }, [], fileReviewsWithMetadata);
}


// Filters file reviews, drops the review entirely if it is left with 0 tags/reviews.
// Does not modify the original fileReview, instead creates a copy and returns that.
export const filterFileReviewTags =
  ( tagFilter: (tagWithMetadata: TagWithMetadata) => boolean
  , fileReviews: FileReviewWithMetadata[]
  ): FileReviewWithMetadata[] => {

  let filteredFileReviews: FileReviewWithMetadata[] = [];

  for (let fileReview of fileReviews) {

    switch (fileReview.fileReviewType) {

      case "deleted-file":
      case "new-file":
        const filteredTags = R.filter(tagFilter, fileReview.tags);

        if (filteredTags.length > 0) {
          const fileReviewCopy = R.clone(fileReview);
          fileReviewCopy.tags = filteredTags;
          filteredFileReviews.push(fileReviewCopy);
        }

        continue;

      case "modified-file":
      case "renamed-file":
        const filteredReviews = R.filter(
          (review) => { return tagFilter(review.tag); },
          fileReview.reviews
        );

        if (filteredReviews.length > 0) {
          const fileReviewCopy = R.clone(fileReview);
          fileReviewCopy.reviews = filteredReviews;
          filteredFileReviews.push(fileReviewCopy);
        }

        continue;
    }
  }

  return filteredFileReviews;
}

/** Calculates the reviews for some file modification given all helpful information.

  NOTE: You must provide ALL the previous file tags and ALL the current file tags.

  This is the core functionality of the app.

  @VD amilner42 block
 */
export const calculateReviewsFromModification =
    ( allPreviousTags: Tag.VdTag[]
    , allCurrentTags: Tag.VdTag[]
    , alteredLines: Diff.AlteredLine[]
    , filePath: string
    ): Review[] => {

  if (allPreviousTags.length === 0 && allCurrentTags.length === 0) { return [] }

  const tagMap: TagMap = getTagMapBetweenAllTags(allPreviousTags, allCurrentTags, alteredLines, filePath)
  return reviewsFromTagMapAndAlteredLines(tagMap, alteredLines)
}
// @VD end-block


/** A map between all old and all new tags across a diff.

  @VD amilner42 block
*/
export type TagMap = {
  deletedTags: Tag.VdTag[],
  newTags: Tag.VdTag[],
  tagPairs: R.KeyValuePair<Tag.VdTag, Tag.VdTag>[]
}
// @VD end-block


/** Creates a map between the old tags and the new tags given the line diffs.

  NOTE: You must provide ALL the previous file tags and ALL the current file tags. If you don't
        have all the tags consider using the `getTagLinksBetweenSomeTags` function.

  NOTE: The provided tags must be provided in-order for the algorithm to produce correct results.

  NOTE: The alteredLines should be passed in-order.

  TODO BUG: Minor, but altered line isn't checked to be a comment. Is there any reason to have this function? Can we
            just wire everything through `getTagLinksBetweenSomeTags`. Seems more robust.

  @VD amilner42 block
*/
export const getTagMapBetweenAllTags =
  ( allPreviousTags: Tag.VdTag[]
  , allCurrentTags: Tag.VdTag[]
  , alteredLines: Diff.AlteredLine[]
  , filePath: string
  ): TagMap => {

  // Initialize tagMap to be entirely `null` for all entries.
  const partialTagMap: TagMapPartial = {
    oldTagsToNewTags: R.repeat(undefined, allPreviousTags.length),
    newTagsToOldTags: R.repeat(undefined, allCurrentTags.length)
  }

  for (let alteredLine of alteredLines) {

    const matchTag = LangUtil.matchSingleVdTagAnnotation(
      alteredLine.content,
      filePath,
      `${alteredLine.currentLineNumber}`
    );

    switch (matchTag.branchTag) {

      // No VD annotation or just matched an end-block tag
      case "case-1":
      case "case-2":
        continue;

      // Matched a tag
      case "case-3":

        switch (alteredLine.type) {

          case "added":
            const indexOfNewTag = Tag.getTagIndexFromAnnotationLine(allCurrentTags, alteredLine.currentLineNumber)

            // TODO When would this happen
            if (indexOfNewTag === null) {
              throw new Error("TODO")
            }

            // Set that tag to be a new tag in the `partialTagMap`
            partialTagMap.newTagsToOldTags[indexOfNewTag] = null;
            continue;

          case "deleted":
            const indexOfDeletedTag = Tag.getTagIndexFromAnnotationLine(allPreviousTags, alteredLine.previousLineNumber)

            // TODO When would this happen
            if (indexOfDeletedTag === null) {
              throw new Error("TODO")
            }

            // Set that tag to be a deleted tag in the `partialTagMap`
            partialTagMap.oldTagsToNewTags[indexOfDeletedTag] = null;
            continue;

        } // end switch

    } // end switch
  } // end for

  return tagMapFromPartial(partialTagMap, allPreviousTags, allCurrentTags)
}
// @VD end-block


/** Detect links (if any) between some previous tags and some new tags.

  NOTE: This does not require you pass all the tags in the file. Although if you do have all the
        tags you should use `getTagMapBetweenAllTags`.

  NOTE: This does not require the tags be passed in order.

  NOTE: The alteredLines should be passed in-order.

  RETURNS: An array of length `somePreviousTags.length` with either null representing no link to
          any of the `someCurrentTags` or a number representing the index of the matching tag in
          `someCurrentTags`.

  @VD amilner42 block
*/
export const getTagLinksBetweenSomeTags =
  <BaseTag extends Tag.VdTag>
  ( somePreviousTags: BaseTag[]
  , someCurrentTags: BaseTag[]
  , alteredLines: Diff.AlteredLine[]
  ): (null | number)[] => {

  const result: (null | number)[] = [];

  for (let previousTag of somePreviousTags) {
    result.push(getTagLink(previousTag, someCurrentTags, alteredLines));
  }

  return result;
}
// @VD end-block


// An ID for a reference
export type TagWithMetadata = Tag.VdTag & { tagId: mongoose.Types.ObjectId; }
export type ReviewWithMetadata = T.ReplaceType<Review, "tag", TagWithMetadata>


export const getTags = (fileReview: FileReview): Tag.VdTag[] => {

  switch (fileReview.fileReviewType) {

    case "deleted-file":
    case "new-file":
      return fileReview.tags;

    case "modified-file":
    case "renamed-file":
      return R.map((review) => { return review.tag }, fileReview.reviews)

  }
}


export const getTagsWithMetadata = (fileReview: FileReviewWithMetadata): TagWithMetadata[] => {

  switch (fileReview.fileReviewType) {

    case "deleted-file":
    case "new-file":
      return fileReview.tags;

    case "modified-file":
    case "renamed-file":
      return R.map((review) => { return review.tag }, fileReview.reviews)

  }
}

export const getExistantTagsWithMetadata = (fileReview: FileReviewWithMetadata): TagWithMetadata[] => {

  const allTags = getTagsWithExistanceStatus(fileReview);
  const existantTags = R.filter(({ existance, tagWithMetadata}) => {
    return existance === "present";
  }, allTags);

  return R.map((({ tagWithMetadata }) => tagWithMetadata), existantTags);

}


type TagExistance = "present" | "removed";


type TagWithExistanceStatus = {
  existance: TagExistance;
  tagWithMetadata: TagWithMetadata;
}


const createTagWithExistance = R.curry(
  (existance: TagExistance, tagWithMetadata: TagWithMetadata): TagWithExistanceStatus => {
    return { existance, tagWithMetadata };
  }
);


export const getTagsWithExistanceStatus =
  ( fileReview: FileReviewWithMetadata ): TagWithExistanceStatus[] => {

  switch ( fileReview.fileReviewType ) {

    case "deleted-file":
      return fileReview.tags.map(createTagWithExistance("removed"));

    case "new-file":
      return fileReview.tags.map(createTagWithExistance("present"));

    case "renamed-file":
    case "modified-file":
      return fileReview.reviews.map((review) => {
        switch ( review.reviewType ) {

          case "new":
          case "modified":
            return createTagWithExistance("present", review.tag);

          case "deleted":
            return createTagWithExistance("removed", review.tag);
        }
      })
  }
}


export const matchesTagId = R.curry(
  (tagId: string, tagWithMetadata: TagWithMetadata) => {
    return tagWithMetadata.tagId.equals(tagId);
  }
)


export interface CommitReviewTagsPerFile {
  approved: string[];
  rejected: string[];
  all: TagWithMetadata[];
}


// Assumes tag is in `CommitReviewTagsPerFile.all`.
export const getTagApprovalState =
  ( tagId: string
  , commitReviewTagsPerFile: CommitReviewTagsPerFile
  ): "approved" | "rejected" | "unresolved" => {

  if (R.contains(tagId, commitReviewTagsPerFile.approved)) {
    return "approved";
  }

  if (R.contains(tagId, commitReviewTagsPerFile.rejected)) {
    return "rejected";
  }

  return "unresolved";
}


export const getTagsPerFileHashMap =
  ( approvedTags: string[]
  , rejectedTags: string[]
  , fileReviews: FileReviewWithMetadata[]
) : { [fileName: string]: CommitReviewTagsPerFile | undefined } => {

  const result: { [fileName: string]: CommitReviewTagsPerFile } = { };

  for (let fileReview of fileReviews) {

    const tagsWithMetadata = getTagsWithMetadata(fileReview);

    // Get rejected tags in this file review.
    const rejected: string[] = R.filter((tagId) => {
      return R.any(matchesTagId(tagId), tagsWithMetadata);
    }, rejectedTags)

    // Get approved tags in this file review
    const approved: string[] = R.filter((tagId) => {
      return R.any(matchesTagId(tagId), tagsWithMetadata);
    }, approvedTags);

    result[fileReview.currentFilePath] = {
      all: tagsWithMetadata,
      rejected,
      approved
    }

  }

  return result;
}


/** Checking if an `alteredLine` altered a new or deleted tag.

Because we don't have the tag both before and after, this could provide more alteredLines than actually relevant for
certain git diffs (for instance, if the git diff puts 3 functions as deleted and then one new line for the final
closing paren of your function, it will include all 3 of those removed functions even though they are unrelated because
they were before the final closing paren).

@VD amilner42 block
*/
export const alteredLineInTagOwnership = R.curry(
  (tag: Tag.VdTag, tagType: "deleted" | "new", alteredLine: Diff.AlteredLine): boolean => {

    switch (tagType) {

      case "new":
        return lineNumberInTagOwnership(tag, alteredLine.currentLineNumber)

      case "deleted":
        return lineNumberInTagOwnership(tag, alteredLine.previousLineNumber)
    }
  }
)
// @VD end-block


/** Checking if an `alteredLine` altered a modified tag.

Because we have both the tag before and after it was modified we can be 100% sure whether an `alteredLine` altered
the tag by checking deleted lines against the previous tag and new lines against the current tag.

@VD amilner42 block
*/
export const alteredLineInTagPairOwnership = R.curry(
  ([previousTag, currentTag]: R.KeyValuePair<Tag.VdTag, Tag.VdTag>, alteredLine: Diff.AlteredLine): boolean => {

    switch (alteredLine.type) {

      case "added":
        return lineNumberInTagOwnership(currentTag, alteredLine.currentLineNumber)

      case "deleted":
        return lineNumberInTagOwnership(previousTag, alteredLine.previousLineNumber)
    }
  }
)
// @VD end-block


/** INTERNAL */


/** Used while creating a tag map.

  - null in `oldTagsToNewTags` means that the tag was deleted.
  - null in `newTagsToOldTags` means the tag is new.
  - undefined means the tag wasn't deleted/added. It is partial because this data structure doesn't keep which tags map
  to each other, although it is simple to get that from this data structure by just zipping up the undefined in each
  list.

  NOTE: A `TagMapPartial` should have the same amount of `undefined` in each list.

  @VD amilner42 block
*/
type TagMapPartial = {
  oldTagsToNewTags: (undefined | null)[];
  newTagsToOldTags: (undefined | null)[];
}
// @VD end-block

const addMetadataToTag = (tag: Tag.VdTag): TagWithMetadata => {
  return { ...tag, tagId: mongoose.Types.ObjectId() }
}


/** Converts a `PartialTagMap` to a full `TagMap`

  Will throw an error if the `partialTagMap` is invalid.

  @VD amilner42 block
*/
const tagMapFromPartial =
    ( partialTagMap: TagMapPartial
    , allPreviousTags: Tag.VdTag[]
    , allCurrentTags: Tag.VdTag[]
    ): TagMap => {

  const tagMap: TagMap = {
    deletedTags: [],
    newTags: [],
    tagPairs: []
  }

  const countUndefined = (list: any[]) => {
    return R.filter(R.equals(undefined), list).length
  }

  // Invalid partial tag map
  if(countUndefined(partialTagMap.newTagsToOldTags) !== countUndefined(partialTagMap.oldTagsToNewTags)) {
    throw new Error("TODO")
  }

  // Add deleted tags to tag map
  for (let i = 0; i < allPreviousTags.length; i++) {
    if (partialTagMap.oldTagsToNewTags[i] === null) {
      tagMap.deletedTags.push(allPreviousTags[i])
    }
  }

  // Add new tags to tag map
  for (let i = 0; i < allCurrentTags.length; i++) {
    if (partialTagMap.newTagsToOldTags[i] === null) {
      tagMap.newTags.push(allCurrentTags[i])
    }
  }

  const getTagsThatPair = (partialTagMapPointers: (null | undefined)[], tags: Tag.VdTag[]): Tag.VdTag[] => {
    const zipped = R.zip(partialTagMapPointers, tags)
    const filterZipped = R.filter(([x, y]) => {
      return x === undefined
    }, zipped)
    return R.map(([x, y]) => y, filterZipped)
  }

  tagMap.tagPairs = R.zip(
    getTagsThatPair(partialTagMap.oldTagsToNewTags, allPreviousTags),
    getTagsThatPair(partialTagMap.newTagsToOldTags, allCurrentTags)
  )

  return tagMap
}
// @VD end-block


const calculateCurrentFileStartLineNumberFromPreviousFileTag =
  ( tag: Tag.VdTag
  , alteredLines: Diff.AlteredLine[]
  ): number => {

  const firstAl = alteredLines[0];
  const firstAlCurrentLineNumber = firstAl.currentLineNumber;
  const firstAlPreviousLineNumber = firstAl.previousLineNumber;

  const tagPreviousStartLineNumber = tag.startLine;

  return firstAlCurrentLineNumber - (firstAlPreviousLineNumber - tagPreviousStartLineNumber);
}


/** TODO DOC */
const reviewsFromTagMapAndAlteredLines = (tagMap: TagMap, alteredLines: Diff.AlteredLine[]): Review[] => {

  const reviewDeletedTags: ReviewDeletedTag[] = R.map<Tag.VdTag, ReviewDeletedTag>((tag) => {

    const relevantAlteredLines = R.filter(alteredLineInTagOwnership(tag, "deleted"), alteredLines);

    return {
      reviewType: "deleted",
      tag,
      alteredLines: relevantAlteredLines,
      currentFileStartLineNumber:  calculateCurrentFileStartLineNumberFromPreviousFileTag(tag, relevantAlteredLines)
    }
  }, tagMap.deletedTags)

  const reviewNewTags: ReviewNewTag[] = R.map<Tag.VdTag, ReviewNewTag>((tag) => {
    return {
      reviewType: "new",
      tag,
      alteredLines: R.filter(alteredLineInTagOwnership(tag, "new"), alteredLines)
    }
  }, tagMap.newTags)

  const tagPairsMaybeNeedingReview: ReviewModifiedTag[] = R.map((tagPair) => {
    return {
      reviewType: "modified",
      tag: tagPair[1],
      alteredLines: R.filter(alteredLineInTagPairOwnership(tagPair), alteredLines)
    } as ReviewModifiedTag
  }, tagMap.tagPairs)

  // Only keep tag pairs that have actually been modified
  const reviewModifiedTags = R.filter((reviewModifiedTag) => {
    return reviewModifiedTag.alteredLines.length > 0
  }, tagPairsMaybeNeedingReview)

  return ([] as Review[]).concat(reviewDeletedTags, reviewNewTags, reviewModifiedTags)
}


const lineNumberInTagOwnership = (tag: Tag.VdTag, lineNumber: number) => {
  return (lineNumber >= tag.startLine) && (lineNumber <= tag.endLine)
}


const getTagLink =
  <BaseTag extends Tag.VdTag>
  ( previousTag: BaseTag
  , someCurrentTags: BaseTag[]
  , alteredLines: Diff.AlteredLine[]
  ) : null | number => {


  const previousTagAnnotationLine = previousTag.tagAnnotationLine;
  const newTagAnnotationLine = getNewTagAnnotationLine(previousTagAnnotationLine, alteredLines);

  // Was deleted.
  if (newTagAnnotationLine === null) {
    return null;
  }

  // Wasn't deleted, check for possible matches.
  for (let tagIndex = 0; tagIndex < someCurrentTags.length; tagIndex++) {

    if (someCurrentTags[tagIndex].tagAnnotationLine === newTagAnnotationLine) {
      return tagIndex;
    }

  }

  return null;
}


const getNewTagAnnotationLine =
  ( previousTagAnnotationLineNumber: number
  , alteredLines: Diff.AlteredLine[]
  ): number | null => {

  let newTagAnnotationLineNumber = previousTagAnnotationLineNumber;

  for (let alteredLine of alteredLines) {

    if (alteredLine.previousLineNumber < previousTagAnnotationLineNumber) {

      switch (alteredLine.type) {

        case "added":
          newTagAnnotationLineNumber++;
          continue;

        case "deleted":
          newTagAnnotationLineNumber--;
          continue;

      }
    }

    if (alteredLine.previousLineNumber === previousTagAnnotationLineNumber) {

      switch (alteredLine.type) {

        // Check is this added before or after?
        case "added":
          newTagAnnotationLineNumber++;
          continue;

        // Tag deleted.
        case "deleted":
          return null;
      }
    }

    if (alteredLine.previousLineNumber > previousTagAnnotationLineNumber) {
      break;
    }

  }

  return newTagAnnotationLineNumber;
}
