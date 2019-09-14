/** All config for the application.

Currently this module works through environment variables. It's better to use flags because you
can avoid state-related bugs when spinning up new instances but it's not urgent to switch.

  Env variables to set:

  [ always ] env.APP_ID
  [ always ] env.WEBHOOK_SECRET
  [ always ] env.VD_WEB_CLIENT_ORIGIN
  [ always ] env.VD_MONGODB_URI
  [ always ] env.VD_COMMIT_STATUS_NAME

  [ dev ] env.LOG_LEVEL
  [ dev ] env.WEBHOOK_PROXY_URL

  [ prod ] env.NODE_ENV = 'production'
  [ prod ] env.PRIVATE_KEY_PATH

  @VD amilner42 file
*/


const env = process.env;
const isProduction = env.NODE_ENV === 'production';
const isDev = !isProduction;

let webClientOrigin: string;
let mongoDbUri: string;
let commitStatusName: string;


// Variables required in both dev/prod.
if ( env.APP_ID === undefined
      || env.WEBHOOK_SECRET === undefined
      || env.VD_MONGODB_URI === undefined
      || env.VD_WEB_CLIENT_ORIGIN === undefined
      || env.VD_COMMIT_STATUS_NAME === undefined ) {
  throw { message: "You have undefined env variables required in both dev/prod" };
}
webClientOrigin = env.VD_WEB_CLIENT_ORIGIN;
mongoDbUri = env.VD_MONGODB_URI;
commitStatusName = env.VD_COMMIT_STATUS_NAME;


// Variables required by probot only in dev
if ( isDev ) {

  // Use `trace` to get verbose logging or `info` to show less. Usually on 'debug' in dev.
  // Use webhook_proxy_url for the smee proxy to localhost.
  if ( env.LOG_LEVEL === undefined || env.WEBHOOK_PROXY_URL === undefined ) {
    throw { message: "You have undefined env variables required in dev" };
  }
}


// Variables required only in prod.
if ( isProduction ) {

  if ( env.PRIVATE_KEY_PATH === undefined ) {
    throw { message: "You have undefined production environement variables." };
  }

}


export const config = {
  isProduction,
  webClientOrigin,
  mongoDbUri,
  commitStatusName
}
