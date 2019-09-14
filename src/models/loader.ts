/* Require this file to load all mongoose models. */

// NOTE: We have to load these and order of these requires matters, LogError must be first.
// @VD amilner42 block
require("./LogError");
require("./CommitReview");
require("./PullRequestReview");
require("./Installation");
require("./User");
// @VD end-block
