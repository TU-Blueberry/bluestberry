// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  aesKey: {
    "key_ops": [
      "decrypt",
      "encrypt"
    ],
    "ext": true,
    "kty": "oct",
    "k": "K-OmGbdpu9cdB-OtlFUt3lFpeLRqWsPNyIKqw3MrvN4",
    "alg": "A256GCM"
  },
  iv: new Uint8Array([ 138, 34, 38, 4, 144, 89, 15, 5, 155, 11, 244, 21])
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
