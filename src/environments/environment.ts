// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    env_name: "STAGING",
    app_version: "0.0.80",
    // API_SERVER: "http://localhost:443/api/data",
    // WS_SERVER: "http://localhost:443",
    API_SERVER: "https://pei-web-server-staging.onrender.com/api/data",
    WS_SERVER: "https://pei-web-server-staging.onrender.com",
    AUTH_DOMAIN: "sv-pei.us.auth0.com",
    AUTH_CLIENT_ID: "AbStwokiYZyLt65e45APDN6oGV92kj7K",
    AUTH_REDIRECT_URI: window.location.origin,
    AUTH_AUDIENCE: "",
};
  