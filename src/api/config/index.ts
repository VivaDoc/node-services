/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

 Env variables to set:

 [ prod ] env.NODE_ENV = 'production'

 [ always ] env.VD_GITHUB_CLIENT_SECRET
 [ always ] env.VD_GITHUB_CLIENT_ID
 [ always ] env.PRIVATE_KEY_PATH
 [ always ] env.APP_ID
 [ always ] env.VD_WEB_CLIENT_ORIGIN
 [ always ] env.VD_MONGODB_URI
 [ always ] env.VD_COOKIE_SECRET
 [ always ] env.VD_PORT
 [ always ] env.VD_COMMIT_STATUS_NAME

 @VD amilner42 file
*/

const env = process.env;
export const isProduction = env.NODE_ENV === 'production';


let githubClientSecret: string;
let githubClientId: string;
let githubAppCertPath: string;
let githubAppId: string;
let webClientOrigin : string;
let mongoDbUri : string;
let sessionSecret : string;
let port : number;
let commitStatusName: string;


// Check always required variables.
if ( env.VD_GITHUB_CLIENT_SECRET === undefined
      || env.VD_GITHUB_CLIENT_ID === undefined
      || env.PRIVATE_KEY_PATH === undefined
      || env.APP_ID === undefined
      || env.VD_WEB_CLIENT_ORIGIN === undefined
      || env.VD_MONGODB_URI === undefined
      || env.VD_COOKIE_SECRET === undefined
      || env.VD_PORT === undefined
      || env.VD_COMMIT_STATUS_NAME === undefined ) {
  throw { message: "You have undefined environment variables that are required in dev/prod" };
}

githubClientSecret = env.VD_GITHUB_CLIENT_SECRET;
githubClientId = env.VD_GITHUB_CLIENT_ID;
githubAppCertPath = env.PRIVATE_KEY_PATH;
githubAppId = env.APP_ID;
webClientOrigin = env.VD_WEB_CLIENT_ORIGIN;
mongoDbUri = env.VD_MONGODB_URI;
sessionSecret = env.VD_COOKIE_SECRET;
commitStatusName = env.VD_COMMIT_STATUS_NAME;


const portAsInt = parseInt(env.VD_PORT, 10);
if (portAsInt === NaN) {
  throw  { message: `Port must be an int: ${env.VD_PORT}` };
}
port = portAsInt;


const githubCallbackUrl = `${webClientOrigin}/oauth_redirect`;


export {
  githubClientSecret,
  githubClientId,
  githubAppCertPath,
  githubAppId,
  webClientOrigin,
  mongoDbUri,
  port,
  sessionSecret,
  githubCallbackUrl,
  commitStatusName
};
