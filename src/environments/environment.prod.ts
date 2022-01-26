export const environment = {
  production: true,
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
